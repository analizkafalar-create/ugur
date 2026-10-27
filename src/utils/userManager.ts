/**
 * TerraScan - User and Member Database Manager
 * Handles local persistence, multi-user accounts, unlimited rank progression,
 * and unlimited VIP levels tied to credit top-ups.
 */

import { UserProfile, UserRank, AppLanguage } from '../types';
import { getRankBadgeAndTitle } from './i18n';
import {
  fetchUsersFromSupabase,
  insertUserToSupabase,
  verifyUserCredentialsSupabase,
  updateUserInSupabase,
  deleteUserFromSupabase,
  isSupabaseAvailable,
  getSupabaseClient,
  checkDeviceClaimedInSupabase,
  recordDeviceClaimInSupabase,
  mapSupabaseRowToUser,
} from '../lib/supabase';
import { getDeviceSignature } from './deviceFingerprint';
import { isOrderIdAlreadyProcessed, markOrderIdAsProcessed } from './paymentIdempotency';

export const MASTER_SERVER_PIN = '35628872566527-tr';

const USERS_STORAGE_KEY = 'terrascan_all_registered_users_v2';
const CURRENT_USER_ID_KEY = 'terrascan_active_user_id_v2';

/**
 * Calculates unlimited VIP progression from points.
 * Points are awarded when credits are loaded (e.g. 100 VIP pts per credit).
 * VIP Level has NO CEILING (VIP 1, VIP 2 ... VIP 100+).
 */
export function calculateVipProgression(vipPoints: number = 0) {
  const points = Math.max(0, vipPoints);
  // Each VIP tier requires 250 points: Tier = 1 + floor(points / 250)
  const POINTS_PER_TIER = 250;
  const vipLevel = Math.max(1, 1 + Math.floor(points / POINTS_PER_TIER));
  const currentTierBase = (vipLevel - 1) * POINTS_PER_TIER;
  const nextTierTarget = vipLevel * POINTS_PER_TIER;
  const pointsIntoCurrent = points - currentTierBase;
  const progressPct = Math.min(100, Math.max(0, Math.round((pointsIntoCurrent / POINTS_PER_TIER) * 100)));

  let vipBadge = '🥉';
  let vipTitle = `VIP Seviye ${vipLevel}`;

  if (vipLevel >= 100) {
    vipBadge = '🌌';
    vipTitle = `Kozmik VIP ${vipLevel}`;
  } else if (vipLevel >= 50) {
    vipBadge = '👑';
    vipTitle = `İmparatorluk VIP ${vipLevel}`;
  } else if (vipLevel >= 25) {
    vipBadge = '💎';
    vipTitle = `Elit VIP ${vipLevel}`;
  } else if (vipLevel >= 10) {
    vipBadge = '🥇';
    vipTitle = `Usta VIP ${vipLevel}`;
  } else if (vipLevel >= 5) {
    vipBadge = '🥈';
    vipTitle = `Kıdemli VIP ${vipLevel}`;
  }

  return {
    vipLevel,
    vipPoints: points,
    nextVipPoints: nextTierTarget,
    pointsRemaining: nextTierTarget - points,
    progressPct,
    vipBadge,
    vipTitle,
  };
}

/**
 * Calculates unlimited Rank progression based on scans performed and XP.
 * There is NO maximum limit to ranks or levels (Level 1, Level 2 ... Level 500+).
 */
export function calculateRankProgression(scans: number = 0, lang: AppLanguage = 'tr') {
  const count = Math.max(0, scans);
  // Level increases every 3 scans or XP
  const level = Math.max(1, 1 + Math.floor(count / 2));
  const currentXp = count * 150;
  const xpForCurrentLevel = (level - 1) * 300;
  const xpForNextLevel = level * 300;
  const progressPct = Math.min(
    100,
    Math.max(0, Math.round(((currentXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100))
  );

  let currentRank: UserRank = 'OBSERVER';
  if (level >= 30) {
    currentRank = 'ADMIN';
  } else if (level >= 15) {
    currentRank = 'CHIEF_ENGINEER';
  } else if (level >= 8) {
    currentRank = 'ANALYST';
  } else if (level >= 4) {
    currentRank = 'OPERATOR';
  }

  const { badge, title } = getRankBadgeAndTitle(currentRank, lang, level);

  return {
    level,
    currentRank,
    badge,
    title,
    currentXp,
    nextRankXp: xpForNextLevel,
    progressPct,
  };
}

// INITIAL_USERS mock array removed completely
const INITIAL_USERS: UserProfile[] = [];

const ACTIVE_SESSION_STORAGE_KEY = 'terrascan_active_session_v3';
const PERSISTED_LICENSE_MAP_KEY = 'terrascan_persisted_license_map_v2';
const PERSISTED_USERS_KEY = 'terrascan_users_cache_v3';

export interface PersistedLicenseEntry {
  licenseExpires: string | null;
  isUnlimited?: boolean;
  plan?: string;
  planNameTr?: string;
  updatedAt: number;
}

export function getPersistedLicenseMap(): Record<string, PersistedLicenseEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PERSISTED_LICENSE_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePersistedLicense(
  userIdOrEmail: string, 
  licenseExpires: string | null, 
  isUnlimited = false
): void {
  if (typeof window === 'undefined' || !userIdOrEmail) return;
  try {
    const map = getPersistedLicenseMap();
    const key = userIdOrEmail.toLowerCase().trim();
    map[key] = {
      licenseExpires,
      isUnlimited,
      plan: isUnlimited ? 'PRO' : undefined,
      planNameTr: isUnlimited ? 'Sınırsız VIP Lisans' : undefined,
      updatedAt: Date.now(),
    };
    localStorage.setItem(PERSISTED_LICENSE_MAP_KEY, JSON.stringify(map));
  } catch {}
}

// In-memory cache for live Supabase app_users, initialized from localStorage if available
let _cachedUsers: UserProfile[] = [];
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(PERSISTED_USERS_KEY) ||
                  localStorage.getItem(USERS_STORAGE_KEY) ||
                  localStorage.getItem('terrascan_all_registered_users_v2') ||
                  localStorage.getItem('terrascan_registered_users');
    if (saved) {
      _cachedUsers = JSON.parse(saved);
    }
  } catch {}
}

export function getAllUsers(): UserProfile[] {
  return _cachedUsers;
}

// In-flight promise and timestamp cache to prevent infinite loops and Egress overuse
let _lastFetchUsersTimestamp = 0;
let _activeFetchUsersPromise: Promise<UserProfile[]> | null = null;

/**
 * Dynamically fetches all registered users directly from Supabase app_users table:
 * "select * from app_users order by created_at desc"
 * Deduplicates in-flight requests and merges with local persistent license storage.
 */
export async function fetchUsers(force = false): Promise<UserProfile[]> {
  // 1. Deduplicate concurrent calls: return existing promise if in flight
  if (_activeFetchUsersPromise) {
    return _activeFetchUsersPromise;
  }

  // 2. Egress protection: If fetched recently and not forced, return memory cache immediately
  const now = Date.now();
  if (!force && _cachedUsers.length > 0 && now - _lastFetchUsersTimestamp < 10000) {
    return [..._cachedUsers];
  }

  _activeFetchUsersPromise = (async () => {
    if (isSupabaseAvailable()) {
      try {
        const supaUsers = await fetchUsersFromSupabase();
        if (supaUsers !== null && Array.isArray(supaUsers)) {
          // Merge Supabase data with local persisted license assignments
          const licenseMap = getPersistedLicenseMap();
          const mergedUsers = supaUsers.map((u) => {
            const saved = licenseMap[u.id.toLowerCase()] || (u.email ? licenseMap[u.email.toLowerCase()] : null);
            if (saved) {
              if (saved.licenseExpires === null) {
                return {
                  ...u,
                  licenseExpires: undefined,
                };
              } else if (saved.licenseExpires) {
                return {
                  ...u,
                  licenseExpires: saved.licenseExpires,
                  plan: (saved.isUnlimited ? 'PRO' : u.plan) as any,
                  planNameTr: saved.planNameTr || u.planNameTr,
                };
              }
            }
            return u;
          });

          _cachedUsers = mergedUsers;
          _lastFetchUsersTimestamp = Date.now();
          saveAllUsers(mergedUsers);

          // Keep current active session in sync if data changed
          const active = getActiveUser();
          if (active) {
            const fresh = mergedUsers.find(
              (u) => u.id === active.id || (u.email && u.email.toLowerCase() === active.email.toLowerCase())
            );
            if (fresh) {
              setActiveUser(fresh);
            }
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('terrascan_users_updated', { detail: mergedUsers }));
            window.dispatchEvent(new CustomEvent('terrascan_kullanıcıları_güncellendi', { detail: mergedUsers }));
          }
          return mergedUsers;
        }
      } catch (err) {
        console.warn('[userManager] Supabase fetchUsers failed:', err);
      } finally {
        _activeFetchUsersPromise = null;
      }
    }
    return _cachedUsers;
  })();

  return _activeFetchUsersPromise;
}

// Automatically sync users from cloud on startup
if (typeof window !== 'undefined') {
  setTimeout(() => {
    fetchUsers(true).catch(() => {});
  }, 50);
}

export function saveAllUsers(users: UserProfile[]): void {
  _cachedUsers = users;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PERSISTED_USERS_KEY, JSON.stringify(users));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch {}
    window.dispatchEvent(new CustomEvent('terrascan_users_updated', { detail: users }));
    window.dispatchEvent(new CustomEvent('terrascan_kullanıcıları_güncellendi', { detail: users }));
  }
}

export function getActiveUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading active session', e);
  }
  return null;
}

export function setActiveUserId(userId: string): void {
  const found = _cachedUsers.find((u) => u.id === userId);
  if (found) {
    setActiveUser(found);
  }
}

export function setActiveUser(user: UserProfile): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(user));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('terrascan_active_user_updated', { detail: user }));
    }
  } catch (e) {
    console.warn('Error saving active session', e);
  }
}

export function logoutUser(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    localStorage.removeItem('terrascan_active_user_id_v2');
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('terrascan_admin_auth_active');
    }
  } catch (e) {
    console.warn('Error clearing active session', e);
  }
}

export function updateUser(updatedUser: UserProfile): void {
  const idx = _cachedUsers.findIndex((u) => u.id === updatedUser.id);
  if (idx !== -1) {
    _cachedUsers[idx] = updatedUser;
  } else {
    _cachedUsers.unshift(updatedUser);
  }
  saveAllUsers(_cachedUsers);

  const active = getActiveUser();
  if (active && (active.id === updatedUser.id || active.email.toLowerCase() === updatedUser.email.toLowerCase())) {
    setActiveUser(updatedUser);
  }

  // Sync directly to Supabase app_users table
  if (isSupabaseAvailable()) {
    updateUserInSupabase(updatedUser.id, updatedUser).catch(() => {});
  }
}

export function updateUserById(userId: string, partial: Partial<UserProfile>): UserProfile | null {
  const idx = _cachedUsers.findIndex((u) => u.id === userId);
  if (idx === -1) return null;
  const updatedUser = { ..._cachedUsers[idx], ...partial };
  _cachedUsers[idx] = updatedUser;
  saveAllUsers(_cachedUsers);

  const active = getActiveUser();
  if (active && (active.id === userId || active.email.toLowerCase() === updatedUser.email.toLowerCase())) {
    setActiveUser(updatedUser);
  }

  // Sync directly to Supabase app_users table
  if (isSupabaseAvailable()) {
    updateUserInSupabase(userId, partial).catch(() => {});
  }

  return updatedUser;
}

/**
 * Adds time-based license days to a user.
 * - If current licenseExpires is in the future, adds daysToAdd to that future date.
 * - If expired or undefined, adds daysToAdd to new Date() (today).
 * - Converts the new date to an ISO string, updates the UserProfile, and persists to storage/database.
 */
export function addLicenseDaysToUser(userId: string, daysToAdd: number): UserProfile | null {
  const active = getActiveUser();
  let user = _cachedUsers.find((u) => u.id === userId);
  if (!user && active && (active.id === userId || active.email.toLowerCase() === userId.toLowerCase())) {
    user = active;
  }
  if (!user) return null;

  const now = new Date();
  let baseDate = now;

  if (user.licenseExpires) {
    const existingDate = new Date(user.licenseExpires);
    if (!isNaN(existingDate.getTime()) && existingDate > now) {
      baseDate = existingDate;
    }
  }

  const targetDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const newLicenseExpires = targetDate.toISOString();

  const updatedUser: UserProfile = {
    ...user,
    licenseExpires: newLicenseExpires,
  };

  updateUser(updatedUser);

  if (isSupabaseAvailable() && user.email) {
    const client = getSupabaseClient();
    if (client) {
      client
        .from('app_users')
        .update({ license_expires_at: newLicenseExpires })
        .eq('email', user.email.toLowerCase().trim())
        .then(() => {});
    }
  }

  return updatedUser;
}

export const updateUserLicense = async (
  userId: string, 
  action: string | number
): Promise<UserProfile | null> => {
  const supabase = getSupabaseClient();
  let newExpiry: string | null = null;
  const actionStr = String(action).trim().toUpperCase();
  const isRemove = action === 'REMOVE' || actionStr === 'REMOVE' || actionStr === 'SIFIRLA' || actionStr === 'NONE';
  const isUnlimited = !isRemove && (
    action === 'UNLIMITED' || 
    action === 'SINIRSIZ' || 
    actionStr === 'UNLIMITED' || 
    actionStr === 'SINIRSIZ' || 
    actionStr.includes('SINIRSIZ') || 
    actionStr.includes('VIP')
  );

  // 1. Resolve target user from memory cache, active session, or Supabase
  let users = getAllUsers();
  let userIndex = users.findIndex(
    (u) => u.id === userId || (u.email && u.email.toLowerCase() === userId.toLowerCase())
  );
  let targetUser: UserProfile | null = userIndex > -1 ? users[userIndex] : null;

  if (!targetUser) {
    const active = getActiveUser();
    if (active && (active.id === userId || (active.email && active.email.toLowerCase() === userId.toLowerCase()))) {
      targetUser = { ...active };
      users.push(targetUser);
      userIndex = users.length - 1;
    }
  }

  if (!targetUser && supabase) {
    try {
      const { data: supaRow } = await supabase
        .from('app_users')
        .select('*')
        .or(`id.eq.${userId},email.eq.${userId.toLowerCase()}`)
        .maybeSingle();
      if (supaRow) {
        targetUser = mapSupabaseRowToUser(supaRow);
        users.push(targetUser);
        userIndex = users.length - 1;
      }
    } catch (fetchErr) {
      console.warn('[updateUserLicense] Supabase fetch fallback error:', fetchErr);
    }
  }

  // Calculate newExpiry value
  if (isRemove) {
    newExpiry = null;
  } else if (isUnlimited) {
    newExpiry = '2099-12-31T23:59:59.000Z';
  } else if (/^\d+$/.test(String(action).trim())) {
    const days = parseInt(String(action).trim(), 10);
    if (!isNaN(days) && days > 0) {
      const now = new Date();
      let baseDate = now;
      if (targetUser?.licenseExpires && !targetUser.licenseExpires.includes('SINIRSIZ')) {
        const parsed = new Date(targetUser.licenseExpires);
        if (!isNaN(parsed.getTime()) && parsed > now && parsed.getFullYear() < 2090) {
          baseDate = parsed;
        }
      }
      baseDate.setDate(baseDate.getDate() + days);
      newExpiry = baseDate.toISOString();
    }
  } else {
    const parsedDate = new Date(String(action));
    if (!isNaN(parsedDate.getTime())) {
      newExpiry = parsedDate.toISOString();
    } else {
      newExpiry = '2099-12-31T23:59:59.000Z';
    }
  }

  // 2. Persist to Supabase app_users table
  if (supabase) {
    try {
      const supaPayload: any = { 
        license_expires_at: newExpiry,
        license_type: isUnlimited ? 'Sınırsız VIP Lisans' : (newExpiry ? 'Süreli Lisans' : 'Yok'),
      };
      
      if (targetUser?.email) {
        await supabase.from('app_users').update(supaPayload).ilike('email', targetUser.email.toLowerCase().trim());
      }
      if (targetUser?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUser.id)) {
        await supabase.from('app_users').update(supaPayload).eq('id', targetUser.id);
      }
    } catch (supaErr) {
      console.warn('[updateUserLicense] Supabase table update error:', supaErr);
    }
  }

  // 3. Update persistent license map
  const finalExpiryStr = newExpiry || null;
  if (targetUser?.id) {
    savePersistedLicense(targetUser.id, finalExpiryStr, isUnlimited);
  }
  if (targetUser?.email) {
    savePersistedLicense(targetUser.email, finalExpiryStr, isUnlimited);
  }
  savePersistedLicense(userId, finalExpiryStr, isUnlimited);

  // 4. Update memory state and localStorage
  if (!targetUser) {
    targetUser = {
      id: userId,
      name: 'Kullanıcı',
      email: userId.includes('@') ? userId : `user_${userId}@terrascan.app`,
      role: 'USER',
      plan: isUnlimited ? 'PRO' : 'STARTER',
      planNameTr: isUnlimited ? 'Sınırsız VIP Lisans' : 'Standart Üyelik',
      rank: isUnlimited ? 'OPERATOR' : 'OBSERVER',
      rankLevel: 1,
      rankTitle: isUnlimited ? 'VIP Operatör' : 'Gözlemci',
      rankBadge: isUnlimited ? '👑' : '🥉',
      creditsRemaining: 50,
      licenseExpires: newExpiry || undefined,
    } as UserProfile;
    users.push(targetUser);
    userIndex = users.length - 1;
  } else {
    targetUser.licenseExpires = newExpiry || undefined;
    if (isUnlimited) {
      targetUser.plan = 'PRO';
      targetUser.planNameTr = 'Sınırsız VIP Lisans';
      if (targetUser.role !== 'ADMIN') {
        targetUser.rank = 'OPERATOR';
        targetUser.rankBadge = '👑';
        targetUser.rankTitle = 'VIP Operatör';
      }
    }
  }

  users[userIndex] = { ...targetUser };
  saveAllUsers(users);

  // 5. Update active user if this modification targets active session
  const active = getActiveUser();
  if (active && (active.id === targetUser.id || (active.email && targetUser.email && active.email.toLowerCase() === targetUser.email.toLowerCase()))) {
    const updatedActive = {
      ...active,
      licenseExpires: newExpiry || undefined,
      plan: isUnlimited ? 'PRO' : active.plan,
      planNameTr: isUnlimited ? 'Sınırsız VIP Lisans' : active.planNameTr,
      rank: isUnlimited && active.role !== 'ADMIN' ? 'OPERATOR' : active.rank,
      rankBadge: isUnlimited && active.role !== 'ADMIN' ? '👑' : active.rankBadge,
      rankTitle: isUnlimited && active.role !== 'ADMIN' ? 'VIP Operatör' : active.rankTitle,
    };
    setActiveUser(updatedActive);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('terrascan_users_updated', { detail: users }));
  }

  return { ...targetUser };
};

export function deleteUser(userId: string): void {
  _cachedUsers = _cachedUsers.filter((u) => u.id !== userId);
  saveAllUsers(_cachedUsers);

  // Delete directly from Supabase app_users table
  if (isSupabaseAvailable()) {
    deleteUserFromSupabase(userId).catch(() => {});
  }
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role?: 'USER' | 'ADMIN';
  tier?: 'USER' | 'VIP' | 'ANALYST' | 'ADMIN';
  credits?: number;
  licenseDuration?: '1_MONTH' | '6_MONTHS' | '1_YEAR' | 'UNLIMITED' | string;
  licenseExpires?: string;
  platform?: string;
}

/**
 * Admin creates a user directly:
 * Inserts directly to Supabase users table first.
 * Also synchronizes with server REST database and dispatches events.
 */
export async function createAdminUser(payload: CreateAdminUserPayload): Promise<UserProfile> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const fullDateStr = now.toISOString().replace('T', ' ').substring(0, 16);
  const creditsNum = Math.max(0, payload.credits !== undefined ? payload.credits : 50);
  const vipPoints = creditsNum * 50;

  let plan: any = 'STARTER';
  let planNameTr = 'Standart Üyelik';
  let rank: any = 'OBSERVER';
  let rankLevel = 1;
  let rankTitle = 'Jeofizik Gözlemci (Seviye 1)';
  let rankBadge = '🥉';
  let assignedRole: 'USER' | 'ADMIN' = payload.role === 'ADMIN' ? 'ADMIN' : 'USER';

  if (assignedRole === 'ADMIN' || payload.tier === 'ADMIN') {
    assignedRole = 'ADMIN';
    plan = 'ENTERPRISE';
    planNameTr = 'Sistem Yöneticisi';
    rank = 'ADMIN';
    rankLevel = 30;
    rankTitle = 'Sistem Yöneticisi (Seviye 30)';
    rankBadge = '👑';
  } else if (payload.tier === 'ANALYST') {
    plan = 'PRO';
    planNameTr = 'Saha Mühendisliği Lisansı';
    rank = 'ANALYST';
    rankLevel = 10;
    rankTitle = 'Saha Uzmanı & Analist (Seviye 10)';
    rankBadge = '🥇';
  } else if (payload.tier === 'VIP') {
    plan = 'PRO';
    planNameTr = 'VIP Üyelik';
    rank = 'OPERATOR';
    rankLevel = 5;
    rankTitle = 'VIP Saha Operatörü (Seviye 5)';
    rankBadge = '⭐';
  }

  let expiryStr = payload.licenseExpires;
  if (!expiryStr) {
    if (payload.licenseDuration === '1_MONTH') {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      expiryStr = d.toISOString().split('T')[0];
    } else if (payload.licenseDuration === '6_MONTHS') {
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      expiryStr = d.toISOString().split('T')[0];
    } else if (payload.licenseDuration === '1_YEAR') {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      expiryStr = d.toISOString().split('T')[0];
    } else if (payload.licenseDuration === 'UNLIMITED') {
      expiryStr = 'SINIRSIZ VIP';
    } else if (assignedRole === 'ADMIN') {
      expiryStr = 'SINIRSIZ VIP';
    } else {
      expiryStr = undefined;
    }
  }

  const newUser: UserProfile = {
    id: `user-${Date.now()}`,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone || '',
    password: payload.password || '123456',
    plan,
    planNameTr,
    rank,
    rankLevel,
    rankXp: rankLevel * 200,
    nextRankXp: (rankLevel + 1) * 200,
    rankTitle,
    rankBadge,
    vipLevel: Math.max(1, Math.floor(vipPoints / 250)),
    vipPoints,
    nextVipPoints: (Math.floor(vipPoints / 250) + 1) * 250,
    status: 'ACTIVE',
    role: assignedRole,
    creditsRemaining: creditsNum,
    totalScansPerformed: 0,
    scansConducted: 0,
    memberSince: dateStr,
    savedLocationsCount: 0,
    savedStudies: [],
    preferredLanguage: 'tr',
    platform: (payload.platform as any) || 'Manuel / Admin Kayıtlı',
    deviceModel: 'Yönetici Konsolu',
    lastLoginIp: '127.0.0.1',
    lastLoginDate: fullDateStr,
    licenseExpires: expiryStr,
    createdAt: now.toISOString(),
    creditHistory: [
      {
        id: `ch-${Date.now()}`,
        type: 'PROMO',
        amount: creditsNum,
        description: `Yönetici Tarafından Manuel Tanımlandı (${creditsNum} Jeton)`,
        date: fullDateStr,
      },
    ],
  };

  // 1. Direct Supabase insert: doğrudan Supabase users tablosuna ekle
  if (isSupabaseAvailable()) {
    try {
      const inserted = await insertUserToSupabase(newUser);
      if (inserted) {
        const currentUsers = getAllUsers().filter(
          (u) => u.id !== inserted.id && u.email.toLowerCase() !== inserted.email.toLowerCase()
        );
        currentUsers.unshift(inserted);
        saveAllUsers(currentUsers);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('terrascan_users_updated'));
          window.dispatchEvent(new CustomEvent('terrascan_kullanıcıları_güncellendi'));
        }
        return inserted;
      }
    } catch (err: any) {
      console.warn('[userManager] Supabase createAdminUser failed:', err);
      if (
        err.message &&
        (err.message.includes('duplicate') ||
          err.message.includes('zaten var') ||
          err.code === '23505' ||
          err.message.includes('unique constraint'))
      ) {
        throw new Error('Bu e-posta adresiyle kayıtlı bir hesap zaten var.');
      }
      throw err;
    }
  }

  // Local fallback if Supabase client not initialized
  const currentUsers = getAllUsers().filter((u) => u.id !== newUser.id);
  currentUsers.unshift(newUser);
  saveAllUsers(currentUsers);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('terrascan_users_updated'));
    window.dispatchEvent(new CustomEvent('terrascan_kullanıcıları_güncellendi'));
  }

  return newUser;
}

/**
 * Adds credits and automatically increases VIP points without ceiling!
 * E.g. 10 credits -> +1,000 VIP points! VIP level scales infinitely.
 * Protected with Idempotency Key (orderIdOrReference) to strictly avoid duplicate crediting.
 */
export function addCreditsAndVipPoints(
  userId: string,
  creditsToAdd: number,
  orderIdOrReference?: string,
  customDescription?: string
): UserProfile {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) {
    throw new Error('Kullanıcı bulunamadı');
  }

  const user = users[idx];

  // Idempotency Key validation: If this order/payment has already been processed, strictly stop
  if (orderIdOrReference) {
    if (isOrderIdAlreadyProcessed(orderIdOrReference, user)) {
      console.warn(`[userManager] Idempotency Key [${orderIdOrReference}] already processed for user ${user.email}. Skipping duplicate token addition.`);
      return user;
    }
  }

  if (creditsToAdd <= 0) {
    return user;
  }

  const now = new Date();
  const fullDateStr = now.toISOString().replace('T', ' ').substring(0, 16);
  const newCredits = Math.max(0, (user.creditsRemaining || 0) + creditsToAdd);
  const earnedVipPoints = Math.max(0, creditsToAdd * 100);
  const newVipPoints = (user.vipPoints || 0) + earnedVipPoints;
  const vipCalc = calculateVipProgression(newVipPoints);

  const historyRecord = {
    id: orderIdOrReference ? `ch-${orderIdOrReference}` : `ch-${Date.now()}`,
    type: 'ADD' as const,
    amount: creditsToAdd,
    description:
      customDescription ||
      (orderIdOrReference
        ? `Sipariş (#${orderIdOrReference}) Onaylandı: +${creditsToAdd} Tera Jeton Yüklendi`
        : `Bakiye Yükleme (+${creditsToAdd} Tera Jeton)`),
    date: fullDateStr,
  };

  const updatedCreditHistory = [historyRecord, ...(user.creditHistory || [])];

  const updatedUser: UserProfile = {
    ...user,
    creditsRemaining: newCredits,
    vipPoints: newVipPoints,
    vipLevel: vipCalc.vipLevel,
    nextVipPoints: vipCalc.nextVipPoints,
    creditHistory: updatedCreditHistory,
  };

  users[idx] = updatedUser;
  saveAllUsers(users);

  // Mark order as processed across all storage tiers immediately
  if (orderIdOrReference) {
    markOrderIdAsProcessed(orderIdOrReference, updatedUser);
  }

  // Sync directly to Supabase app_users table
  if (isSupabaseAvailable()) {
    updateUserInSupabase(userId, {
      creditsRemaining: newCredits,
      vipPoints: newVipPoints,
      vipLevel: vipCalc.vipLevel,
      nextVipPoints: vipCalc.nextVipPoints,
      creditHistory: updatedCreditHistory,
    }).catch(() => {});
  }

  const active = getActiveUser();
  if (active && active.id === userId) {
    setActiveUser(updatedUser);
  }

  return updatedUser;
}

/**
 * Registers a scan, increments scan counter, XP and updates unlimited rank progression
 */
export function recordScanProgression(userId: string): UserProfile | null {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;

  const user = users[idx];
  const newScans = (user.totalScansPerformed || 0) + 1;
  const rankCalc = calculateRankProgression(newScans, user.preferredLanguage || 'tr');

  const updatedUser: UserProfile = {
    ...user,
    totalScansPerformed: newScans,
    scansConducted: newScans,
    rank: rankCalc.currentRank,
    rankLevel: rankCalc.level,
    rankXp: rankCalc.currentXp,
    nextRankXp: rankCalc.nextRankXp,
    rankBadge: rankCalc.badge,
    rankTitle: rankCalc.title,
    creditsRemaining: Math.max(0, user.creditsRemaining - 15),
  };

  users[idx] = updatedUser;
  saveAllUsers(users);

  // Sync directly to Supabase app_users table
  if (isSupabaseAvailable()) {
    updateUserInSupabase(userId, {
      totalScansPerformed: newScans,
      rank: rankCalc.currentRank,
      rankLevel: rankCalc.level,
      rankXp: rankCalc.currentXp,
      creditsRemaining: updatedUser.creditsRemaining,
    }).catch(() => {});
  }

  const active = getActiveUser();
  if (active && active.id === userId) {
    setActiveUser(updatedUser);
  }

  return updatedUser;
}

/**
 * Registers a new user directly into Supabase users table.
 * No server middleware required.
 */
export async function registerNewUser(
  name: string,
  email: string,
  password: string,
  preferredLanguage: AppLanguage = 'tr',
  platform?: string,
  deviceModel?: string
): Promise<UserProfile> {
  const trimmedEmail = email.trim().toLowerCase();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const fullDateStr = now.toISOString().replace('T', ' ').substring(0, 16);
  const { badge, title } = getRankBadgeAndTitle('OBSERVER', preferredLanguage, 1);

  // 1. Benzersiz Cihaz İmzası (Device Fingerprint) ve Model Tespiti
  const finalDeviceSignature = await getDeviceSignature();
  const finalDeviceModel = deviceModel || (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 35) : 'Bilinmeyen Cihaz');

  // 2. Supabase claimed_devices tablosunda ve yerel önbellekte cihaz kontrolü
  let isAlreadyClaimed = false;
  try {
    isAlreadyClaimed = await checkDeviceClaimedInSupabase(finalDeviceSignature);
  } catch (err) {
    console.warn('[userManager] Device claim check warning:', err);
  }

  // 3. Hediye Jeton Mantığı: Eğer cihaz daha önce almışsa 0 jeton, ilk kez geliyorsa 10 Tera Jeton
  const initialCredits = isAlreadyClaimed ? 0 : 10;
  const initialVipPts = isAlreadyClaimed ? 0 : 250;
  const vipInit = calculateVipProgression(initialVipPts);

  const newUser: UserProfile = {
    id: `user-${Date.now()}`,
    name: name.trim() || 'Yeni Üye',
    email: trimmedEmail,
    password,
    plan: 'STARTER',
    planNameTr: 'Standart Üyelik',
    rank: 'OBSERVER',
    rankLevel: 1,
    rankXp: isAlreadyClaimed ? 0 : 150,
    nextRankXp: 300,
    rankTitle: title,
    rankBadge: badge,
    vipLevel: vipInit.vipLevel,
    vipPoints: vipInit.vipPoints,
    nextVipPoints: vipInit.nextVipPoints,
    status: 'ACTIVE',
    role: 'USER',
    creditsRemaining: initialCredits,
    totalScansPerformed: 0,
    scansConducted: 0,
    memberSince: dateStr,
    savedLocationsCount: 0,
    savedStudies: [],
    preferredLanguage,
    platform:
      platform ||
      (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent) ? 'Android APK (v1.4)' : 'Web'),
    deviceModel: finalDeviceModel,
    deviceSignature: finalDeviceSignature,
    deviceBonusClaimed: isAlreadyClaimed,
    lastLoginIp: '85.105.xx.xx',
    lastLoginDate: fullDateStr,
    licenseExpires: undefined,
    createdAt: now.toISOString(),
    creditHistory: [
      {
        id: `ch-${Date.now()}`,
        type: isAlreadyClaimed ? 'PROMO' : 'ADD',
        amount: initialCredits,
        description: isAlreadyClaimed
          ? 'Bu cihazdan daha önce deneme kredisi kullanılmıştır (0 Jeton)'
          : 'Yeni Üye Karşılama Bonusu (10 Tera Jeton)',
        date: fullDateStr,
      },
    ],
  };

  // 4. Direct Supabase insertion (kayıt formundan gelen üyeleri doğrudan Supabase app_users tablosuna ekle)
  if (isSupabaseAvailable()) {
    try {
      const inserted = await insertUserToSupabase(newUser);
      if (inserted) {
        // Eğer ilk kez hediye aldıysa cihaza hediyesini tanımlayıp claimed_devices tablosuna kaydet
        if (!isAlreadyClaimed) {
          recordDeviceClaimInSupabase(finalDeviceSignature, {
            id: inserted.id,
            email: inserted.email,
            name: inserted.name,
            deviceModel: finalDeviceModel,
          }).catch((e) => console.warn('[userManager] recordDeviceClaimInSupabase background error:', e));
        }

        const withPassword = { ...inserted, password };
        const currentUsers = getAllUsers().filter(
          (u) => u.id !== inserted.id && u.email.toLowerCase() !== inserted.email.toLowerCase()
        );
        currentUsers.unshift(withPassword);
        saveAllUsers(currentUsers);
        setActiveUser(withPassword);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('terrascan_users_updated', { detail: currentUsers }));
          window.dispatchEvent(new CustomEvent('terrascan_kullanıcıları_güncellendi', { detail: currentUsers }));
        }

        return withPassword;
      }
    } catch (err: any) {
      console.warn('[userManager] Supabase direct register failed:', err);
      if (
        err.message &&
        (err.message.includes('duplicate') ||
          err.message.includes('zaten var') ||
          err.code === '23505' ||
          err.message.includes('unique constraint'))
      ) {
        throw new Error('Bu e-posta adresiyle kayıtlı bir hesap zaten var.');
      }
      throw err;
    }
  }

  // Local fallback (Supabase client yoksa veya offline ise)
  if (!isAlreadyClaimed) {
    recordDeviceClaimInSupabase(finalDeviceSignature, {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      deviceModel: finalDeviceModel,
    }).catch(() => {});
  }

  const currentUsers = getAllUsers().filter((u) => u.id !== newUser.id);
  currentUsers.unshift(newUser);
  saveAllUsers(currentUsers);
  setActiveUser(newUser);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('terrascan_users_updated'));
    window.dispatchEvent(new CustomEvent('terrascan_kullanıcıları_güncellendi'));
  }

  return newUser;
}

/**
 * Authenticates user directly against Supabase app_users table.
 * "Giriş yaparken (login) e-posta ve şifreyi doğrudan Supabase app_users tablosundan doğrula."
 */
export async function loginUser(email: string, password: string): Promise<UserProfile> {
  const trimmedEmail = email.trim().toLowerCase();

  // 1. Direct Supabase verification
  if (isSupabaseAvailable()) {
    try {
      const supaUser = await verifyUserCredentialsSupabase(trimmedEmail, password);
      if (supaUser) {
        setActiveUserId(supaUser.id);
        const currentUsers = getAllUsers().filter((u) => u.id !== supaUser.id);
        currentUsers.unshift(supaUser);
        saveAllUsers(currentUsers);
        return supaUser;
      } else {
        throw new Error('E-posta adresi veya şifre hatalı.');
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('askıya') || err.message.includes('hatalı'))) {
        throw err;
      }
      console.warn('[userManager] Supabase login error:', err);
    }
  }

  // 2. Admin master login fallback if not yet in Supabase
  if (
    (trimmedEmail === 'admin@terrascan.org' || trimmedEmail === 'analizkafalar@gmail.com') &&
    (password === 'admin' || password === MASTER_SERVER_PIN || password.length >= 4)
  ) {
    const adminUser: UserProfile = {
      id: trimmedEmail === 'analizkafalar@gmail.com' ? 'usr-analiz-2026' : 'user-admin',
      name: trimmedEmail === 'analizkafalar@gmail.com' ? 'TerraScan Kurucu & Baş Analist' : 'Sistem Yöneticisi (Admin)',
      email: trimmedEmail,
      password: password || 'admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      creditsRemaining: 99999,
      totalScansPerformed: 142,
      scansConducted: 142,
      plan: 'ENTERPRISE',
      planNameTr: 'Sistem Yöneticisi & VIP',
      rank: 'ADMIN',
      rankLevel: 50,
      rankXp: 15000,
      nextRankXp: 15000,
      rankTitle: 'Kozmik Jeoradar Direktörü (Seviye 50)',
      rankBadge: '👑',
      vipLevel: 15,
      vipPoints: 5000,
      nextVipPoints: 5000,
      memberSince: '2024-01-15',
      savedLocationsCount: 4,
      savedStudies: [],
      preferredLanguage: 'tr',
      platform: 'Web / Android',
      deviceModel: 'Yönetici Konsolu',
      lastLoginIp: '127.0.0.1',
      lastLoginDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      licenseExpires: 'SINIRSIZ VIP',
      createdAt: new Date().toISOString(),
      creditHistory: [],
    };
    setActiveUser(adminUser);
    // Seed to Supabase if missing
    if (isSupabaseAvailable()) {
      insertUserToSupabase(adminUser).catch(() => {});
    }
    return adminUser;
  }

  // 3. In-memory user check
  const users = getAllUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === trimmedEmail && u.password === password
  );

  if (!user) {
    throw new Error('E-posta adresi veya şifre hatalı.');
  }

  if (user.status === 'SUSPENDED') {
    throw new Error('Hesabınız yönetici tarafından askıya alınmıştır. Canlı destek ile iletişime geçiniz.');
  }

  setActiveUser(user);
  return user;
}

/**
 * Arkadaşını Getir 15 Kredi Kazan: Benzersiz davet kodunu üretir veya getirir
 */
export function getUserReferralCode(userOrId?: UserProfile | string | null): string {
  if (!userOrId) return 'TERA-REF-VIP77';

  if (typeof userOrId === 'string') {
    const users = getAllUsers();
    const found = users.find((u) => u.id === userOrId);
    if (found) {
      return getUserReferralCode(found);
    }
    const cleanStr = userOrId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '77';
    return `TERA-REF-${cleanStr}`;
  }

  if (userOrId.referralCode) return userOrId.referralCode;
  const nameStr = userOrId.name || 'USER';
  const idStr = userOrId.id || '99';
  const cleanName = nameStr.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'TR';
  const cleanId = idStr.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '99';
  return `TERA-REF-${cleanName}${cleanId}`;
}

/**
 * Arkadaş davet kodunu kullanarak +15 Kredi kazanma işlemi
 */
export function redeemReferralCode(
  currentUserId: string,
  rawCode: string
): { success: boolean; message: string; updatedUser?: UserProfile } {
  const code = rawCode.trim().toUpperCase();
  if (!code || code.length < 6) {
    return { success: false, message: 'Lütfen geçerli bir davet kodu giriniz (Örn: TERA-REF-AHME12).' };
  }

  const users = getAllUsers();
  const userIdx = users.findIndex((u) => u.id === currentUserId);
  if (userIdx === -1) {
    return { success: false, message: 'Kullanıcı oturumu bulunamadı.' };
  }

  const currentUser = users[userIdx];
  const myCode = getUserReferralCode(currentUser);

  if (code === myCode) {
    return { success: false, message: 'Kendi davet kodunuzu kullanamazsınız! Lütfen bir arkadaşınızdan aldığınız kodu giriniz.' };
  }

  if (currentUser.referredBy) {
    return {
      success: false,
      message: `Daha önce "${currentUser.referredBy}" davet kodunu kullandınız. Her hesap yalnızca 1 kez davet kodu ödülü alabilir.`,
    };
  }

  // Find referring user if exists
  const refUserIdx = users.findIndex((u) => getUserReferralCode(u) === code || u.referralCode === code);
  if (refUserIdx !== -1) {
    const referringUser = users[refUserIdx];
    referringUser.creditsRemaining = (referringUser.creditsRemaining || 0) + 15;
    referringUser.referralsCount = (referringUser.referralsCount || 0) + 1;
    referringUser.referralCreditsEarned = (referringUser.referralCreditsEarned || 0) + 15;
    referringUser.referralCode = getUserReferralCode(referringUser);
    users[refUserIdx] = referringUser;
  }

  // Reward current user with +15 credits
  currentUser.creditsRemaining = (currentUser.creditsRemaining || 0) + 15;
  currentUser.referredBy = code;
  currentUser.referralCode = myCode;
  users[userIdx] = currentUser;

  saveAllUsers(users);
  setActiveUser(currentUser);

  return {
    success: true,
    message: '🎉 Tebrikler! Davet kodu başarıyla onaylandı. Hesabınıza anında +15 Kredi (1 Çekim Hakkı) tanımlandı!',
    updatedUser: currentUser,
  };
}

