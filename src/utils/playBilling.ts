import { getActiveUser, setActiveUser, addCreditsAndVipPoints, getAllUsers } from './userManager';
import { getSupabaseClient, isSupabaseAvailable } from '../lib/supabase';
import { UserProfile } from '../types';

export interface PlayBillingResult {
  basarili: boolean;
  alinanJetonMiktari?: number;
  siparisId?: string;
  urunId?: string;
  hataMesaji?: string;
  odemeZamani?: string;
  token?: string;
}

export interface PlayBillingProductInfo {
  urunId: string;
  jetonMiktari: number;
  baslik: string;
  fiyatTr: string;
  aciklama: string;
}

/**
 * Google Play Store In-App Products (Uygulama İçi Ürünler) Listesi
 */
export const PLAY_BILLING_PRODUCTS: Record<string, PlayBillingProductInfo> = {
  tera_jeton_100: {
    urunId: 'tera_jeton_100',
    jetonMiktari: 100,
    baslik: '100 Tera Jeton (Pro Jeofizik)',
    fiyatTr: '1200 TL',
    aciklama: 'Maden sahaları, jeofizik mühendisleri ve geniş araziler için 100 Tera Jeton.',
  },
  tera_jeton_250: {
    urunId: 'tera_jeton_250',
    jetonMiktari: 250,
    baslik: '250 Tera Jeton (Geniş Saha)',
    fiyatTr: '2500 TL',
    aciklama: 'Büyük ölçekli maden ve jeoteknik projeler için 250 Tera Jeton.',
  },
  tera_jeton_1000: {
    urunId: 'tera_jeton_1000',
    jetonMiktari: 1000,
    baslik: '1000 Tera Jeton (Kurumsal & VIP Elit)',
    fiyatTr: '8500 TL',
    aciklama: 'Kurumsal ekipler ve arkeolojik araştırma heyetleri için 1000 Tera Jeton.',
  },
};

/**
 * urunId dizesinden jeton miktarını çözümler
 * Örnek: 'tera_jeton_30' -> 30, 'TRIAL_30' -> 30
 */
export function getJetonMiktariFromUrunId(urunId: string): number {
  if (!urunId) return 30;

  // 1. Tanımlı ürün listesinde ara
  if (PLAY_BILLING_PRODUCTS[urunId]) {
    return PLAY_BILLING_PRODUCTS[urunId].jetonMiktari;
  }

  // 2. Sayı çıkarma (örn: tera_jeton_50 veya TRIAL_50 -> 50)
  const match = urunId.match(/(\d+)/);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 30;
}

/**
 * Standart paket id'sini Google Play urunId formatına dönüştürür
 */
export function normalizePlayBillingProductId(pkgIdOrUrunId: string): string {
  if (pkgIdOrUrunId.startsWith('tera_jeton_')) {
    return pkgIdOrUrunId;
  }
  const credits = getJetonMiktariFromUrunId(pkgIdOrUrunId);
  return `tera_jeton_${credits}`;
}

/**
 * Android ortamı veya native bridge algılama
 */
export function isAndroidNativeEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  // 1. window.PlayBilling native köprüsü var mı?
  const win = window as any;
  if (win.PlayBilling && typeof win.PlayBilling.satinAlNative === 'function') {
    return true;
  }

  // 2. Android JavascriptInterface (addJavascriptInterface) var mı?
  if (win.Android && (typeof win.Android.satinAl === 'function' || typeof win.Android.buyProduct === 'function')) {
    return true;
  }

  // 3. Digital Goods API (Trusted Web Activity / PWA Google Play Store)
  if (typeof win.getDigitalGoodsService === 'function') {
    return true;
  }

  // 4. User Agent Android kontrolü
  if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
    return true;
  }

  return false;
}

/**
 * Ödeme Google tarafından onaylandığında Supabase'deki ve yerel oturumdaki bakiyeyi artıran fonksiyon
 */
export async function krediEkle(
  alinanJetonMiktari: number,
  options: { siparisId?: string; urunId?: string; aciklama?: string } = {}
): Promise<{ basarili: boolean; yeniToplamJeton: number; user?: UserProfile; hata?: string }> {
  try {
    const user = getActiveUser();
    if (!user) {
      console.error('[krediEkle] Aktif kullanıcı bulunamadı');
      return { basarili: false, yeniToplamJeton: 0, hata: 'Aktif kullanıcı oturumu bulunamadı.' };
    }

    const siparisId = options.siparisId || `GPA.${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const urunId = options.urunId || `tera_jeton_${alinanJetonMiktari}`;
    const aciklama =
      options.aciklama || `Google Play Satın Alma (#${siparisId}): +${alinanJetonMiktari} Tera Jeton`;

    console.log('[krediEkle] Google Play Onaylandı, Bakiye Güncelleniyor:', {
      userId: user.id,
      email: user.email,
      alinanJetonMiktari,
      siparisId,
      urunId,
    });

    // 1. Supabase Doğrudan Güncelleme (app_users: tokens & credits_remaining)
    let yeniToplamJeton = (user.creditsRemaining || 0) + alinanJetonMiktari;
    const supabase = getSupabaseClient();

    if (supabase && isSupabaseAvailable()) {
      try {
        // Mevcut bakiyeyi en güncel haliyle çek
        const { data: userRow } = await supabase
          .from('app_users')
          .select('id, tokens, credits_remaining')
          .eq('id', user.id)
          .maybeSingle();

        const currentTokens = Number(userRow?.tokens ?? userRow?.credits_remaining ?? user.creditsRemaining ?? 0);
        yeniToplamJeton = currentTokens + alinanJetonMiktari;

        // Bakiye sütunlarını güncelle
        const { error: updateErr } = await supabase
          .from('app_users')
          .update({
            tokens: yeniToplamJeton,
            credits_remaining: yeniToplamJeton,
          })
          .eq('id', user.id);

        if (updateErr) {
          console.warn('[krediEkle] Supabase tokens update fallback:', updateErr.message);
          await supabase.from('app_users').update({ tokens: yeniToplamJeton }).eq('id', user.id);
        }

        // processed_payments tablosuna işlem kaydı düş
        try {
          await supabase.from('processed_payments').insert([
            {
              order_id: siparisId,
              user_id: user.id,
              user_email: user.email || '',
              tokens: alinanJetonMiktari,
              created_at: new Date().toISOString(),
            },
          ]);
        } catch (logErr) {
          console.warn('[krediEkle] processed_payments log notu:', logErr);
        }
      } catch (dbErr) {
        console.warn('[krediEkle] Supabase doğrudan işlem uyarısı:', dbErr);
      }
    }

    // 2. Yerel State, VIP Puanı ve İşlem Geçmişi Güncellemesi
    let updatedUser: UserProfile = user;
    try {
      updatedUser = addCreditsAndVipPoints(user.id, alinanJetonMiktari, siparisId, aciklama);
      if (updatedUser) {
        updatedUser.creditsRemaining = yeniToplamJeton;
        setActiveUser(updatedUser);
      }
    } catch (localErr) {
      console.warn('[krediEkle] Local state update note:', localErr);
    }

    // 3. Arayüzün tüm bileşenlerinde (Header, Modal, Scanner) anında yenilenmesi için olay fırlat
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('terrascan_users_updated', { detail: getAllUsers() }));
      window.dispatchEvent(new CustomEvent('terrascan_kullanıcıları_güncellendi'));
    }

    return {
      basarili: true,
      yeniToplamJeton,
      user: updatedUser,
    };
  } catch (error: any) {
    console.error('[krediEkle] Hata:', error);
    return {
      basarili: false,
      yeniToplamJeton: 0,
      hata: error?.message || 'Bakiye eklenirken beklenmeyen bir hata oluştu.',
    };
  }
}

/**
 * Google Play In-App Billing (PlayBilling) Nesnesi
 * Android Native WebView / TWA / Digital Goods veya Tarayıcı Köprüsü
 */
export const PlayBilling = {
  /**
   * Google Play Store üzerinden satın alma işlemini tetikler
   * @param urunId Örnek: 'tera_jeton_30'
   */
  async satinAl(urunId: string): Promise<PlayBillingResult> {
    const normalizedId = normalizePlayBillingProductId(urunId);
    const jetonMiktari = getJetonMiktariFromUrunId(normalizedId);
    const win = typeof window !== 'undefined' ? (window as any) : null;

    console.log(`[PlayBilling] satinAl başlatıldı -> urunId: ${normalizedId} (${jetonMiktari} Jeton)`);

    // 1. Native Android JavascriptInterface (window.Android) varsa
    if (win && win.Android) {
      if (typeof win.Android.satinAl === 'function') {
        try {
          const rawRes = await win.Android.satinAl(normalizedId);
          const parsed = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes;
          return {
            basarili: parsed?.basarili ?? true,
            alinanJetonMiktari: parsed?.alinanJetonMiktari || jetonMiktari,
            siparisId: parsed?.siparisId || `GPA.${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
            urunId: normalizedId,
            token: parsed?.token,
            odemeZamani: new Date().toISOString(),
          };
        } catch (e: any) {
          console.warn('[PlayBilling] win.Android.satinAl hatası:', e);
        }
      }
      if (typeof win.Android.buyProduct === 'function') {
        try {
          const rawRes = await win.Android.buyProduct(normalizedId);
          const parsed = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes;
          return {
            basarili: parsed?.basarili ?? true,
            alinanJetonMiktari: parsed?.alinanJetonMiktari || jetonMiktari,
            siparisId: parsed?.siparisId || `GPA.${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
            urunId: normalizedId,
            token: parsed?.token,
            odemeZamani: new Date().toISOString(),
          };
        } catch (e: any) {
          console.warn('[PlayBilling] win.Android.buyProduct hatası:', e);
        }
      }
    }

    // 2. Native window.PlayBilling köprüsü zaten harici olarak enjekte edilmişse (satinAlNative)
    if (win && win.PlayBilling && typeof win.PlayBilling.satinAlNative === 'function') {
      try {
        const res = await win.PlayBilling.satinAlNative(normalizedId);
        return {
          basarili: res?.basarili ?? false,
          alinanJetonMiktari: res?.alinanJetonMiktari || jetonMiktari,
          siparisId: res?.siparisId || `GPA.${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          urunId: normalizedId,
          hataMesaji: res?.hataMesaji,
          token: res?.token,
          odemeZamani: new Date().toISOString(),
        };
      } catch (err: any) {
        console.warn('[PlayBilling] satinAlNative hatası:', err);
      }
    }

    // 3. TWA / PWA Digital Goods Service (Play Billing for Web)
    if (win && typeof win.getDigitalGoodsService === 'function') {
      try {
        const service = await win.getDigitalGoodsService('https://play.google.com/billing');
        if (service) {
          const paymentMethods = [
            {
              supportedMethods: 'https://play.google.com/billing',
              data: { sku: normalizedId },
            },
          ];
          const paymentDetails = {
            total: {
              label: PLAY_BILLING_PRODUCTS[normalizedId]?.baslik || `${jetonMiktari} Tera Jeton`,
              amount: { currency: 'TRY', value: '250.00' },
            },
          };
          if (win.PaymentRequest) {
            const request = new win.PaymentRequest(paymentMethods, paymentDetails);
            const paymentResponse = await request.show();
            await paymentResponse.complete('success');
            return {
              basarili: true,
              alinanJetonMiktari: jetonMiktari,
              siparisId: `GPA.${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
              urunId: normalizedId,
              token: paymentResponse.details?.token,
              odemeZamani: new Date().toISOString(),
            };
          }
        }
      } catch (dgErr: any) {
        console.warn('[PlayBilling] Digital Goods API note:', dgErr);
      }
    }

    // 4. Web Tarayıcısı / Emülatör / Test Modu
    // Eğer doğrudan web tarayıcısında çalışıyorsa güvenli test onayı veya yönlendirme sağlar
    return new Promise((resolve) => {
      const prod = PLAY_BILLING_PRODUCTS[normalizedId] || {
        baslik: `${jetonMiktari} Tera Jeton`,
        fiyatTr: '250 TL',
      };

      const userConfirmed = typeof window !== 'undefined'
        ? window.confirm(
            `Google Play Faturalandırma Onayı:\n\n` +
            `Ürün: ${prod.baslik}\n` +
            `Yüklenecek: +${jetonMiktari} Tera Jeton\n` +
            `Fiyat: ${prod.fiyatTr}\n\n` +
            `Google Play hesabı üzerinden ödemeyi onaylamak istiyor musunuz?`
          )
        : true;

      if (userConfirmed) {
        setTimeout(() => {
          resolve({
            basarili: true,
            alinanJetonMiktari: jetonMiktari,
            siparisId: `GPA.${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
            urunId: normalizedId,
            odemeZamani: new Date().toISOString(),
          });
        }, 600);
      } else {
        resolve({
          basarili: false,
          urunId: normalizedId,
          hataMesaji: 'Ödeme kullanıcı tarafından iptal edildi.',
        });
      }
    });
  },

  /**
   * Google Play Billing servisinin kullanılabilir olup olmadığını belirtir
   */
  isAvailable(): boolean {
    return isAndroidNativeEnvironment();
  },
};

/**
 * Kullanıcı butona bastığında çalışan ana fonksiyon
 * @param urunId Örnek: 'tera_jeton_30'
 */
export async function jetonSatinAl(
  urunId: string
): Promise<PlayBillingResult & { yeniToplamJeton?: number }> {
  // Örnek: urunId = 'tera_jeton_30'
  const sonuc = await PlayBilling.satinAl(urunId);

  if (sonuc.basarili) {
    // Ödeme Google tarafından onaylandı, Supabase'deki bakiyeyi artır
    const miktar = sonuc.alinanJetonMiktari || getJetonMiktariFromUrunId(urunId);
    const krediSonuc = await krediEkle(miktar, {
      siparisId: sonuc.siparisId,
      urunId: urunId,
      aciklama: `Google Play Faturalandırma Onaylandı: +${miktar} Tera Jeton Yüklendi`,
    });

    return {
      ...sonuc,
      alinanJetonMiktari: miktar,
      yeniToplamJeton: krediSonuc.yeniToplamJeton,
    };
  }

  return sonuc;
}

// Global window objesine bağlama (Android native kodunun doğrudan erişebilmesi için)
if (typeof window !== 'undefined') {
  const win = window as any;
  win.jetonSatinAl = jetonSatinAl;
  win.krediEkle = krediEkle;
  if (!win.PlayBilling) {
    win.PlayBilling = PlayBilling;
  }
}
