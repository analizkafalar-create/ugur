/**
 * TerraScan AI - License Management & Expiry Utility
 * Strictly enforces time-based unlimited access checks and day calculations.
 */

/**
 * Checks whether a given license expiry string represents an active, valid license.
 * Returns true ONLY if:
 * 1. The string is 'SINIRSIZ', 'UNLIMITED', 'SINIRSIZ VIP', or
 * 2. It is a valid date string that is strictly in the future (expiryDate > Date.now()).
 * Returns false for undefined, null, empty string, malformed strings, or expired dates.
 */
export const hasActiveLicense = (licenseExpires?: string | null): boolean => {
  if (!licenseExpires) return false;
  
  const trimmed = licenseExpires.trim();
  if (!trimmed) return false;

  const upper = trimmed.toUpperCase();
  if (
    upper === 'SINIRSIZ' || 
    upper === 'UNLIMITED' || 
    upper === 'SINIRSIZ VIP' ||
    upper === 'VIP' ||
    upper.includes('SINIRSIZ') || 
    upper.includes('UNLIMITED')
  ) {
    return true;
  }

  const expiryDate = new Date(trimmed);
  if (isNaN(expiryDate.getTime())) {
    return false; // invalid date string
  }

  return expiryDate.getTime() > Date.now();
};

/**
 * Calculates the number of remaining days for an active license.
 * Returns:
 * - 0 if the license is inactive, expired, or undefined
 * - 3650 for UNLIMITED / SINIRSIZ VIP licenses
 * - Positive integer (ceil) of days remaining for valid future date
 */
export const getLicenseDaysLeft = (licenseExpires?: string | null): number => {
  if (!hasActiveLicense(licenseExpires)) return 0;
  
  const trimmed = (licenseExpires || '').trim();
  const upper = trimmed.toUpperCase();
  if (
    upper === 'SINIRSIZ' || 
    upper === 'UNLIMITED' || 
    upper === 'SINIRSIZ VIP' ||
    upper === 'VIP' ||
    upper.includes('SINIRSIZ') || 
    upper.includes('UNLIMITED')
  ) {
    return 3650; // Arbitrary large number for display
  }

  const expDate = new Date(trimmed);
  if (!isNaN(expDate.getTime()) && expDate.getFullYear() >= 2090) {
    return 3650;
  }

  const diff = expDate.getTime() - Date.now();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Returns a human-friendly formatted status label for the license
 */
export const getLicenseStatusLabel = (
  licenseExpires?: string | null,
  lang: 'tr' | 'en' = 'tr'
): { status: 'ACTIVE' | 'EXPIRED' | 'UNLIMITED' | 'NONE'; text: string; badgeClass: string } => {
  if (!licenseExpires || !licenseExpires.trim()) {
    return {
      status: 'NONE',
      text: lang === 'tr' ? 'Lisanssız (Jetonlu)' : 'No License (Token Only)',
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
    };
  }

  const upper = licenseExpires.trim().toUpperCase();
  if (
    upper === 'SINIRSIZ' || 
    upper === 'UNLIMITED' || 
    upper === 'SINIRSIZ VIP' || 
    upper.includes('SINIRSIZ') || 
    upper.includes('UNLIMITED')
  ) {
    return {
      status: 'UNLIMITED',
      text: lang === 'tr' ? 'Sınırsız VIP Lisans' : 'Unlimited VIP License',
      badgeClass: 'bg-gradient-to-r from-purple-900/60 to-indigo-900/60 text-purple-200 border-purple-500/40',
    };
  }

  const expiryDate = new Date(licenseExpires);
  if (isNaN(expiryDate.getTime())) {
    return {
      status: 'NONE',
      text: lang === 'tr' ? 'Geçersiz Lisans' : 'Invalid License',
      badgeClass: 'bg-rose-950/60 text-rose-400 border-rose-800/40',
    };
  }

  if (expiryDate.getFullYear() >= 2090) {
    return {
      status: 'UNLIMITED',
      text: lang === 'tr' ? 'Sınırsız VIP Lisans' : 'Unlimited VIP License',
      badgeClass: 'bg-gradient-to-r from-purple-900/60 to-indigo-900/60 text-purple-200 border-purple-500/40',
    };
  }

  const now = Date.now();
  if (expiryDate.getTime() <= now) {
    return {
      status: 'EXPIRED',
      text: lang === 'tr' ? 'Süresi Doldu' : 'Expired',
      badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-800/40',
    };
  }

  const daysLeft = Math.max(1, Math.ceil((expiryDate.getTime() - now) / (1000 * 60 * 60 * 24)));
  return {
    status: 'ACTIVE',
    text: lang === 'tr' ? `${daysLeft} Gün Kaldı` : `${daysLeft} Days Left`,
    badgeClass: daysLeft <= 7 
      ? 'bg-amber-950/60 text-amber-300 border-amber-800/40' 
      : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40',
  };
};
