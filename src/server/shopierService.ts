import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SHOPIER_BEARER_TOKEN =
  process.env.SHOPIER_API_BEARER_TOKEN ||
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJiYTE1NmYzOTFlZjllYWFkZDk4YTFiNWMxNjFjNWY0OCIsImp0aSI6IjI5ODMxNmQxZjU2YTFiNDlmYzYxNzIyZTk5NzE0NmY1MDM1YjE5NDIzMWExY2UyZTM5MzRlODdiYjYwNjMyYWQ2OWZlOWU1M2UxZmVmNjJjMjI4Mzc1NjdhZTliYzI1YmJhMjMyZDY0MmQ2NjgxYmM4ZmUwMDM0ZTVlODVjNDRlMzc1ODViMmNkNDNiNTBmMWI5M2U5YjcyMGQ3NDhmMTAiLCJpYXQiOjE3ODkzMTkyNTcsIm5iZiI6MTc4OTMxOTI1NywiZXhwIjoxOTQ3MTA0MDE3LCJzdWIiOjI4ODk4NTksInNjb3BlcyI6WyJvcmRlcnM6cmVhZCIsIm9yZGVyczp3cml0ZSIsInByb2R1Y3RzOnJlYWQiLCJwcm9kdWN0czp3cml0ZSIsInNoaXBwaW5nczpyZWFkIiwic2hpcHBpbmdzOndyaXRlIiwiZGlzY291bnRzOnJlYWQiLCJkaXNjb3VudHM6d3JpdGUiLCJwYXlvdXRzOnJlYWQiLCJyZWZ1bmRzOnJlYWQiLCJyZWZ1bmRzOndyaXRlIiwic2hvcDpyZWFkIiwic2hvcDp3cml0ZSJdfQ.q5cVFnfE-PbX6gnzGdRNhAVRaimh3CFk9Wz-kZr6kIYDfY5HUzbbJ_qmIK-Ccs_i_wTyIzDoX13QNtAhh0cs-LdmFAT7f22CovkMHoRBeo5pZeHop6Wq90_C5WR4XYKYPNvI_3GA_3_XOWKSnEPyS7c9rSqSTQxQ2ct30R3bauiEk9s5Q8uTiJ3f3Y1JlT2oBpkAkbf3cdfFFZjfLjFkUNc2Ps-So9OdfXTOEAHuc89UdtnZac55gLNKbea2H5qEN7TU0R6LGqMTlAXszWtAKDFg0MLAjPHKKvRWL_h2Zi7mCQ5t5RhHyQeIywBQyfQl1pxe_6wvYdraqBGAcZBD2g';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://kornfxivbyoltnfjulna.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_sn4dXZFZCcEMc4WvZcQ7Pw_FQFq21B5';

const PROCESSED_ORDERS_FILE = path.join(process.cwd(), 'server_data', 'processed_shopier_orders.json');

export interface ProcessedOrderRecord {
  orderId: string;
  userEmail: string;
  userId?: string;
  tokens: number;
  amount: string;
  packageTitle: string;
  dateCompleted: string;
  status: 'completed';
}

interface ProcessedOrdersStore {
  completedOrderIds: string[];
  orders: ProcessedOrderRecord[];
}

let memoryStore: ProcessedOrdersStore = {
  completedOrderIds: [],
  orders: [],
};

// Initialize memory store from disk
function loadStore(): ProcessedOrdersStore {
  try {
    if (fs.existsSync(PROCESSED_ORDERS_FILE)) {
      const content = fs.readFileSync(PROCESSED_ORDERS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.completedOrderIds)) {
        memoryStore = parsed;
        return memoryStore;
      }
    }
  } catch (err) {
    console.error('[ShopierService] Error reading processed orders file:', err);
  }
  return memoryStore;
}

function persistStore(): void {
  try {
    const dir = path.dirname(PROCESSED_ORDERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROCESSED_ORDERS_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ShopierService] Error saving processed orders file:', err);
  }
}

// Initial load
loadStore();

let _supabaseClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabaseClient) {
    _supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabaseClient;
}

/**
 * Resolves the token amount corresponding to a Shopier order.
 */
export function resolveCreditsFromShopierOrder(order: any): { credits: number; title: string } {
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

  // Fallback to order total amount
  const total = parseFloat(order.totals?.total || order.total || '0');
  if (total >= 4500) return { credits: 1000, title: '1.000 TERA JETON [VIP ELİT]' };
  if (total >= 1500) return { credits: 250, title: '250 TERA JETON [GENİŞ SAHA]' };
  if (total >= 700) return { credits: 100, title: '100 TERA JETON [PRO JEOFİZİK]' };
  if (total >= 400) return { credits: 50, title: '50 TERA JETON [STANDART]' };
  if (total >= 200) return { credits: 30, title: '30 TERA JETON [KEŞİF]' };

  return { credits: 50, title: matchedTitle };
}

/**
 * Fetches latest orders from the official Shopier Orders API
 */
export async function fetchShopierOrders(limit = 20): Promise<any[]> {
  const token = SHOPIER_BEARER_TOKEN;
  const url = `https://api.shopier.com/v1/orders?limit=${encodeURIComponent(limit)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Shopier API HTTP ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}

/**
 * Returns list of already completed orders
 */
export function getProcessedOrdersStore(): ProcessedOrdersStore {
  return loadStore();
}

/**
 * Verifies paid Shopier orders and credits tokens to Supabase app_users
 */
export async function verifyAndCreditShopierOrders(params: {
  email?: string;
  userId?: string;
  orderId?: string;
}): Promise<{
  success: boolean;
  credited: boolean;
  creditedOrders: ProcessedOrderRecord[];
  newTotalTokens?: number;
  message: string;
}> {
  const store = loadStore();
  const searchEmail = (params.email || '').toLowerCase().trim();
  const searchUserId = (params.userId || '').trim();
  const searchOrderId = (params.orderId || '').trim();

  if (!searchEmail && !searchUserId && !searchOrderId) {
    return {
      success: false,
      credited: false,
      creditedOrders: [],
      message: 'Doğrulama için e-posta, kullanıcı ID veya sipariş numarası gereklidir.',
    };
  }

  // 1. Fetch latest orders from Shopier
  let orders: any[] = [];
  try {
    orders = await fetchShopierOrders(50);
  } catch (err: any) {
    console.error('[ShopierService] fetchShopierOrders error:', err.message);
    return {
      success: false,
      credited: false,
      creditedOrders: [],
      message: `Shopier API ile iletişim kurulamadı: ${err.message}`,
    };
  }

  // 2. Filter orders with paymentStatus === 'paid'
  const paidOrders = orders.filter((o) => {
    const pStatus = (o.paymentStatus || '').toLowerCase();
    const status = (o.status || '').toLowerCase();
    return pStatus === 'paid' || status === 'fulfilled' || status === 'completed';
  });

  // 3. Find matching orders
  const matchingOrders = paidOrders.filter((order) => {
    const oId = String(order.id || '');
    if (searchOrderId && oId === searchOrderId) {
      return true;
    }

    const shipEmail = (order.shippingInfo?.email || '').toLowerCase().trim();
    const billEmail = (order.billingInfo?.email || '').toLowerCase().trim();
    const note = (order.note || '').toLowerCase();

    if (searchEmail) {
      if (shipEmail === searchEmail || billEmail === searchEmail || note.includes(searchEmail)) {
        return true;
      }
    }

    if (searchUserId) {
      if (note.includes(searchUserId.toLowerCase())) {
        return true;
      }
    }

    return false;
  });

  if (matchingOrders.length === 0) {
    return {
      success: true,
      credited: false,
      creditedOrders: [],
      message: 'Hesabınızla eşleşen yeni veya bekleyen ödenmiş Shopier siparişi bulunamadı.',
    };
  }

  // 4. Connect to Supabase to find target user
  const supabase = getSupabase();
  let targetUserRow: any = null;

  if (searchUserId) {
    const { data: byId } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', searchUserId)
      .maybeSingle();
    if (byId) targetUserRow = byId;
  }

  if (!targetUserRow && searchEmail) {
    const { data: byEmail } = await supabase
      .from('app_users')
      .select('*')
      .ilike('email', searchEmail)
      .maybeSingle();
    if (byEmail) targetUserRow = byEmail;
  }

  const creditedList: ProcessedOrderRecord[] = [];
  let currentTokens = targetUserRow ? Number(targetUserRow.tokens ?? 0) : 0;

  for (const order of matchingOrders) {
    const orderId = String(order.id);

    // Skip if already completed (mükerrer yüklemeyi önle)
    if (store.completedOrderIds.includes(orderId)) {
      console.log(`[ShopierService] Sipariş #${orderId} daha önce işlenmiş, atlanıyor.`);
      continue;
    }

    const { credits, title } = resolveCreditsFromShopierOrder(order);
    const orderEmail = order.shippingInfo?.email || searchEmail || targetUserRow?.email || '';
    const orderAmount = String(order.totals?.total || order.total || '0');

    // Credit to Supabase
    if (targetUserRow) {
      currentTokens += credits;
      const { data: updateData, error: updateError } = await supabase
        .from('app_users')
        .update({ tokens: currentTokens, credits_remaining: currentTokens })
        .eq('id', targetUserRow.id)
        .select();

      console.log('Jeton Güncelleme Sonucu (Backend Server):', {
        updateData,
        updateError,
        userId: targetUserRow.id,
        userEmail: targetUserRow.email,
        creditsAdded: credits,
        currentTokens,
      });

      if (updateError) {
        console.warn(`[ShopierService] Supabase tokens update notice for user ${targetUserRow.id}:`, updateError.message);
      } else {
        console.log(`[ShopierService] Supabase app_users updated: User ${targetUserRow.email} +${credits} tokens (Total: ${currentTokens})`);
      }
    }

    // Mark as completed in store
    const record: ProcessedOrderRecord = {
      orderId,
      userEmail: orderEmail,
      userId: targetUserRow?.id || searchUserId || undefined,
      tokens: credits,
      amount: orderAmount,
      packageTitle: title,
      dateCompleted: new Date().toISOString(),
      status: 'completed',
    };

    store.completedOrderIds.push(orderId);
    store.orders.push(record);
    creditedList.push(record);
  }

  // Persist store changes
  if (creditedList.length > 0) {
    memoryStore = store;
    persistStore();
  }

  if (creditedList.length > 0) {
    const totalAdded = creditedList.reduce((acc, curr) => acc + curr.tokens, 0);
    return {
      success: true,
      credited: true,
      creditedOrders: creditedList,
      newTotalTokens: currentTokens,
      message: `Ödemeniz onaylandı, bakiyeniz güncellendi! Hesabınıza toplam +${totalAdded} Tera Jeton başarıyla tanımlandı.`,
    };
  }

  return {
    success: true,
    credited: false,
    creditedOrders: [],
    newTotalTokens: currentTokens,
    message: 'Bulunan siparişler daha önce hesabınıza tanımlanmış.',
  };
}
