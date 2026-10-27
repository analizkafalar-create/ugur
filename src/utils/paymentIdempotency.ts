/**
 * TerraScan - Payment Idempotency & URL State Cleaner
 * Prevents duplicate credit/token additions from repeated callbacks,
 * browser refreshes, back buttons, or rapid concurrent polling.
 */

import { UserProfile } from '../types';

const PROCESSED_ORDERS_STORAGE_KEY = 'terrascan_processed_orders';
const SESSION_PROCESSED_ORDERS_KEY = 'terrascan_session_processed_orders';
const PROCESSED_IDEMPOTENCY_KEYS_KEY = 'terrascan_processed_idempotency_keys';

// In-memory set of processed order IDs / idempotency keys during this runtime session
const inMemoryProcessedOrderIds = new Set<string>();

// Global in-flight verification mutex lock
let isVerificationInFlight = false;

/**
 * Checks if a specific order ID or payment reference has already been processed
 * and credited to the user account.
 */
export function isOrderIdAlreadyProcessed(
  orderIdOrRef: string | null | undefined,
  user?: UserProfile | null
): boolean {
  if (!orderIdOrRef) return false;
  const cleanId = String(orderIdOrRef).trim().toUpperCase();
  if (!cleanId) return false;

  // 1. In-memory session check
  if (inMemoryProcessedOrderIds.has(cleanId)) {
    return true;
  }

  // 2. LocalStorage processed orders registry
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(PROCESSED_ORDERS_STORAGE_KEY);
      if (raw) {
        const list: string[] = JSON.parse(raw);
        if (Array.isArray(list) && list.map((s) => String(s).toUpperCase()).includes(cleanId)) {
          inMemoryProcessedOrderIds.add(cleanId);
          return true;
        }
      }

      const rawIdemp = localStorage.getItem(PROCESSED_IDEMPOTENCY_KEYS_KEY);
      if (rawIdemp) {
        const idempList: string[] = JSON.parse(rawIdemp);
        if (Array.isArray(idempList) && idempList.map((s) => String(s).toUpperCase()).includes(cleanId)) {
          inMemoryProcessedOrderIds.add(cleanId);
          return true;
        }
      }
    } catch {}
  }

  // 3. SessionStorage check
  if (typeof sessionStorage !== 'undefined') {
    try {
      const rawSession = sessionStorage.getItem(SESSION_PROCESSED_ORDERS_KEY);
      if (rawSession) {
        const sessionList: string[] = JSON.parse(rawSession);
        if (Array.isArray(sessionList) && sessionList.map((s) => String(s).toUpperCase()).includes(cleanId)) {
          inMemoryProcessedOrderIds.add(cleanId);
          return true;
        }
      }
    } catch {}
  }

  // 4. User Credit History check
  if (user && Array.isArray(user.creditHistory)) {
    for (const entry of user.creditHistory) {
      const entryId = String(entry.id || '').toUpperCase();
      const desc = String(entry.description || '').toUpperCase();
      if (entryId === cleanId || entryId === `CH-${cleanId}` || desc.includes(cleanId)) {
        inMemoryProcessedOrderIds.add(cleanId);
        return true;
      }
    }
  }

  return false;
}

/**
 * Atomically marks an order ID / payment reference as processed across all storage tiers.
 */
export function markOrderIdAsProcessed(
  orderIdOrRef: string | null | undefined,
  user?: UserProfile | null
): void {
  if (!orderIdOrRef) return;
  const cleanId = String(orderIdOrRef).trim().toUpperCase();
  if (!cleanId) return;

  // 1. In-memory
  inMemoryProcessedOrderIds.add(cleanId);

  // 2. LocalStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(PROCESSED_ORDERS_STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.map((s) => String(s).toUpperCase()).includes(cleanId)) {
        list.push(cleanId);
        localStorage.setItem(PROCESSED_ORDERS_STORAGE_KEY, JSON.stringify(list));
      }

      const rawIdemp = localStorage.getItem(PROCESSED_IDEMPOTENCY_KEYS_KEY);
      const idempList: string[] = rawIdemp ? JSON.parse(rawIdemp) : [];
      if (!idempList.map((s) => String(s).toUpperCase()).includes(cleanId)) {
        idempList.push(cleanId);
        localStorage.setItem(PROCESSED_IDEMPOTENCY_KEYS_KEY, JSON.stringify(idempList));
      }
    } catch {}
  }

  // 3. SessionStorage
  if (typeof sessionStorage !== 'undefined') {
    try {
      const rawSession = sessionStorage.getItem(SESSION_PROCESSED_ORDERS_KEY);
      const sessionList: string[] = rawSession ? JSON.parse(rawSession) : [];
      if (!sessionList.map((s) => String(s).toUpperCase()).includes(cleanId)) {
        sessionList.push(cleanId);
        sessionStorage.setItem(SESSION_PROCESSED_ORDERS_KEY, JSON.stringify(sessionList));
      }
    } catch {}
  }
}

/**
 * Mutex lock to ensure only one payment verification process runs at any given millisecond.
 */
export function acquireVerificationLock(): boolean {
  if (isVerificationInFlight) {
    return false;
  }
  isVerificationInFlight = true;
  return true;
}

export function releaseVerificationLock(): void {
  isVerificationInFlight = false;
}

export interface ExtractedPaymentParams {
  hasPaymentParams: boolean;
  orderId?: string;
  paymentId?: string;
  status?: string;
  isSuccess: boolean;
  tokens?: number;
  packageId?: string;
  rawParams?: Record<string, string>;
}

/**
 * Extracts payment return URL query parameters (e.g., status=success, payment=success,
 * order_id, platform_order_id, payment_id, shopier_order_id, etc.)
 * Generates unique fallback order ID if empty, to ensure credit loading is NEVER blocked.
 * Purges query params from URL via window.history.replaceState to prevent loops.
 */
export function extractAndCleanPaymentUrlParams(): ExtractedPaymentParams {
  if (typeof window === 'undefined') {
    return { hasPaymentParams: false, isSuccess: false };
  }

  try {
    const searchString = window.location.search;
    if (searchString && searchString.length > 1) {
      console.log('Ödeme Parametreleri:', searchString);
    }

    const params = new URLSearchParams(searchString);
    const rawParamsObj: Record<string, string> = {};
    params.forEach((value, key) => {
      rawParamsObj[key] = value;
    });

    // Extract Order ID across all possible naming conventions
    const rawOrderId =
      params.get('order_id') ||
      params.get('orderId') ||
      params.get('platform_order_id') ||
      params.get('platformOrderId') ||
      params.get('shopier_order_id') ||
      params.get('sp_order_id') ||
      params.get('order') ||
      params.get('order_no') ||
      params.get('orderNo') ||
      params.get('invoice_id') ||
      params.get('invoiceId');

    // Extract Payment / Transaction ID
    const rawPaymentId =
      params.get('payment_id') ||
      params.get('paymentId') ||
      params.get('payment_reference') ||
      params.get('paymentReference') ||
      params.get('trans_id') ||
      params.get('transaction_id') ||
      params.get('transactionId') ||
      params.get('payment_intent') ||
      params.get('paymentIntent');

    // Extract Status / Result indicators
    const rawStatus = (
      params.get('status') ||
      params.get('payment') ||
      params.get('payment_status') ||
      params.get('paymentStatus') ||
      params.get('result') ||
      params.get('state') ||
      params.get('response') ||
      ''
    ).toLowerCase();

    const rawSuccess = (params.get('success') || '').toLowerCase();
    const rawApproved = (params.get('approved') || '').toLowerCase();
    const rawPaid = (params.get('paid') || '').toLowerCase();

    // Check if tokens were specified directly
    const rawTokens = params.get('tokens') || params.get('credits') || params.get('token_amount');
    const parsedTokens = rawTokens ? parseInt(rawTokens, 10) : undefined;
    const packageId = params.get('package_id') || params.get('packageId') || params.get('pkg') || undefined;

    // Determine if this is a successful payment return
    const isSuccess =
      rawSuccess === 'true' ||
      rawSuccess === '1' ||
      rawSuccess === 'yes' ||
      rawApproved === 'true' ||
      rawApproved === '1' ||
      rawPaid === 'true' ||
      rawPaid === '1' ||
      rawStatus === 'success' ||
      rawStatus === 'successful' ||
      rawStatus === 'paid' ||
      rawStatus === 'completed' ||
      rawStatus === 'ok' ||
      rawStatus === '1' ||
      params.has('payment_status') ||
      params.has('platform_order_id') ||
      !!rawOrderId ||
      !!rawPaymentId;

    const hasPaymentParams =
      !!rawOrderId ||
      !!rawPaymentId ||
      !!rawStatus ||
      params.has('success') ||
      params.has('payment') ||
      params.has('payment_status') ||
      params.has('order_id') ||
      params.has('platform_order_id') ||
      params.has('order') ||
      params.has('payment_id');

    // If payment is successful but order ID is empty, generate Date.now() based unique key
    let resolvedOrderId = rawOrderId ? rawOrderId.trim() : undefined;
    if (isSuccess && (!resolvedOrderId || resolvedOrderId.length === 0)) {
      resolvedOrderId = rawPaymentId || `SP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    // Clean payment query parameters from URL immediately without reloading the page
    if (hasPaymentParams) {
      const cleanUrl = new URL(window.location.href);
      const keysToDelete = [
        'order_id',
        'orderId',
        'platform_order_id',
        'platformOrderId',
        'shopier_order_id',
        'sp_order_id',
        'order',
        'order_no',
        'orderNo',
        'invoice_id',
        'invoiceId',
        'payment_id',
        'paymentId',
        'payment_reference',
        'paymentReference',
        'trans_id',
        'transaction_id',
        'transactionId',
        'status',
        'payment',
        'payment_status',
        'paymentStatus',
        'success',
        'approved',
        'paid',
        'tokens',
        'credits',
        'token_amount',
        'package_id',
        'pkg',
        'token',
      ];

      for (const key of keysToDelete) {
        cleanUrl.searchParams.delete(key);
      }

      const newSearch = cleanUrl.searchParams.toString();
      const newRelativePath = cleanUrl.pathname + (newSearch ? `?${newSearch}` : '') + cleanUrl.hash;
      window.history.replaceState({}, document.title, newRelativePath);
    }

    return {
      hasPaymentParams,
      orderId: resolvedOrderId,
      paymentId: rawPaymentId || undefined,
      status: rawStatus || undefined,
      isSuccess,
      tokens: parsedTokens && !isNaN(parsedTokens) ? parsedTokens : undefined,
      packageId,
      rawParams: rawParamsObj,
    };
  } catch (err) {
    console.warn('[paymentIdempotency] Error extracting and cleaning URL params:', err);
    return { hasPaymentParams: false, isSuccess: false };
  }
}
