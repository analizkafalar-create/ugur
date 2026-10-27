import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, UserRank, AppLanguage } from '../types';
import { calculateRankProgression, calculateVipProgression } from '../utils/userManager';
import { isDeviceLocallyClaimed, markDeviceLocallyClaimed } from '../utils/deviceFingerprint';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  'https://kornfxivbyoltnfjulna.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_sn4dXZFZCcEMc4WvZcQ7Pw_FQFq21B5';

export const SUPABASE_USERS_TABLE = 'app_users';
export const SUPABASE_CLAIMED_DEVICES_TABLE = 'claimed_devices';

let _supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_supabaseInstance) {
    return _supabaseInstance;
  }

  const key = SUPABASE_ANON_KEY;
  if (!key || key.includes('ADIMDA') || key.length < 10) {
    return null;
  }

  try {
    _supabaseInstance = createClient(SUPABASE_URL, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return _supabaseInstance;
  } catch (err) {
    console.error('[Supabase] Client initialization failed:', err);
    return null;
  }
}

export const supabase = getSupabaseClient();

export function isSupabaseAvailable(): boolean {
  return getSupabaseClient() !== null;
}

/**
 * Maps a Supabase `app_users` record to the application's UserProfile object.
 */
export function mapSupabaseRowToUser(row: any): UserProfile {
  if (!row) {
    throw new Error('Geçersiz kullanıcı satırı.');
  }

  const email = (row.email || '').toLowerCase().trim();
  const rawRole = (row.role || '').toUpperCase();
  const role: 'USER' | 'ADMIN' = rawRole === 'ADMIN' ? 'ADMIN' : 'USER';
  const scans = Number(row.total_scans_performed ?? row.totalScansPerformed ?? row.scans_conducted ?? 0);
  const lang: AppLanguage = row.preferred_language || row.preferredLanguage || 'tr';
  const rankProg = calculateRankProgression(scans, lang);

  const credits = typeof row.credits === 'number' ? row.credits : Number(row.tokens ?? row.credits_remaining ?? 10);
  const vipPts = Number(row.vip_points ?? (credits * 25));
  const vipProg = calculateVipProgression(vipPts);

  const rawLicense = row.license_expires_at || row.license_expires || row.licenseExpires || undefined;
  const licenseType = row.license_type || (role === 'ADMIN' ? 'Sistem Yöneticisi' : 'Standart Üyelik');
  const isPro = role === 'ADMIN' || licenseType.toLowerCase().includes('pro') || licenseType.toLowerCase().includes('vip') || (rawLicense && String(rawLicense).includes('2099'));

  return {
    id: String(row.id || `user-${Date.now()}`),
    name: row.full_name || row.name || 'Kullanıcı',
    email,
    phone: row.phone || '',
    password: row.password || '',
    plan: isPro ? 'PRO' : 'STARTER',
    planNameTr: licenseType,
    rank: role === 'ADMIN' ? 'ADMIN' : rankProg.currentRank,
    rankLevel: role === 'ADMIN' ? 30 : rankProg.level,
    rankXp: rankProg.currentXp,
    nextRankXp: rankProg.nextRankXp,
    rankTitle: role === 'ADMIN' ? 'Sistem Yöneticisi' : rankProg.title,
    rankBadge: role === 'ADMIN' ? '👑' : rankProg.badge,
    vipLevel: vipProg.vipLevel,
    vipPoints: vipPts,
    nextVipPoints: vipProg.nextVipPoints,
    status: 'ACTIVE',
    isChatMuted: false,
    role,
    creditsRemaining: credits,
    totalScansPerformed: scans,
    scansConducted: scans,
    memberSince: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    savedLocationsCount: 0,
    savedStudies: [],
    preferredLanguage: lang,
    platform: 'Web / Android',
    deviceModel: 'Cihaz',
    lastLoginIp: '127.0.0.1',
    lastLoginDate: row.created_at ? row.created_at.replace('T', ' ').substring(0, 16) : new Date().toISOString().replace('T', ' ').substring(0, 16),
    licenseExpires: rawLicense || undefined,
    activeLicenseKey: row.active_license_key || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    creditHistory: [
      {
        id: `ch-init-${row.id || Date.now()}`,
        type: 'ADD',
        amount: credits,
        description: `Mevcut Bakiye (${credits} Tera Jeton)`,
        date: row.created_at ? row.created_at.replace('T', ' ').substring(0, 16) : new Date().toISOString().replace('T', ' ').substring(0, 16),
      }
    ],
  };
}

/**
 * Fetches all registered users directly from Supabase app_users table:
 * "select * from app_users order by created_at desc"
 */
export async function fetchUsersFromSupabase(): Promise<UserProfile[] | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  try {
    const { data, error } = await client
      .from(SUPABASE_USERS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] select app_users failed:', error.message);
      return null;
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map(mapSupabaseRowToUser);
  } catch (err) {
    console.error('[Supabase] fetchUsersFromSupabase exception:', err);
    return null;
  }
}

/**
 * Inserts a new user directly into Supabase app_users table.
 */
export async function insertUserToSupabase(user: UserProfile): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const fullName = user.name?.trim() || 'Yeni Üye';
  const cleanEmail = user.email.toLowerCase().trim();
  const creditsNum = typeof user.creditsRemaining === 'number' ? user.creditsRemaining : 10;
  const userRole = user.role === 'ADMIN' ? 'ADMIN' : 'USER';
  const licenseType = user.plan === 'PRO' ? 'VIP Lisans' : (user.planNameTr || 'Yok');
  const licenseExpiresAt = user.licenseExpires || null;
  const activeLicenseKey = user.activeLicenseKey || null;

  const payload: Record<string, any> = {
    full_name: fullName,
    email: cleanEmail,
    credits: creditsNum,
    role: userRole,
    license_type: licenseType,
    license_expires_at: licenseExpiresAt,
    active_license_key: activeLicenseKey,
    created_at: user.createdAt || new Date().toISOString(),
  };

  // If user.id is already a valid UUID, include it; otherwise omit to let Postgres generate a UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
  if (isUuid) {
    payload.id = user.id;
  }

  try {
    const { data, error } = await client
      .from(SUPABASE_USERS_TABLE)
      .insert([payload])
      .select()
      .single();

    if (error) {
      // Check for duplicate email
      if (
        error.code === '23505' ||
        error.message?.includes('duplicate') ||
        error.message?.includes('unique constraint')
      ) {
        throw new Error('Bu e-posta adresiyle kayıtlı bir hesap zaten var.');
      }
      console.error('[Supabase] insertUserToSupabase error:', error);
      throw error;
    }

    if (data) {
      return mapSupabaseRowToUser(data);
    }

    return user;
  } catch (err: any) {
    console.error('[Supabase] insertUserToSupabase exception:', err);
    throw err;
  }
}

/**
 * Authenticates user directly against Supabase app_users table:
 * verifies email and loads live user data.
 */
export async function verifyUserCredentialsSupabase(
  email: string,
  _password?: string
): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    const { data, error } = await client
      .from(SUPABASE_USERS_TABLE)
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapSupabaseRowToUser(data);
  } catch (err) {
    console.error('[Supabase] verifyUserCredentialsSupabase error:', err);
    throw err;
  }
}

/**
 * Updates a user directly in Supabase app_users table (credits, license, role, etc.)
 */
export async function updateUserInSupabase(
  userId: string,
  partial: Partial<UserProfile>
): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const rawPayload: Record<string, any> = {};

    if (partial.creditsRemaining !== undefined) {
      rawPayload.credits = partial.creditsRemaining;
    }
    if (partial.name !== undefined) {
      rawPayload.full_name = partial.name;
    }
    if (partial.role !== undefined) {
      rawPayload.role = partial.role;
    }
    if (partial.licenseExpires !== undefined) {
      rawPayload.license_expires_at = partial.licenseExpires;
    }
    if (partial.planNameTr !== undefined || partial.plan !== undefined) {
      rawPayload.license_type = partial.planNameTr || (partial.plan === 'PRO' ? 'VIP Lisans' : 'Yok');
    }
    if (partial.activeLicenseKey !== undefined) {
      rawPayload.active_license_key = partial.activeLicenseKey;
    }

    if (Object.keys(rawPayload).length === 0) {
      return null;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    const targetEmail = partial.email || (userId.includes('@') ? userId : null);

    let query = client.from(SUPABASE_USERS_TABLE).update(rawPayload);
    if (isUuid) {
      query = query.eq('id', userId);
    } else if (targetEmail) {
      query = query.ilike('email', targetEmail.toLowerCase().trim());
    } else {
      query = query.eq('id', userId);
    }

    const { data, error } = await query.select().maybeSingle();

    if (error) {
      console.warn('[Supabase] updateUserInSupabase warning:', error.message);
      return null;
    }

    return data ? mapSupabaseRowToUser(data) : null;
  } catch (err) {
    console.warn('[Supabase] updateUserInSupabase exception:', err);
    return null;
  }
}

/**
 * Directly updates credits for a user in Supabase 'app_users' table by email:
 */
export async function updateUserCreditsInSupabase(
  targetEmail: string,
  newCredits: number
): Promise<{ data: any; error: any }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: new Error('Supabase client unavailable') };
  }

  try {
    const email = targetEmail.toLowerCase().trim();
    const { data, error } = await client
      .from(SUPABASE_USERS_TABLE)
      .update({
        credits: newCredits,
      })
      .ilike('email', email)
      .select();

    if (error) {
      console.error('[Supabase] credits update error:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('[Supabase] credits update exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Deletes a user directly from Supabase app_users table.
 */
export async function deleteUserFromSupabase(userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    let query = client.from(SUPABASE_USERS_TABLE).delete();
    if (isUuid) {
      query = query.eq('id', userId);
    } else if (userId.includes('@')) {
      query = query.ilike('email', userId.toLowerCase().trim());
    } else {
      query = query.eq('id', userId);
    }

    const { error } = await query;
    if (error) {
      console.warn('[Supabase] deleteUserFromSupabase error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] deleteUserFromSupabase exception:', err);
    return false;
  }
}

/**
 * Subscribes to Supabase Realtime channel for live updates on app_users table:
 */
export function subscribeToSupabaseUsers(
  onInsert: (user: UserProfile) => void,
  onUpdate?: (user: UserProfile) => void,
  onDelete?: (userId: string) => void,
  onStatus?: (status: string) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) {
    if (onStatus) onStatus('DISCONNECTED');
    return () => {};
  }

  const channelId = `app-users-live-${Math.random().toString(36).substring(2, 9)}`;

  try {
    const channel = client
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: SUPABASE_USERS_TABLE },
        (payload) => {
          console.log('[Supabase Realtime] Yeni kullanıcı eklendi (app_users):', payload.new);
          if (payload.new) {
            try {
              const mapped = mapSupabaseRowToUser(payload.new);
              onInsert(mapped);
            } catch (e) {
              console.warn('[Supabase Realtime] Map error:', e);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: SUPABASE_USERS_TABLE },
        (payload) => {
          console.log('[Supabase Realtime] Kullanıcı güncellendi (app_users):', payload.new);
          if (payload.new && onUpdate) {
            try {
              const mapped = mapSupabaseRowToUser(payload.new);
              onUpdate(mapped);
            } catch (e) {
              console.warn('[Supabase Realtime] Map error:', e);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: SUPABASE_USERS_TABLE },
        (payload) => {
          console.log('[Supabase Realtime] Kullanıcı silindi (app_users):', payload.old);
          if (payload.old?.id && onDelete) {
            onDelete(String(payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] app_users channel status:', status);
        if (onStatus) {
          onStatus(status);
        }
      });

    return () => {
      try {
        client.removeChannel(channel);
      } catch (e) {
        console.warn('[Supabase Realtime] removeChannel error:', e);
      }
    };
  } catch (err) {
    console.warn('[Supabase Realtime] Subscription error:', err);
    if (onStatus) onStatus('ERROR');
    return () => {};
  }
}

export const SUPABASE_CHAT_TABLE = 'chat_messages';

/**
 * Fetch latest chat messages from Supabase
 */
export async function fetchChatMessages(limit: number = 50): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from(SUPABASE_CHAT_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Supabase Chat] fetch error:', error.message);
      return [];
    }
    return data ? [...data].reverse() : [];
  } catch (e) {
    console.warn('[Supabase Chat] fetch exception:', e);
    return [];
  }
}

/**
 * Send a chat message to Supabase
 */
export async function sendChatMessage(msg: {
  userId?: string;
  userName: string;
  userEmail?: string;
  userRole?: 'ADMIN' | 'USER';
  vipLevel?: number;
  message: string;
  locationTag?: string;
}): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const payload = {
    user_name: msg.userName || 'Saha Kullanıcısı',
    message: msg.message.trim(),
    role: msg.userRole || 'USER',
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await client
      .from(SUPABASE_CHAT_TABLE)
      .insert([payload])
      .select();

    if (error) {
      console.warn('[Supabase Chat] send error:', error.message);
      return null;
    }
    return data && data.length > 0 ? data[0] : payload;
  } catch (e) {
    console.warn('[Supabase Chat] send exception:', e);
    return null;
  }
}

/**
 * Subscribe to realtime chat messages
 */
export function subscribeToChatMessages(
  onNewMessage: (msg: any) => void,
  onStatus?: (status: string) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) {
    if (onStatus) onStatus('OFFLINE');
    return () => {};
  }

  const channelId = `chat-live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  try {
    const channel = client
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: SUPABASE_CHAT_TABLE },
        (payload) => {
          if (payload && payload.new) {
            onNewMessage(payload.new);
          }
        }
      )
      .subscribe((status) => {
        if (onStatus) onStatus(status);
      });

    return () => {
      try {
        client.removeChannel(channel);
      } catch (e) {
        console.warn('[Supabase Chat] removeChannel error:', e);
      }
    };
  } catch (err) {
    console.warn('[Supabase Chat Realtime] subscription error:', err);
    if (onStatus) onStatus('ERROR');
    return () => {};
  }
}

/**
 * Deletes a chat message from Supabase chat_messages table (Admin only)
 */
export async function deleteChatMessageFromSupabase(messageId: string | number): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from(SUPABASE_CHAT_TABLE)
      .delete()
      .eq('id', messageId);

    if (error) {
      console.warn('[Supabase Chat] delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Chat] delete exception:', err);
    return false;
  }
}

/**
 * Checks whether the device signature has already claimed a free trial token pack
 * from Supabase claimed_devices table.
 */
export async function checkDeviceClaimedInSupabase(deviceSignature: string): Promise<boolean> {
  if (!deviceSignature) return false;

  if (isDeviceLocallyClaimed(deviceSignature)) {
    return true;
  }

  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  try {
    const { data, error } = await client
      .from(SUPABASE_CLAIMED_DEVICES_TABLE)
      .select('id, device_token')
      .eq('device_token', deviceSignature)
      .limit(1);

    if (error) {
      console.warn('[Supabase ClaimedDevices] check warning:', error.message);
      return false;
    }

    if (data && data.length > 0) {
      markDeviceLocallyClaimed(deviceSignature);
      return true;
    }

    return false;
  } catch (err) {
    console.warn('[Supabase ClaimedDevices] check exception:', err);
    return false;
  }
}

/**
 * Records a new device signature in the Supabase claimed_devices table
 * after the initial free trial bonus has been granted.
 */
export async function recordDeviceClaimInSupabase(
  deviceSignature: string,
  _user?: { id: string; email: string; name?: string; deviceModel?: string }
): Promise<boolean> {
  if (!deviceSignature) return false;

  markDeviceLocallyClaimed(deviceSignature);

  const client = getSupabaseClient();
  if (!client) return true;

  try {
    const payload = {
      device_token: deviceSignature,
      created_at: new Date().toISOString(),
    };

    const { error } = await client
      .from(SUPABASE_CLAIMED_DEVICES_TABLE)
      .insert([payload]);

    if (error) {
      console.warn('[Supabase ClaimedDevices] record warning:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[Supabase ClaimedDevices] record exception:', err);
    return false;
  }
}
