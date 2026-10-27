/**
 * TerraScan - Unique Device Fingerprint & Signature Engine
 * Generates a stable, tamper-resistant device signature based on hardware,
 * canvas rendering, display traits, and persistent identifier storage.
 */

const LOCAL_STORAGE_DEVICE_KEY = 'terrascan_hardware_device_signature_v1';
const LOCAL_STORAGE_CLAIMED_KEY = 'terrascan_device_claimed_v1';

/**
 * Fast string hashing algorithm (djb2 + sdbm combined to 64-bit hex)
 * Used as fallback or fast synchronous hash.
 */
function fastHash(str: string): string {
  let hash1 = 5381;
  let hash2 = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = char + (hash2 << 6) + (hash2 << 16) - hash2;
  }
  const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const h2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `${h1}${h2}`.toUpperCase();
}

/**
 * Creates a unique canvas fingerprint by drawing shapes and text off-screen.
 */
function getCanvasFingerprint(): string {
  if (typeof document === 'undefined') return 'server_render';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no_2d_ctx';

    // Canvas styling & rendering
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', sans-serif";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.fillText('TerraScan-Radar,2863', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('TerraScan-Radar,2863', 4, 17);

    return fastHash(canvas.toDataURL());
  } catch {
    return 'canvas_error';
  }
}

/**
 * Retrieves WebGL vendor and renderer strings if available.
 */
function getWebGLFingerprint(): string {
  if (typeof document === 'undefined') return 'server';
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'no_webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'no_debug_info';

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    return fastHash(`${vendor}~${renderer}`);
  } catch {
    return 'webgl_err';
  }
}

/**
 * Gets or creates a persistent device UUID stored in browser localStorage.
 */
function getPersistentDeviceUUID(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'srv-uuid';
  }
  try {
    let existing = localStorage.getItem(LOCAL_STORAGE_DEVICE_KEY);
    if (!existing || existing.length < 10) {
      const randomPart = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      existing = `UUID-${randomPart.toUpperCase()}`;
      localStorage.setItem(LOCAL_STORAGE_DEVICE_KEY, existing);
    }
    return existing;
  } catch {
    return 'uuid_fallback';
  }
}

/**
 * Computes a unique, hardware-grounded device signature string.
 * Example output: "DEV-8F92A1B4C3E7D012"
 */
export async function getDeviceSignature(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'DEV-SERVER-INSTANCE';
  }

  try {
    const persistentUUID = getPersistentDeviceUUID();
    const nav = window.navigator || ({} as any);
    const screen = window.screen || ({} as any);

    const screenData = `${screen.width || 0}x${screen.height || 0}x${screen.colorDepth || 0}@${window.devicePixelRatio || 1}`;
    const navData = `${nav.userAgent || ''}|${nav.language || ''}|${nav.platform || ''}|${nav.hardwareConcurrency || 0}|${(nav as any).deviceMemory || 0}|${nav.maxTouchPoints || 0}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const canvasHash = getCanvasFingerprint();
    const webglHash = getWebGLFingerprint();

    const rawSignature = [
      persistentUUID,
      screenData,
      navData,
      timeZone,
      canvasHash,
      webglHash,
    ].join('###');

    // Generate SHA-256 digest if Web Crypto API is available
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      try {
        const msgBuffer = new TextEncoder().encode(rawSignature);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hexHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        return `DEV-${hexHash.substring(0, 24)}`;
      } catch {
        // Fallback to fastHash
      }
    }

    const fallbackHash = fastHash(rawSignature);
    return `DEV-${fallbackHash}`;
  } catch (err) {
    console.warn('[deviceFingerprint] Error calculating signature:', err);
    return `DEV-${getPersistentDeviceUUID()}`;
  }
}

export async function generateDeviceSignature(): Promise<{
  deviceSignature: string;
  deviceModel: string;
  deviceInfo: Record<string, any>;
}> {
  const deviceSignature = await getDeviceSignature();
  
  let deviceModel = 'Web İstemcisi';
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) {
      const match = ua.match(/Android\s+([\d.]+);\s+([^;)]+)/i);
      deviceModel = match ? `Android (${match[2].trim()})` : 'Android Cihazı';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      deviceModel = /ipad/i.test(ua) ? 'Apple iPad' : 'Apple iPhone';
    } else if (/macintosh|mac os x/i.test(ua)) {
      deviceModel = 'macOS İş İstasyonu';
    } else if (/windows/i.test(ua)) {
      deviceModel = 'Windows Masaüstü / Laptop';
    } else if (/linux/i.test(ua)) {
      deviceModel = 'Linux İş İstasyonu';
    }
  }

  return {
    deviceSignature,
    deviceModel,
    deviceInfo: {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Web',
      language: typeof navigator !== 'undefined' ? navigator.language : 'tr',
    },
  };
}

/**
 * Synchronous version for instant rendering/logging where async cannot be awaited.
 */
export function getDeviceSignatureSync(): string {
  if (typeof window === 'undefined') return 'DEV-SERVER';
  try {
    const persistentUUID = getPersistentDeviceUUID();
    const nav = window.navigator || ({} as any);
    const screen = window.screen || ({} as any);
    const screenData = `${screen.width || 0}x${screen.height || 0}x${screen.colorDepth || 0}@${window.devicePixelRatio || 1}`;
    const navData = `${nav.userAgent || ''}|${nav.language || ''}|${nav.platform || ''}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const canvasHash = getCanvasFingerprint();

    const raw = `${persistentUUID}#${screenData}#${navData}#${timeZone}#${canvasHash}`;
    return `DEV-${fastHash(raw).substring(0, 20)}`;
  } catch {
    return `DEV-${getPersistentDeviceUUID()}`;
  }
}

/**
 * Checks local storage cache if this device has already claimed trial credits.
 */
export function isDeviceLocallyClaimed(deviceSignature: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_CLAIMED_KEY}_${deviceSignature}`);
    return raw === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks device as claimed in local storage cache.
 */
export function markDeviceLocallyClaimed(deviceSignature: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_CLAIMED_KEY}_${deviceSignature}`, 'true');
    localStorage.setItem(LOCAL_STORAGE_CLAIMED_KEY, 'true');
  } catch {}
}
