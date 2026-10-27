import { GeneratedLicenseKey, UserProfile } from '../types';
import { getSupabaseClient, isSupabaseAvailable } from '../lib/supabase';
import { addCreditsAndVipPoints, getAllUsers, updateUserById } from './userManager';

export const ADMIN_CODES_STORAGE_KEY = 'terrascan_admin_order_license_codes';

// Initial pre-configured valid codes / order numbers
const INITIAL_SYSTEM_CODES: GeneratedLicenseKey[] = [
  {
    key: 'TERA-50J-9821-4472-TR',
    type: '50 Tera Jeton',
    credits: 50,
    customer: 'Ahmet Yılmaz (Uşak)',
    createdAt: '2026-09-12 10:24',
    status: 'KULLANILDI',
    usedBy: 'ahmet.yilmaz@gmail.com',
    usedAt: '2026-09-12 10:28',
  },
  {
    key: 'TERA-100J-4119-8802-TR',
    type: '100 Tera Jeton',
    credits: 100,
    customer: 'Mehmet Demir (Denizli)',
    createdAt: '2026-09-12 09:40',
    status: 'BEKLIYOR',
  },
  {
    key: 'TERA-250J-7712-3301-TR',
    type: '250 Tera Jeton (Pro Saha)',
    credits: 250,
    customer: 'Saha Mühendisliği Ltd.',
    createdAt: '2026-09-11 16:15',
    status: 'BEKLIYOR',
  },
  {
    key: 'TERA-VIP-8890-1124-TR',
    type: '1000 Tera Jeton (VIP Elit)',
    credits: 1000,
    customer: 'Kozmik Jeoradar Madencilik',
    createdAt: '2026-09-10 14:00',
    status: 'KULLANILDI',
    usedBy: 'analizkafalar@gmail.com',
    usedAt: '2026-09-10 14:15',
  },
  {
    key: 'SP-882190',
    type: '100 Tera Jeton (Shopier Sipariş No)',
    credits: 100,
    customer: 'Ömer Şimşek (Sipariş Onaylı)',
    createdAt: '2026-09-13 14:20',
    status: 'BEKLIYOR',
  },
  {
    key: 'SP-504412',
    type: '50 Tera Jeton (Shopier Sipariş No)',
    credits: 50,
    customer: 'Erkan Bars (Sipariş Onaylı)',
    createdAt: '2026-09-13 15:00',
    status: 'BEKLIYOR',
  },
];

/**
 * Reads all active & redeemed admin license / order codes.
 */
export function getAdminLicenseCodes(): GeneratedLicenseKey[] {
  try {
    const raw = localStorage.getItem(ADMIN_CODES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[ActivationCodes] Error reading admin license codes:', e);
  }

  localStorage.setItem(ADMIN_CODES_STORAGE_KEY, JSON.stringify(INITIAL_SYSTEM_CODES));
  return INITIAL_SYSTEM_CODES;
}

/**
 * Saves code list to localStorage.
 */
export function saveAdminLicenseCodes(codes: GeneratedLicenseKey[]): void {
  try {
    localStorage.setItem(ADMIN_CODES_STORAGE_KEY, JSON.stringify(codes));
  } catch (e) {
    console.warn('[ActivationCodes] Error saving admin codes:', e);
  }
}

/**
 * Admin creates or adds a custom order number or license key.
 */
export function addAdminLicenseCode(payload: {
  code: string;
  type?: string;
  credits: number;
  customer: string;
}): GeneratedLicenseKey {
  const current = getAdminLicenseCodes();
  const normalizedKey = payload.code.trim().toUpperCase();

  // Check if code already exists
  const existingIdx = current.findIndex((c) => c.key.toUpperCase() === normalizedKey);
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  const newCodeItem: GeneratedLicenseKey = {
    key: normalizedKey,
    type: payload.type || `${payload.credits} Tera Jeton`,
    credits: payload.credits,
    customer: payload.customer.trim() || 'Admin Tanımlı Müşteri',
    createdAt: nowStr,
    status: 'BEKLIYOR',
  };

  let updated: GeneratedLicenseKey[];
  if (existingIdx !== -1) {
    updated = [...current];
    updated[existingIdx] = newCodeItem;
  } else {
    updated = [newCodeItem, ...current];
  }

  saveAdminLicenseCodes(updated);
  return newCodeItem;
}

/**
 * Convenience helper to add or approve an order code directly.
 */
export function addOrApproveOrderCode(
  code: string,
  credits: number = 50,
  customer: string = 'Shopier Müşterisi'
): GeneratedLicenseKey {
  return addAdminLicenseCode({
    code,
    type: `${credits} Tera Jeton (Shopier Sipariş No)`,
    credits,
    customer,
  });
}

/**
 * Admin batch generates license keys
 */
export function generateAdminKeysBatch(
  tier: string,
  customerName: string,
  count: number = 1
): GeneratedLicenseKey[] {
  const current = getAdminLicenseCodes();
  const newKeys: GeneratedLicenseKey[] = [];

  let credits = 50;
  let label = '50 Tera Jeton';

  if (tier === '30J') {
    credits = 30;
    label = '30 Tera Jeton';
  } else if (tier === '50J') {
    credits = 50;
    label = '50 Tera Jeton';
  } else if (tier === '100J') {
    credits = 100;
    label = '100 Tera Jeton';
  } else if (tier === '250J') {
    credits = 250;
    label = '250 Tera Jeton (Geniş Saha)';
  } else if (tier === 'VIP') {
    credits = 1000;
    label = '1000 Tera Jeton (VIP Elit)';
  } else if (tier === '30_DAYS') {
    credits = 100;
    label = '30 Günlük Sınırsız Lisans';
  } else if (tier === '1_YEAR') {
    credits = 1200;
    label = '1 Yıllık Tam Saha Lisansı';
  }

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  for (let i = 0; i < count; i++) {
    const r1 = Math.floor(1000 + Math.random() * 9000);
    const r2 = Math.floor(1000 + Math.random() * 9000);
    const key = `TERA-${tier}-${r1}-${r2}-TR`;

    newKeys.push({
      key,
      type: label,
      credits,
      customer: count > 1 ? `${customerName} (#${i + 1})` : customerName,
      createdAt: nowStr,
      status: 'BEKLIYOR',
    });
  }

  const updated = [...newKeys, ...current];
  saveAdminLicenseCodes(updated);
  return newKeys;
}

/**
 * Admin deletes a code from the list
 */
export function deleteAdminLicenseCode(key: string): GeneratedLicenseKey[] {
  const current = getAdminLicenseCodes();
  const filtered = current.filter((c) => c.key.toUpperCase() !== key.toUpperCase());
  saveAdminLicenseCodes(filtered);
  return filtered;
}

export interface ActivationResult {
  success: boolean;
  message: string;
  creditsAdded?: number;
  newBalance?: number;
  codeDetails?: GeneratedLicenseKey;
  updatedUser?: UserProfile;
}

/**
 * Strict Code Verification & Redemption:
 * Users CANNOT enter arbitrary order numbers or codes.
 * The code MUST exist in the admin-approved registry with status 'BEKLIYOR'.
 * Once redeemed:
 *  1. Code status becomes 'KULLANILDI' with user email & timestamp.
 *  2. User tokens are incremented in local state AND directly in Supabase app_users table.
 */
export async function redeemOrderOrLicenseCode(
  rawInput: string,
  user: UserProfile
): Promise<ActivationResult> {
  const cleaned = rawInput.trim().toUpperCase().replace('#', '');
  if (!cleaned) {
    return {
      success: false,
      message: 'Lütfen geçerli bir sipariş numarası veya lisans kodu giriniz.',
    };
  }

  const codes = getAdminLicenseCodes();
  const matched = codes.find(
    (c) => c.key.toUpperCase() === cleaned || c.key.toUpperCase().replace('#', '') === cleaned
  );

  if (!matched) {
    return {
      success: false,
      message: `❌ Geçersiz Kod / Sipariş Numarası! (${rawInput}) sistemde onaylanmış lisanslar arasında bulunamadı. Lütfen yöneticinizden aldığınız veya onaylanan sipariş kodunu giriniz.`,
    };
  }

  if (matched.status === 'KULLANILDI') {
    return {
      success: false,
      message: `⚠️ Bu kod (${matched.key}) daha önce ${matched.usedBy || 'başka bir kullanıcı'} tarafından ${matched.usedAt || 'önceden'} kullanılmıştır! Tekrar kullanılamaz.`,
    };
  }

  // Valid and waiting! Mark as redeemed
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
  matched.status = 'KULLANILDI';
  matched.usedBy = user.email || user.name || 'Kullanıcı';
  matched.usedAt = nowStr;

  saveAdminLicenseCodes(codes);

  // Add credits and VIP points to user
  const creditsToAdd = matched.credits || 50;
  const currentCredits = user.creditsRemaining || 0;
  const newTokens = currentCredits + creditsToAdd;

  const historyItem = {
    id: `ch-${Date.now()}`,
    type: 'ADD' as const,
    amount: creditsToAdd,
    description: `Aktivasyon Kodu (${matched.key}) ile +${creditsToAdd} Jeton Yüklendi`,
    date: nowStr,
  };

  const updatedCreditHistory = [historyItem, ...(user.creditHistory || [])];

  // Check if code grants license duration
  let licenseAction: string | number | null = null;
  const typeUpper = (matched.type || '').toUpperCase();
  const keyUpper = (matched.key || '').toUpperCase();

  if (keyUpper.includes('VIP') || typeUpper.includes('VIP') || typeUpper.includes('SINIRSIZ')) {
    licenseAction = 'SINIRSIZ';
  } else if (keyUpper.includes('1_YEAR') || typeUpper.includes('1 YIL') || typeUpper.includes('YILLIK')) {
    licenseAction = 365;
  } else if (keyUpper.includes('30_DAYS') || typeUpper.includes('30 GÜN') || typeUpper.includes('AYLIK')) {
    licenseAction = 30;
  } else if (typeUpper.includes('LİSANS') || typeUpper.includes('LISANS')) {
    licenseAction = 30;
  }

  let finalLicenseExpires = user.licenseExpires;
  if (licenseAction) {
    if (licenseAction === 'SINIRSIZ') {
      finalLicenseExpires = '2099-12-31T23:59:59.000Z';
    } else if (typeof licenseAction === 'number') {
      const now = new Date();
      let baseDate = now;
      if (user.licenseExpires && !isNaN(new Date(user.licenseExpires).getTime())) {
        const parsed = new Date(user.licenseExpires);
        if (parsed > now) baseDate = parsed;
      }
      baseDate.setDate(baseDate.getDate() + licenseAction);
      finalLicenseExpires = baseDate.toISOString();
    }
  }

  // Update user in local storage + Supabase app_users table
  const updatedUser = updateUserById(user.id, {
    creditsRemaining: newTokens,
    licenseExpires: finalLicenseExpires,
    creditHistory: updatedCreditHistory,
  });

  if (isSupabaseAvailable() && user.email) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const updatePayload: any = { 
        credits: newTokens, 
        tokens: newTokens, 
        credits_remaining: newTokens 
      };
      if (finalLicenseExpires) {
        updatePayload.license_expires = finalLicenseExpires;
      }
      supabase
        .from('app_users')
        .update(updatePayload)
        .eq('email', user.email.toLowerCase().trim())
        .then(() => {});
    }
  }

  const licenseMsg = licenseAction ? ` ve lisansınız aktif edildi!` : '.';

  return {
    success: true,
    message: `🎉 Tebrikler! '${matched.key}' kodlu ${matched.type} başarıyla onaylandı. Hesabınıza +${creditsToAdd} Tera Jeton yüklendi${licenseMsg}`,
    creditsAdded: creditsToAdd,
    newBalance: newTokens,
    codeDetails: matched,
    updatedUser: updatedUser || { ...user, creditsRemaining: newTokens, licenseExpires: finalLicenseExpires },
  };
}
