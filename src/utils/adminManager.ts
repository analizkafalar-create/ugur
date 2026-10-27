/**
 * TerraScan AI - Admin Operations & Dashboard Controller
 * Operasyonel Yönetici Kontrol Merkezi ve Güvenlik Yönetimi
 */

import { SystemScanLog, SecurityAndApiLog, GeneratedLicenseKey, UserProfile } from '../types';
import { getAllUsers, saveAllUsers, updateUser, getActiveUser } from './userManager';

// Master Server PIN (Yüksek güvenlikli sunucu yetkilendirme anahtarı)
export const MASTER_SERVER_PIN = '35628872566527-tr';
export const VALID_SERVER_PINS = ['35628872566527-tr', '1923', '1453', 'admin'];
const ADMIN_AUTH_SESSION_KEY = 'terrascan_admin_auth_active';
const ADMIN_CUSTOM_PIN_KEY = 'terrascan_admin_custom_pin';
const SCAN_LOGS_STORAGE_KEY = 'terrascan_admin_scan_logs';
const SECURITY_LOGS_STORAGE_KEY = 'terrascan_admin_sec_logs';
const GENERATED_KEYS_STORAGE_KEY = 'terrascan_admin_license_keys';

/**
 * Kullanıcının rol veya yetkisinin ADMIN olup olmadığını doğrular.
 * Oturumda PIN doğrulanmışsa veya kullanıcı ADMIN rütbesinde ise true döner.
 */
export function isUserAdmin(user?: UserProfile | null): boolean {
  // Eğer geçerli oturumda PIN doğrulaması yapılmışsa tam yetkili sayılır
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) === 'true') {
    return true;
  }
  const targetUser = user || getActiveUser();
  if (!targetUser) return false;
  const role = String(targetUser.role || '').toUpperCase();
  const rank = String(targetUser.rank || '').toUpperCase();
  const email = String(targetUser.email || '').toLowerCase().trim();
  return (
    role === 'ADMIN' ||
    rank === 'ADMIN' ||
    email === 'admin@terrascan.org' ||
    email === 'analizkafalar@gmail.com' ||
    email.includes('analizkafalar')
  );
}

/**
 * Verify Server PIN
 * Sunucu PIN'ini doğrular:
 * - 35628872566527-tr (Güncel Ana Sunucu PIN'i)
 * - 1923 veya 1453 (Varsayılan Hızlı Yetki PIN'leri)
 * - 'admin'
 * - Kullanıcının ayarladığı özel PIN
 */
export function verifyAdminPin(enteredPin: string): boolean {
  if (!enteredPin) return false;
  const trimmed = enteredPin.trim();
  const customPin = localStorage.getItem(ADMIN_CUSTOM_PIN_KEY) || localStorage.getItem('terrascan_admin_pin');
  
  if (
    trimmed === MASTER_SERVER_PIN ||
    trimmed === '35628872566527-tr' ||
    trimmed === '1923' ||
    trimmed === '1453' ||
    trimmed === 'admin' ||
    (customPin && trimmed === customPin)
  ) {
    sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, 'true');
    logSecurityEvent('INFO', 'AUTH', '127.0.0.1', 'Web', 'Başarılı Sunucu Masası Girişi (Admin PIN Doğrulandı)');
    return true;
  }

  logSecurityEvent('SECURITY', 'AUTH', '127.0.0.1', 'Web', 'Başarısız Sunucu Masası Giriş Denemesi (Hatalı PIN)');
  return false;
}

export function isAdminAuthenticated(user?: UserProfile | null): boolean {
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) === 'true') {
    return true;
  }
  const u = user || getActiveUser();
  if (u) {
    const email = String(u.email || '').toLowerCase().trim();
    if (
      email === 'admin@terrascan.org' ||
      email === 'analizkafalar@gmail.com' ||
      email.includes('analizkafalar') ||
      u.role === 'ADMIN'
    ) {
      return true;
    }
  }
  return false;
}

export function logoutAdmin(): void {
  sessionStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
}

export function updateCustomAdminPin(currentPin: string, newPin: string): { success: boolean; message: string } {
  if (!verifyAdminPin(currentPin)) {
    return { success: false, message: 'Mevcut PIN kodu hatalı!' };
  }
  if (!newPin || newPin.length < 6) {
    return { success: false, message: 'Yeni PIN kodu en az 6 karakter olmalıdır.' };
  }
  localStorage.setItem(ADMIN_CUSTOM_PIN_KEY, newPin.trim());
  logSecurityEvent('INFO', 'AUTH', '85.105.12.44', 'Web', 'Yönetici Güvenlik PIN Kodu Başarıyla Değiştirildi');
  return { success: true, message: 'Sunucu PIN kodu başarıyla güncellendi.' };
}

// Initial Telemetry & Field Scan Records
const INITIAL_SCAN_LOGS: SystemScanLog[] = [
  {
    id: 'scan-log-101',
    userId: 'usr-analiz-2026',
    userName: 'Analiz Uzmanı',
    userEmail: 'analizkafalar@gmail.com',
    locationName: 'Uşak Jeofizik ve Zemin Araştırma Sahası',
    coordinates: { lat: 38.477309, lng: 29.728954 },
    anomalyType: 'CAVITY',
    depthMeters: 2.8,
    confidenceScore: 9.4,
    scanMode: 'SAR_VELD',
    satelliteName: 'Sentinel-2B Multi-Spectral',
    timestamp: '2026-09-12 12:15:30',
  },
  {
    id: 'scan-log-102',
    userId: 'user-demo',
    userName: 'Ahmet Yılmaz',
    userEmail: 'ahmet.yilmaz@gmail.com',
    locationName: 'Denizli / Honaz Masif Temel Alanı',
    coordinates: { lat: 37.7592, lng: 29.2614 },
    anomalyType: 'STRUCTURE',
    depthMeters: 3.4,
    confidenceScore: 8.9,
    scanMode: 'GPR_PULSE',
    satelliteName: 'TerraSAR-X High-Res SAR',
    timestamp: '2026-09-12 11:42:10',
  },
  {
    id: 'scan-log-103',
    userId: 'usr-analiz-2026',
    userName: 'Analiz Uzmanı',
    userEmail: 'analizkafalar@gmail.com',
    locationName: 'İzmir / Bergama Antik Teras Temelleri',
    coordinates: { lat: 39.1221, lng: 27.1812 },
    anomalyType: 'METAL',
    depthMeters: 1.9,
    confidenceScore: 9.6,
    scanMode: 'MAGNETIC_GRADIENT',
    satelliteName: 'ALOS-2 PALSAR L-Band',
    timestamp: '2026-09-12 09:20:45',
  },
  {
    id: 'scan-log-104',
    userId: 'usr-saha-34',
    userName: 'Mustafa Çelik',
    userEmail: 'mustafa.celik34@gmail.com',
    locationName: 'Konya / Karapınar Obruk Jeofizik Dehlizi',
    coordinates: { lat: 37.7125, lng: 33.5518 },
    anomalyType: 'CAVITY',
    depthMeters: 4.6,
    confidenceScore: 9.1,
    scanMode: 'SAR_VELD',
    satelliteName: 'Sentinel-2B Multi-Spectral',
    timestamp: '2026-09-11 18:05:12',
  },
  {
    id: 'scan-log-105',
    userId: 'usr-saha-58',
    userName: 'Kemal Öztürk',
    userEmail: 'kemal.ozturk@hotmail.com',
    locationName: 'Bursa / İznik Göl Sahili Taş Sarnıç Yapısı',
    coordinates: { lat: 40.4286, lng: 29.7214 },
    anomalyType: 'STRUCTURE',
    depthMeters: 2.2,
    confidenceScore: 8.7,
    scanMode: 'RESISTIVITY_ERT',
    satelliteName: 'EnMAP Hyper-Spectral',
    timestamp: '2026-09-11 14:33:20',
  },
  {
    id: 'scan-log-106',
    userId: 'usr-saha-07',
    userName: 'Serkan Arslan',
    userEmail: 'serkan.arslan.antalya@gmail.com',
    locationName: 'Antalya / Alanya Yamaç Kireçtaşı Boşluğu',
    coordinates: { lat: 36.5438, lng: 31.9998 },
    anomalyType: 'MINERAL',
    depthMeters: 1.4,
    confidenceScore: 7.9,
    scanMode: 'SAR_VELD',
    satelliteName: 'Sentinel-2B Multi-Spectral',
    timestamp: '2026-09-11 10:14:02',
  },
];

// Initial Security and System Diagnostic Logs
const INITIAL_SECURITY_LOGS: SecurityAndApiLog[] = [
  {
    id: 'log-sec-1',
    timestamp: '2026-09-12 12:35:14',
    level: 'INFO',
    category: 'AUTH',
    ip: '85.105.44.12',
    platform: 'Android APK',
    message: 'Kullanıcı giriş yaptı: analizkafalar@gmail.com (APK v1.4 - SM-G998B)',
  },
  {
    id: 'log-sec-2',
    timestamp: '2026-09-12 12:28:40',
    level: 'WARN',
    category: 'RATE_LIMIT',
    ip: '176.240.112.9',
    platform: 'Web',
    message: 'Yüksek frekanslı koordinat sorgulaması tespit edildi (42 istek / dk)',
  },
  {
    id: 'log-sec-3',
    timestamp: '2026-09-12 12:12:05',
    level: 'ERROR',
    category: 'DEM_TERRAIN',
    ip: '194.27.18.52',
    platform: 'Android APK',
    message: 'DEM SRTM v3.0 raster karo indirilirken zaman aşımı (yeniden denendi: başarılı)',
  },
  {
    id: 'log-sec-4',
    timestamp: '2026-09-12 11:45:22',
    level: 'SECURITY',
    category: 'AUTH',
    ip: '46.197.88.201',
    platform: 'REST API',
    message: 'Yetkisiz Lisans Anahtarı Denemesi (403 Forbidden - Geçersiz Format)',
  },
  {
    id: 'log-sec-5',
    timestamp: '2026-09-12 10:15:00',
    level: 'INFO',
    category: 'SATELLITE_FEED',
    ip: '10.0.4.1',
    platform: 'REST API',
    message: 'ESA Copernicus Sentinel Hub ve DLR TerraSAR-X efemeris yörünge senkronizasyonu tamamlandı.',
  },
  {
    id: 'log-sec-6',
    timestamp: '2026-09-12 08:50:33',
    level: 'SECURITY',
    category: 'AUTH',
    ip: '185.220.101.5',
    platform: 'Web',
    message: 'Başarısız Oturum Denemesi: Şüpheli IP bloğu (3 kez yanlış parola girildi)',
  },
];

export function getScanLogs(): SystemScanLog[] {
  try {
    const raw = localStorage.getItem(SCAN_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading scan logs', e);
  }
  localStorage.setItem(SCAN_LOGS_STORAGE_KEY, JSON.stringify(INITIAL_SCAN_LOGS));
  return INITIAL_SCAN_LOGS;
}

export function addScanLog(log: Omit<SystemScanLog, 'id' | 'timestamp'>): void {
  const current = getScanLogs();
  const newLog: SystemScanLog = {
    ...log,
    id: `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
  };
  const updated = [newLog, ...current].slice(0, 200);
  localStorage.setItem(SCAN_LOGS_STORAGE_KEY, JSON.stringify(updated));
}

export function getSecurityLogs(): SecurityAndApiLog[] {
  try {
    const raw = localStorage.getItem(SECURITY_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading security logs', e);
  }
  localStorage.setItem(SECURITY_LOGS_STORAGE_KEY, JSON.stringify(INITIAL_SECURITY_LOGS));
  return INITIAL_SECURITY_LOGS;
}

export function logSecurityEvent(
  level: SecurityAndApiLog['level'],
  category: SecurityAndApiLog['category'],
  ip: string,
  platform: SecurityAndApiLog['platform'],
  message: string,
  details?: string
): void {
  const current = getSecurityLogs();
  const newLog: SecurityAndApiLog = {
    id: `sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    level,
    category,
    ip,
    platform,
    message,
    details,
  };
  const updated = [newLog, ...current].slice(0, 300);
  localStorage.setItem(SECURITY_LOGS_STORAGE_KEY, JSON.stringify(updated));
}

export function clearSecurityLogs(): void {
  localStorage.setItem(SECURITY_LOGS_STORAGE_KEY, JSON.stringify([]));
}

// =========================================================================
// LICENSE & PROMO KEY GENERATOR
// =========================================================================
export { 
  getAdminLicenseCodes as getGeneratedLicenseKeys, 
  generateAdminKeysBatch as generateKeysBatch, 
  deleteAdminLicenseCode 
} from './activationCodes';


// =========================================================================
// CSV / EXCEL EXPORT HELPER (UTF-8 with BOM for Turkish Characters)
// =========================================================================
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const bom = '\uFEFF';
  const csvContent =
    bom +
    [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(';'),
      ...rows.map((row) =>
        row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(';')
      ),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
