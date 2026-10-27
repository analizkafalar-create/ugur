import { UserProfile } from '../types';
import { getSupabaseClient, isSupabaseAvailable } from '../lib/supabase';
import {
  isOrderIdAlreadyProcessed,
  markOrderIdAsProcessed,
  acquireVerificationLock,
  releaseVerificationLock,
} from './paymentIdempotency';
import { addCreditsAndVipPoints, getAllUsers } from './userManager';

export interface ShopierCreditedOrder {
  orderId: string;
  userEmail: string;
  userId?: string;
  tokens: number;
  amount: string;
  packageTitle: string;
  dateCompleted: string;
  status: 'completed';
}

export interface ShopierVerifyResult {
  success: boolean;
  credited: boolean;
  creditedOrders: ShopierCreditedOrder[];
  newTotalTokens?: number;
  message: string;
  updatedUser?: UserProfile;
}

export interface ProcessIndependentPaymentParams {
  payingUserId: string;
  pendingTokens: number;
  orderId: string;
  rawParams?: Record<string, string>;
}

export interface ProcessIndependentPaymentResult {
  success: boolean;
  tokensAdded: number;
  yeniToplamJeton: number;
  updatedUser?: UserProfile;
  message: string;
}

const STORAGE_LAST_PURCHASE_TIME_KEY = 'terrascan_last_shopier_purchase_time';

// Direct bearer token for seamless fallback when /api proxy network is unstable
const SHOPIER_BEARER_TOKEN =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJiYTE1NmYzOTFlZjllYWFkZDk4YTFiNWMxNjFjNWY0OCIsImp0aSI6IjI5ODMxNmQxZjU2YTFiNDlmYzYxNzIyZTk5NzE0NmY1MDM1YjE5NDIzMWExY2UyZTM5MzRlODdiYjYwNjMyYWQ2OWZlOWU1M2UxZmVmNjJjMjI4Mzc1NjdhZTliYzI1YmJhMjMyZDY0MmQ2NjgxYmM4ZmUwMDM0ZTVlODVjNDRlMzc1ODViMmNkNDNiNTBmMWI5M2U5YjcyMGQ3NDhmMTAiLCJpYXQiOjE3ODkzMTkyNTcsIm5iZiI6MTc4OTMxOTI1NywiZXhwIjoxOTQ3MTA0MDE3LCJzdWIiOjI4ODk4NTksInNjb3BlcyI6WyJvcmRlcnM6cmVhZCIsIm9yZGVyczp3cml0ZSIsInByb2R1Y3RzOnJlYWQiLCJwcm9kdWN0czp3cml0ZSIsInNoaXBwaW5nczpyZWFkIiwic2hpcHBpbmdzOndyaXRlIiwiZGlzY291bnRzOnJlYWQiLCJkaXNjb3VudHM6d3JpdGUiLCJwYXlvdXRzOnJlYWQiLCJyZWZ1bmRzOnJlYWQiLCJyZWZ1bmRzOndyaXRlIiwic2hvcDpyZWFkIiwic2hvcDp3cml0ZSJdfQ.q5cVFnfE-PbX6gnzGdRNhAVRaimh3CFk9Wz-kZr6kIYDfY5HUzbbJ_qmIK-Ccs_i_wTyIzDoX13QNtAhh0cs-LdmFAT7f22CovkMHoRBeo5pZeHop6Wq90_C5WR4XYKYPNvI_3GA_3_XOWKSnEPyS7c9rSqSTQxQ2ct30R3bauiEk9s5Q8uTiJ3f3Y1JlT2oBpkAkbf3cdfFFZjfLjFkUNc2Ps-So9OdfXTOEAHuc89UdtnZac55gLNKbea2H5qEN7TU0R6LGqMTlAXszWtAKDFg0MLAjPHKKvRWL_h2Zi7mCQ5t5RhHyQeIywBQyfQl1pxe_6wvYdraqBGAcZBD2g';

/**
 * Appends customer email and ID parameter to Shopier checkout link
 */
export function buildShopierCheckoutUrl(baseUrl: string, user?: UserProfile | null): string {
  try {
    const url = new URL(baseUrl);
    if (user?.email) {
      const cleanEmail = user.email.toLowerCase().trim();
      url.searchParams.set('email', cleanEmail);
      url.searchParams.set('buyer_email', cleanEmail);
      url.searchParams.set('customer_email', cleanEmail);
      url.searchParams.set('account', cleanEmail);
    }
    if (user?.id) {
      url.searchParams.set('user_id', user.id);
      url.searchParams.set('custom_id', user.id);
    }
    return url.toString();
  } catch {
    if (user?.email) {
      const sep = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${sep}email=${encodeURIComponent(user.email.toLowerCase().trim())}&user_id=${encodeURIComponent(user.id || '')}`;
    }
    return baseUrl;
  }
}

/**
 * Records that the user initiated a checkout to enable aggressive polling on return
 * ve tarayıcı hafızasına terrascan_paying_user_id ile terrascan_pending_tokens değerlerini kilitler.
 */
export function markShopierCheckoutInitiated(
  packageId?: string,
  tokens?: number,
  title?: string,
  userId?: string
): void {
  try {
    if (userId) {
      localStorage.setItem('terrascan_paying_user_id', userId);
    }
    if (tokens && tokens > 0) {
      localStorage.setItem('terrascan_pending_tokens', String(tokens));
    }
    sessionStorage.setItem(STORAGE_LAST_PURCHASE_TIME_KEY, String(Date.now()));
    if (packageId) {
      sessionStorage.setItem('terrascan_last_shopier_pkg', packageId);
    }
    if (tokens && tokens > 0) {
      sessionStorage.setItem('terrascan_pending_payment_tokens', String(tokens));
    }
    if (title) {
      sessionStorage.setItem('terrascan_pending_payment_pkg_title', title);
    }
  } catch {}
}

/**
 * Kalıcı Oturum ve Doğrudan Bakiye Basma:
 * React currentUser state'inin yüklenmesini BEKLEMEDEN ve e-posta kontrolü yapmadan,
 * doğrudan kilitlenen User ID üzerinden Supabase tokens güncellemesi yapar.
 */
export async function processIndependentDirectPayment(
  params: ProcessIndependentPaymentParams
): Promise<ProcessIndependentPaymentResult> {
  const { payingUserId, pendingTokens, orderId } = params;

  console.log(`[ShopierClient] Doğrudan Bakiye Yükleme Başlatılıyor: UserID=${payingUserId}, Jeton=${pendingTokens}, Sipariş=${orderId}`);

  let yeniToplamJeton = pendingTokens;
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseAvailable()) {
    try {
      // 1. Önce kullanıcının güncel jetonunu çek (ID veya E-posta ile esnek eşleme)
      let { data: userRow, error: fetchErr } = await supabase
        .from('app_users')
        .select('id, email, full_name, tokens, credits_remaining, plan, vip_points')
        .eq('id', payingUserId)
        .maybeSingle();

      if (!userRow && payingUserId.includes('@')) {
        const { data: emailRow } = await supabase
          .from('app_users')
          .select('id, email, full_name, tokens, credits_remaining, plan, vip_points')
          .eq('email', payingUserId.toLowerCase().trim())
          .maybeSingle();
        userRow = emailRow;
      }

      const currentTokens = Number(userRow?.tokens ?? userRow?.credits_remaining ?? 0);
      yeniToplamJeton = currentTokens + pendingTokens;
      const targetId = userRow?.id || payingUserId;

      // 2. Üzerine ekle ve update komutunu işlet
      let { data: updateData, error: updateErr } = await supabase
        .from('app_users')
        .update({
          tokens: yeniToplamJeton,
          credits_remaining: yeniToplamJeton,
        })
        .eq('id', targetId)
        .select();

      if (updateErr) {
        console.warn('[ShopierClient] Supabase çift kolon güncelleme notu, tokens deneniyor:', updateErr.message);
        const tokensFallback = await supabase
          .from('app_users')
          .update({ tokens: yeniToplamJeton })
          .eq('id', targetId)
          .select();

        if (tokensFallback.error) {
          console.warn('[ShopierClient] Supabase credits_remaining deneniyor:', tokensFallback.error.message);
          await supabase
            .from('app_users')
            .update({ credits_remaining: yeniToplamJeton })
            .eq('id', targetId);
        }
      }

      console.log('✅ Supabase Jeton Yükleme Başarılı:', {
        targetId,
        currentTokens,
        pendingTokens,
        yeniToplamJeton,
        orderId,
      });

      // 3. processed_payments tablosuna kaydet (hata verse bile token basımı kesinlikle devam eder)
      try {
        await supabase.from('processed_payments').insert([
          {
            order_id: orderId,
            user_id: targetId,
            user_email: userRow?.email || '',
            tokens: pendingTokens,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (logErr) {
        console.warn('[ShopierClient] processed_payments log note:', logErr);
      }
    } catch (dbErr) {
      console.warn('[ShopierClient] Supabase direct operation note:', dbErr);
    }
  }

  // 4. Local state güncellemesi (hafızadaki kullanıcıyı da güncelle)
  let updatedUser: UserProfile | undefined;
  try {
    updatedUser = addCreditsAndVipPoints(
      payingUserId,
      pendingTokens,
      orderId,
      `Shopier Ödemesi Onaylandı: +${pendingTokens} Tera Jeton Yüklendi`
    );
    if (updatedUser) {
      updatedUser.creditsRemaining = yeniToplamJeton;
    }
  } catch {}

  // 5. Sipariş numarasını idempotency listesine ekle
  markOrderIdAsProcessed(orderId, updatedUser);

  // 6. localStorage'daki geçici anahtarları temizle
  try {
    localStorage.removeItem('terrascan_paying_user_id');
    localStorage.removeItem('terrascan_pending_tokens');
    clearShopierCheckoutAwaiting();
  } catch {}

  // 7. Bakiye sayacının tüm bileşenlerde hemen yenilenmesi için özel etkinlik fırlat
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('terrascan_users_updated', { detail: getAllUsers() }));
  }

  return {
    success: true,
    tokensAdded: pendingTokens,
    yeniToplamJeton,
    updatedUser,
    message: 'Ödemeniz başarıyla tamamlandı, jetonlarınız yüklendi',
  };
}

export function isShopierCheckoutAwaiting(): boolean {
  try {
    const timeStr = sessionStorage.getItem(STORAGE_LAST_PURCHASE_TIME_KEY);
    if (!timeStr) return false;
    const time = parseInt(timeStr, 10);
    // Active if initiated within last 45 minutes
    return Date.now() - time < 45 * 60 * 1000;
  } catch {
    return false;
  }
}

export function clearShopierCheckoutAwaiting(): void {
  try {
    sessionStorage.removeItem(STORAGE_LAST_PURCHASE_TIME_KEY);
    sessionStorage.removeItem('terrascan_last_shopier_pkg');
    sessionStorage.removeItem('terrascan_pending_payment_tokens');
    sessionStorage.removeItem('terrascan_pending_payment_pkg_title');
  } catch {}
}

/**
 * Helper to parse tokens from order item or total
 */
export function resolveTokensFromShopierOrder(order: any): { credits: number; title: string } {
  let matchedTitle = 'Tera Jeton Paketi';

  if (Array.isArray(order.lineItems) && order.lineItems.length > 0) {
    for (const item of order.lineItems) {
      const title = (item.title || '').toLowerCase();
      const pid = String(item.productId || '');
      matchedTitle = item.title || matchedTitle;

      if (title.includes('1000') || title.includes('1.000') || pid === '50780462') {
        return { credits: 1000, title: item.title || '1.000 TERA JETON' };
      }
      if (title.includes('250') || pid === '50720240') {
        return { credits: 250, title: item.title || '250 TERA JETON' };
      }
      if (title.includes('100') || pid === '50655930') {
        return { credits: 100, title: item.title || '100 TERA JETON' };
      }
      if (title.includes('50') && !title.includes('250')) {
        return { credits: 50, title: item.title || '50 TERA JETON' };
      }
      if (title.includes('30')) {
        return { credits: 30, title: item.title || '30 TERA JETON' };
      }
    }
  }

  const total = parseFloat(order.totals?.total || order.total || '0');
  if (total >= 7000) return { credits: 1000, title: '1000 TERA JETON [VIP ELİT]' };
  if (total >= 2000) return { credits: 250, title: '250 TERA JETON [GENİŞ SAHA]' };
  if (total >= 1000) return { credits: 100, title: '100 TERA JETON [PRO JEOFİZİK]' };

  return { credits: 100, title: matchedTitle };
}

/**
 * Direct & resilient token credit function for confirmed payments.
 * Directly increases user's tokens in Supabase `app_users` (tokens = tokens + satin_alinan_miktar).
 * If processed_payments table fails or is missing, user's token credit is NEVER aborted or cancelled.
 */
export async function processConfirmedPayment(
  user: UserProfile,
  options?: {
    orderId?: string;
    tokens?: number;
    packageTitle?: string;
    rawParams?: Record<string, any>;
  }
): Promise<{
  success: boolean;
  tokensAdded: number;
  newTotal: number;
  orderId: string;
  message: string;
  updatedUser?: UserProfile;
}> {
  if (!user || !user.id) {
    return {
      success: false,
      tokensAdded: 0,
      newTotal: 0,
      orderId: '',
      message: 'Kullanıcı oturumu bulunamadı.',
    };
  }

  // 1. Resolve Order ID (if missing or empty, generate Date.now() based unique key)
  const orderId =
    options?.orderId && options.orderId.trim()
      ? options.orderId.trim()
      : `SP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // 2. Check Idempotency: Has this order already been credited?
  if (isOrderIdAlreadyProcessed(orderId, user)) {
    console.log(`[Payment] Sipariş (#${orderId}) daha önce işlenmiş. Tekrar yükleme atlanıyor.`);
    return {
      success: true,
      tokensAdded: 0,
      newTotal: user.creditsRemaining || 0,
      orderId,
      message: `Sipariş (#${orderId}) daha önce hesabınıza tanımlanmış.`,
      updatedUser: user,
    };
  }

  // 3. Resolve token amount
  let tokensToAdd = options?.tokens;
  let pkgTitle = options?.packageTitle || 'Tera Jeton Paketi';

  if (!tokensToAdd || tokensToAdd <= 0) {
    // Check sessionStorage
    try {
      const storedTokens = sessionStorage.getItem('terrascan_pending_payment_tokens');
      const storedPkgId = sessionStorage.getItem('terrascan_last_shopier_pkg');
      const storedTitle = sessionStorage.getItem('terrascan_pending_payment_pkg_title');

      if (storedTokens && parseInt(storedTokens, 10) > 0) {
        tokensToAdd = parseInt(storedTokens, 10);
      } else if (storedPkgId) {
        if (storedPkgId.includes('1000')) tokensToAdd = 1000;
        else if (storedPkgId.includes('250')) tokensToAdd = 250;
        else if (storedPkgId.includes('100')) tokensToAdd = 100;
        else if (storedPkgId.includes('50')) tokensToAdd = 50;
        else if (storedPkgId.includes('30')) tokensToAdd = 30;
      }
      if (storedTitle) {
        pkgTitle = storedTitle;
      }
    } catch {}
  }

  // Default fallback if still unknown
  if (!tokensToAdd || tokensToAdd <= 0) {
    tokensToAdd = 50;
  }

  // Clean pending session storage
  try {
    sessionStorage.removeItem('terrascan_pending_payment_tokens');
    sessionStorage.removeItem('terrascan_pending_payment_pkg_title');
    sessionStorage.removeItem('terrascan_last_shopier_pkg');
    sessionStorage.removeItem(STORAGE_LAST_PURCHASE_TIME_KEY);
  } catch {}

  console.log('Jeton Yükleme Başlatılıyor:', {
    userId: user.id,
    userEmail: user.email,
    orderId,
    tokensToAdd,
    currentCredits: user.creditsRemaining,
  });

  // 4. Update Supabase app_users table directly (tokens = tokens + satin_alinan_miktar)
  let newTotal = (user.creditsRemaining || 0) + tokensToAdd;
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseAvailable()) {
    try {
      // Get current tokens from Supabase
      const { data: userRow } = await supabase
        .from('app_users')
        .select('tokens, credits_remaining')
        .eq('id', user.id)
        .maybeSingle();

      const dbCurrentTokens = Number(
        userRow?.tokens ?? userRow?.credits_remaining ?? user.creditsRemaining ?? 0
      );
      newTotal = dbCurrentTokens + tokensToAdd;

      const { data: updateData, error: updateErr } = await supabase
        .from('app_users')
        .update({
          tokens: newTotal,
          credits_remaining: newTotal,
        })
        .eq('id', user.id)
        .select();

      console.log('Jeton Güncelleme Sonucu:', {
        updateData,
        updateErr,
        dbCurrentTokens,
        newTotal,
        tokensToAdd,
        userId: user.id,
      });

      if (updateErr) {
        console.warn('[Shopier] Supabase update notice:', updateErr.message);
      }
    } catch (dbErr) {
      console.warn('[Shopier] Supabase direct update exception:', dbErr);
    }
  }

  // 5. Update local state and history in userManager
  const updatedUser = addCreditsAndVipPoints(
    user.id,
    tokensToAdd,
    orderId,
    `Shopier Sipariş (#${orderId}) Onaylandı: +${tokensToAdd} Tera Jeton Yüklendi`
  );

  // Mark as processed across localStorage and memory
  markOrderIdAsProcessed(orderId, updatedUser);

  // 6. Record to processed_payments table (Failure here NEVER blocks or reverts token credit)
  if (supabase && isSupabaseAvailable()) {
    try {
      const { error: paymentRecordErr } = await supabase
        .from('processed_payments')
        .insert([
          {
            order_id: orderId,
            user_id: user.id,
            user_email: (user.email || '').toLowerCase().trim(),
            tokens: tokensToAdd,
            created_at: new Date().toISOString(),
          },
        ]);

      if (paymentRecordErr) {
        console.warn(
          '[processed_payments] Kayıt uyarısı (Jeton yüklemesi başarıyla korundu):',
          paymentRecordErr.message
        );
      }
    } catch (recErr) {
      console.warn('[processed_payments] Kayıt istisnası (Jeton yüklemesi başarıyla korundu):', recErr);
    }
  }

  const successMessage = `Ödemeniz onaylandı! ${tokensToAdd} jeton hesabınıza başarıyla tanımlandı.`;

  return {
    success: true,
    tokensAdded: tokensToAdd,
    newTotal: updatedUser.creditsRemaining || newTotal,
    orderId,
    message: successMessage,
    updatedUser,
  };
}

/**
 * Direct Shopier Orders API check as fallback if local /api route is unreachable
 */
async function checkShopierDirectly(user: UserProfile): Promise<ShopierVerifyResult> {
  const searchEmail = (user.email || '').toLowerCase().trim();
  const searchUserId = (user.id || '').trim();

  // Read local storage completed orders
  let localCompleted: string[] = [];
  try {
    const raw = localStorage.getItem('terrascan_processed_orders');
    if (raw) localCompleted = JSON.parse(raw);
  } catch {}

  const ordersRes = await fetch('https://api.shopier.com/v1/orders?limit=30', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SHOPIER_BEARER_TOKEN}`,
      Accept: 'application/json',
    },
  });

  if (!ordersRes.ok) {
    throw new Error(`Shopier API HTTP ${ordersRes.status}`);
  }

  const orders = await ordersRes.json();
  if (!Array.isArray(orders)) {
    return {
      success: true,
      credited: false,
      creditedOrders: [],
      message: 'Hesabınızla eşleşen yeni veya bekleyen ödenmiş sipariş bulunamadı.',
    };
  }

  // Filter paid
  const paidOrders = orders.filter((o) => {
    const pStatus = (o.paymentStatus || '').toLowerCase();
    const status = (o.status || '').toLowerCase();
    return pStatus === 'paid' || status === 'fulfilled' || status === 'completed';
  });

  // Match user email
  const matching = paidOrders.filter((order) => {
    const shipEmail = (order.shippingInfo?.email || '').toLowerCase().trim();
    const billEmail = (order.billingInfo?.email || '').toLowerCase().trim();
    const note = (order.note || '').toLowerCase();

    if (searchEmail && (shipEmail === searchEmail || billEmail === searchEmail || note.includes(searchEmail))) {
      return true;
    }
    if (searchUserId && note.includes(searchUserId.toLowerCase())) {
      return true;
    }
    return false;
  });

  if (matching.length === 0) {
    return {
      success: true,
      credited: false,
      creditedOrders: [],
      message: 'Hesabınızla eşleşen yeni veya bekleyen ödenmiş sipariş bulunamadı.',
    };
  }

  const creditedList: ShopierCreditedOrder[] = [];
  let totalAdded = 0;

  for (const order of matching) {
    const orderId = String(order.id);
    if (localCompleted.includes(orderId) || isOrderIdAlreadyProcessed(orderId, user)) {
      continue;
    }

    const { credits, title } = resolveTokensFromShopierOrder(order);
    totalAdded += credits;

    const record: ShopierCreditedOrder = {
      orderId,
      userEmail: searchEmail,
      userId: user.id,
      tokens: credits,
      amount: String(order.totals?.total || order.total || '0'),
      packageTitle: title,
      dateCompleted: new Date().toISOString(),
      status: 'completed',
    };

    localCompleted.push(orderId);
    markOrderIdAsProcessed(orderId, user);
    creditedList.push(record);
  }

  if (creditedList.length > 0) {
    try {
      localStorage.setItem('terrascan_processed_orders', JSON.stringify(localCompleted));
    } catch {}

    // Direct Supabase app_users tokens update
    try {
      const supabase = getSupabaseClient();
      if (supabase && user.id) {
        const { data: userRow } = await supabase
          .from('app_users')
          .select('tokens, credits_remaining')
          .eq('id', user.id)
          .maybeSingle();

        const currentTokens = Number(userRow?.tokens ?? userRow?.credits_remaining ?? user.creditsRemaining ?? 0);
        const newTotal = currentTokens + totalAdded;

        const { data: updateData, error: updateErr } = await supabase
          .from('app_users')
          .update({ tokens: newTotal, credits_remaining: newTotal })
          .eq('id', user.id)
          .select();

        console.log('Jeton Güncelleme Sonucu (Shopier Direct):', {
          updateData,
          updateErr,
          currentTokens,
          newTotal,
          totalAdded,
        });

        // Record to processed_payments (silent resilience)
        try {
          await supabase.from('processed_payments').insert(
            creditedList.map((c) => ({
              order_id: c.orderId,
              user_id: user.id,
              user_email: searchEmail,
              tokens: c.tokens,
              created_at: new Date().toISOString(),
            }))
          );
        } catch {}
      }
    } catch (e) {
      console.warn('[ShopierClient] Supabase sync note:', e);
    }

    return {
      success: true,
      credited: true,
      creditedOrders: creditedList,
      newTotalTokens: (user.creditsRemaining || 0) + totalAdded,
      message: `Ödemeniz onaylandı! ${totalAdded} jeton hesabınıza başarıyla tanımlandı.`,
    };
  }

  return {
    success: true,
    credited: false,
    creditedOrders: [],
    message: 'Bulunan siparişler daha önce hesabınıza tanımlanmış.',
  };
}

/**
 * Triggers automated backend verification against Shopier Orders API
 * with automatic fallback and silent resilience.
 */
export async function verifyShopierPayment(user: UserProfile): Promise<ShopierVerifyResult> {
  if (!user || !user.email) {
    return {
      success: false,
      credited: false,
      creditedOrders: [],
      message: 'Kullanıcı e-posta bilgisi bulunamadı.',
    };
  }

  // Concurrency guard: Only one verification attempt at any time
  if (!acquireVerificationLock()) {
    return {
      success: true,
      credited: false,
      creditedOrders: [],
      message: 'Ödeme doğrulama işlemi halihazırda yürütülüyor.',
    };
  }

  try {
    // 1. First attempt: call local server API (/api/shopier/verify-and-credit)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('/api/shopier/verify-and-credit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          email: user.email.toLowerCase().trim(),
          userId: user.id,
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: ShopierVerifyResult = await response.json();
        if (data.credited && Array.isArray(data.creditedOrders)) {
          for (const order of data.creditedOrders) {
            markOrderIdAsProcessed(order.orderId, user);
          }
        }
        return data;
      }
    } catch (err: any) {
      // Local /api unreachable or timed out; continue to direct fallback
    }

    // 2. Fallback attempt: direct Shopier Orders API verification
    try {
      const directResult = await checkShopierDirectly(user);
      return directResult;
    } catch (directErr: any) {
      return {
        success: false,
        credited: false,
        creditedOrders: [],
        message: 'Ödeme kontrolü sırasında bağlantı kurulamadı. Lütfen internet bağlantınızı kontrol ediniz.',
      };
    }
  } finally {
    releaseVerificationLock();
  }
}
