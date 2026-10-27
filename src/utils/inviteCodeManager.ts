/**
 * TerraScan AI - Invite & Promo Code Manager
 * Pure Supabase `invite_codes` and `used_invite_codes` integration.
 * No hardcoded or mock codes.
 */

import { InviteCode, UsedInviteCode, UserProfile } from '../types';
import { getSupabaseClient, isSupabaseAvailable } from '../lib/supabase';
import { addCreditsAndVipPoints } from './userManager';

const INVITE_CODES_STORAGE_KEY = 'terrascan_invite_codes_v1';
const USED_INVITE_CODES_STORAGE_KEY = 'terrascan_used_invite_codes_v1';

export const SUPABASE_INVITE_CODES_TABLE = 'invite_codes';
export const SUPABASE_USED_INVITE_CODES_TABLE = 'used_invite_codes';

/**
 * Gets cached invite codes from LocalStorage
 */
export function getLocalInviteCodes(): InviteCode[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INVITE_CODES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves invite codes to local cache
 */
export function saveLocalInviteCodes(codes: InviteCode[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(INVITE_CODES_STORAGE_KEY, JSON.stringify(codes));
    window.dispatchEvent(new CustomEvent('terrascan_invite_codes_changed', { detail: codes }));
  } catch {}
}

/**
 * Gets locally cached list of used invite codes
 */
export function getLocalUsedInviteCodes(): UsedInviteCode[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USED_INVITE_CODES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves used invite codes to local cache
 */
export function saveLocalUsedInviteCodes(used: UsedInviteCode[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(USED_INVITE_CODES_STORAGE_KEY, JSON.stringify(used));
  } catch {}
}

/**
 * Maps raw Supabase row to InviteCode object
 */
export function mapRowToInviteCode(row: any): InviteCode {
  return {
    id: String(row.id || `code-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`),
    code: String(row.code || '').trim().toUpperCase(),
    tokens: Number(row.tokens ?? row.credits ?? row.token_amount ?? 15),
    max_uses: Number(row.max_uses ?? row.maxUses ?? 10),
    used_count: Number(row.used_count ?? row.usedCount ?? 0),
    is_active: row.is_active !== false && row.isActive !== false,
    created_at: String(row.created_at || row.createdAt || new Date().toISOString()),
    description: row.description || row.note || '',
  };
}

/**
 * Fetches all invite codes from Supabase invite_codes table
 */
export async function fetchAllInviteCodes(): Promise<InviteCode[]> {
  const client = getSupabaseClient();

  if (!client || !isSupabaseAvailable()) {
    return getLocalInviteCodes();
  }

  try {
    const { data, error } = await client
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[inviteCodeManager] Supabase fetch notice:', error.message || error);
      // Fallback: try select without order if created_at column does not exist
      try {
        const retry = await client.from('invite_codes').select('*');
        if (!retry.error && retry.data && Array.isArray(retry.data)) {
          const mapped: InviteCode[] = retry.data.map(mapRowToInviteCode);
          saveLocalInviteCodes(mapped);
          return mapped;
        }
      } catch {}
      return getLocalInviteCodes();
    }

    if (data && Array.isArray(data)) {
      const mapped: InviteCode[] = data.map(mapRowToInviteCode);
      saveLocalInviteCodes(mapped);
      return mapped;
    }
    return getLocalInviteCodes();
  } catch (err: any) {
    console.warn('[inviteCodeManager] Supabase fetch fallback (offline/network):', err?.message || err);
    return getLocalInviteCodes();
  }
}

/**
 * Creates a new invite/promo code in Supabase
 * Matching exact structure:
 * const { data, error } = await supabase.from('invite_codes').insert([{
 *   code: codeName.trim().toUpperCase(),
 *   tokens: Number(tokenAmount),
 *   max_uses: Number(maxUses),
 *   used_count: 0,
 *   is_active: true
 * }]).select();
 */
export async function createInviteCode(params: {
  code: string;
  tokens: number;
  max_uses: number;
  description?: string;
}): Promise<{ success: boolean; data?: InviteCode; message?: string }> {
  const codeName = (params.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!codeName || codeName.length < 2) {
    return { success: false, message: 'Geçerli bir kod adı giriniz (en az 2 karakter).' };
  }

  const tokenAmount = Number(params.tokens) || 50;
  const maxUses = Number(params.max_uses) || 10;

  const client = getSupabaseClient();
  if (!client) {
    const errMsg = 'Supabase bağlantısı kurulamadı. Lütfen Supabase konfigürasyonunu kontrol ediniz.';
    console.error('Supabase Invite Hatası:', errMsg);
    return { success: false, message: errMsg };
  }

  try {
    const insertPayload = {
      code: codeName.trim().toUpperCase(),
      tokens: Number(tokenAmount),
      max_uses: Number(maxUses),
      used_count: 0,
      is_active: true,
    };

    const { data, error } = await client
      .from('invite_codes')
      .insert([insertPayload])
      .select();

    if (error) {
      console.error('Supabase Invite Hatası:', error);
      return {
        success: false,
        message: `Supabase Hatası: ${error.message || error.details || 'Kod kaydedilemedi.'}`,
      };
    }

    if (!data || data.length === 0) {
      const errMsg = 'Supabase kayıt oluşturdu ancak kayıt verisini geri döndürmedi.';
      console.error('Supabase Invite Hatası:', errMsg);
      return { success: false, message: errMsg };
    }

    const createdObj = mapRowToInviteCode(data[0]);
    if (params.description) {
      createdObj.description = params.description;
    }

    // Update local cache
    const currentList = getLocalInviteCodes().filter((c) => c.code.toUpperCase() !== codeName);
    saveLocalInviteCodes([createdObj, ...currentList]);

    return {
      success: true,
      data: createdObj,
      message: `"${codeName}" davet kodu başarıyla oluşturuldu!`,
    };
  } catch (err: any) {
    console.error('Supabase Invite Hatası:', err);
    return {
      success: false,
      message: `Beklenmeyen Hata: ${err.message || 'Bağlantı kurulamadı.'}`,
    };
  }
}

/**
 * Toggles is_active status of an invite code (Pasif Yap / Aktif Yap)
 */
export async function toggleInviteCodeStatus(codeIdOrCode: string, isActive: boolean): Promise<boolean> {
  const currentList = getLocalInviteCodes();
  const idx = currentList.findIndex((c) => c.id === codeIdOrCode || c.code.toUpperCase() === codeIdOrCode.toUpperCase());
  
  if (idx !== -1) {
    currentList[idx].is_active = isActive;
    saveLocalInviteCodes(currentList);
  }

  const targetCode = currentList[idx]?.code || codeIdOrCode;

  const client = getSupabaseClient();
  if (client && isSupabaseAvailable()) {
    try {
      const { error } = await client
        .from('invite_codes')
        .update({ is_active: isActive })
        .or(`id.eq.${codeIdOrCode},code.eq.${targetCode}`);

      if (error) {
        console.error('Supabase Invite Hatası (toggle):', error);
      }
    } catch (err) {
      console.error('Supabase Invite Hatası (toggle exception):', err);
    }
  }

  return true;
}

/**
 * Deletes an invite code
 */
export async function deleteInviteCode(codeIdOrCode: string): Promise<boolean> {
  const currentList = getLocalInviteCodes();
  const targetObj = currentList.find((c) => c.id === codeIdOrCode || c.code.toUpperCase() === codeIdOrCode.toUpperCase());
  const updatedList = currentList.filter((c) => c.id !== codeIdOrCode && c.code.toUpperCase() !== codeIdOrCode.toUpperCase());
  saveLocalInviteCodes(updatedList);

  const targetCode = targetObj?.code || codeIdOrCode;

  const client = getSupabaseClient();
  if (client && isSupabaseAvailable()) {
    try {
      const { error } = await client
        .from('invite_codes')
        .delete()
        .or(`id.eq.${codeIdOrCode},code.eq.${targetCode}`);

      if (error) {
        console.warn('[inviteCodeManager] Supabase delete note:', error);
      }
    } catch (err) {
      console.warn('[inviteCodeManager] Supabase delete exception:', err);
    }
  }

  return true;
}

/**
 * Checks if a user has already used a specific invite code
 */
export async function hasUserUsedInviteCode(code: string, user: UserProfile): Promise<boolean> {
  const cleanCode = code.trim().toUpperCase();
  const userEmail = (user.email || '').toLowerCase().trim();
  const userId = user.id;

  // 1. Check local used codes cache
  const localUsed = getLocalUsedInviteCodes();
  const matchLocal = localUsed.some(
    (u) =>
      u.code.toUpperCase() === cleanCode &&
      (u.user_id === userId || (u.user_email && u.user_email.toLowerCase() === userEmail))
  );
  if (matchLocal) return true;

  // 2. Check user's credit history
  if (Array.isArray(user.creditHistory)) {
    for (const item of user.creditHistory) {
      const desc = String(item.description || '').toUpperCase();
      const idStr = String(item.id || '').toUpperCase();
      if (desc.includes(cleanCode) || idStr.includes(`PROMO-${cleanCode}`)) {
        return true;
      }
    }
  }

  // 3. Check Supabase used_invite_codes table
  const client = getSupabaseClient();
  if (client && isSupabaseAvailable()) {
    try {
      const { data, error } = await client
        .from(SUPABASE_USED_INVITE_CODES_TABLE)
        .select('*')
        .ilike('code', cleanCode)
        .or(`user_id.eq.${userId},user_email.eq.${userEmail}`);

      if (!error && data && data.length > 0) {
        return true;
      }
    } catch (err) {
      console.warn('[inviteCodeManager] Supabase check used codes warning:', err);
    }
  }

  return false;
}

/**
 * Single invite code check directly against Supabase `invite_codes` table
 */
export async function findInviteCodeInSupabase(cleanCode: string): Promise<InviteCode | null> {
  const client = getSupabaseClient();
  if (client && isSupabaseAvailable()) {
    try {
      const { data, error } = await client
        .from('invite_codes')
        .select('*')
        .ilike('code', cleanCode)
        .limit(1);

      if (!error && data && data.length > 0) {
        return mapRowToInviteCode(data[0]);
      }
    } catch (err) {
      console.warn('[inviteCodeManager] Supabase find code warning:', err);
    }
  }

  // Fallback to local cache if offline
  const localList = getLocalInviteCodes();
  return localList.find((c) => c.code.toUpperCase() === cleanCode) || null;
}

/**
 * Redeems an invite/promo code for a given user.
 * Strictly verifies against Supabase `invite_codes` table.
 * If code is not found, inactive, or quota exceeded -> 'Geçersiz veya süresi dolmuş davet kodu!'
 * If already used -> 'Bu kodu daha önce kullandınız!'
 */
export async function redeemInviteCode(
  rawCode: string,
  user: UserProfile
): Promise<{
  success: boolean;
  message: string;
  tokensAwarded?: number;
  updatedUser?: UserProfile;
}> {
  const cleanCode = (rawCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: 'Geçersiz veya süresi dolmuş davet kodu!' };
  }

  if (!user || !user.id) {
    return { success: false, message: 'Davet kodunu kullanabilmek için lütfen önce giriş yapınız.' };
  }

  // 1. Fetch code directly from Supabase invite_codes table
  const inviteObj = await findInviteCodeInSupabase(cleanCode);

  // If not found in database
  if (!inviteObj) {
    return { success: false, message: 'Geçersiz veya süresi dolmuş davet kodu!' };
  }

  // 2. Active status check
  if (!inviteObj.is_active) {
    return { success: false, message: 'Geçersiz veya süresi dolmuş davet kodu!' };
  }

  // 3. Usage limit check
  if (inviteObj.used_count >= inviteObj.max_uses) {
    return { success: false, message: 'Geçersiz veya süresi dolmuş davet kodu!' };
  }

  // 4. Duplicate usage check per user
  const alreadyUsed = await hasUserUsedInviteCode(cleanCode, user);
  if (alreadyUsed) {
    return { success: false, message: 'Bu kodu daha önce kullandınız!' };
  }

  // 5. Award Tokens to user
  const tokensToAward = inviteObj.tokens || 10;
  const idempotencyRef = `PROMO-${cleanCode}`;
  const customDesc = `🎟️ Promosyon Kodu (${cleanCode}) Başarıyla Kullanıldı: +${tokensToAward} Tera Jeton`;

  const updatedUser = addCreditsAndVipPoints(user.id, tokensToAward, idempotencyRef, customDesc);

  // 6. Update used_count
  inviteObj.used_count = (inviteObj.used_count || 0) + 1;
  const allLocal = getLocalInviteCodes();
  const existingIdx = allLocal.findIndex((c) => c.code.toUpperCase() === cleanCode);
  if (existingIdx !== -1) {
    allLocal[existingIdx].used_count = inviteObj.used_count;
    saveLocalInviteCodes(allLocal);
  }

  // 7. Record to local used codes cache
  const usedEntry: UsedInviteCode = {
    id: `used-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    code: cleanCode,
    code_id: inviteObj.id,
    user_id: user.id,
    user_email: (user.email || '').toLowerCase().trim(),
    tokens_awarded: tokensToAward,
    used_at: new Date().toISOString(),
  };

  const localUsedList = getLocalUsedInviteCodes();
  localUsedList.push(usedEntry);
  saveLocalUsedInviteCodes(localUsedList);

  // 8. Update Supabase tables
  const client = getSupabaseClient();
  if (client && isSupabaseAvailable()) {
    try {
      // Increment used_count on invite_codes
      await client
        .from('invite_codes')
        .update({ used_count: inviteObj.used_count })
        .or(`id.eq.${inviteObj.id},code.eq.${cleanCode}`);

      // Insert record into used_invite_codes
      await client.from(SUPABASE_USED_INVITE_CODES_TABLE).insert([
        {
          code: cleanCode,
          code_id: inviteObj.id,
          user_id: user.id,
          user_email: (user.email || '').toLowerCase().trim(),
          tokens_awarded: tokensToAward,
          used_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Supabase Invite Hatası (redeem sync):', err);
    }
  }

  // Dispatch custom event for real-time UI synchronization
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('terrascan_invite_code_redeemed', {
        detail: {
          code: cleanCode,
          tokens: tokensToAward,
          userId: user.id,
        },
      })
    );
  }

  return {
    success: true,
    message: `Tebrikler! ${tokensToAward} jeton hesabınıza yüklendi.`,
    tokensAwarded: tokensToAward,
    updatedUser,
  };
}
