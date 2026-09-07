import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SavedReceipt } from './types';

const DEFAULT_SUPABASE_URL = 'https://qiqmmsclfuzzxojruwpp.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_paUJN4jP0-ezzhFCX9lfGw_I6kgZtcY';

export function getSupabaseConfig(): { url: string; anonKey: string } {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('supabase_anon_key');
    if (localKey && localKey.length > 20 && !localKey.includes('ใส่_anon_key')) {
      anonKey = localKey;
    }
    const localUrl = localStorage.getItem('supabase_url');
    if (localUrl) {
      url = localUrl;
    }
  }

  return { url, anonKey };
}

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return (
    Boolean(url) &&
    Boolean(anonKey) &&
    !anonKey.includes('ใส่_anon_key') &&
    anonKey.length > 20
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const { url, anonKey } = getSupabaseConfig();
  if (!client) {
    client = createClient(url, anonKey);
  }
  return client;
}

function getCurrentUser(): { id: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('receipt_app_auth_user_v1');
    if (raw) {
      const u = JSON.parse(raw);
      return { id: u.id || '', email: (u.email || '').toLowerCase() };
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function getCurrentUserId(): string | null {
  const user = getCurrentUser();
  return user?.id || null;
}

/**
 * Sync a receipt to Supabase table `receipts` isolated by userId
 */
export async function syncReceiptToSupabase(
  saved: SavedReceipt,
  userId?: string | null
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const currentUser = getCurrentUser();
  const effectiveUserId = userId || saved.userId || currentUser?.id || null;

  try {
    const payload: any = {
      id: saved.id,
      created_at: saved.createdAt,
      doc_type: saved.docType,
      receipt_data: {
        ...saved.receiptData,
        userId: effectiveUserId,
        userEmail: currentUser?.email || undefined,
      },
      image_url: saved.imageUrl,
    };

    if (effectiveUserId) {
      payload.user_id = effectiveUserId;
    }

    const { error } = await supabase.from('receipts').upsert(payload);
    if (!error) return true;

    // If user_id column does not exist on table yet, retry without it
    if (error && (error.message?.includes('user_id') || error.code === 'PGRST204')) {
      delete payload.user_id;
      const retry = await supabase.from('receipts').upsert(payload);
      return !retry.error;
    }

    console.error('Supabase upsert error:', error);
    return false;
  } catch (err) {
    console.error('Supabase sync error:', err);
    return false;
  }
}

/**
 * Fetch receipts from Supabase table `receipts` isolated by userId
 */
export async function fetchReceiptsFromSupabase(
  userId?: string | null
): Promise<SavedReceipt[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const currentUser = getCurrentUser();
  const effectiveUserId = userId !== undefined ? userId : currentUser?.id || null;
  if (!effectiveUserId) {
    // Guests without an account do not fetch cloud receipts of other users
    return [];
  }

  try {
    // 1. Try querying with user_id column
    let { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });

    // 2. If user_id column does not exist on the database yet, query all and filter by receipt_data.userId or receipt_data.userEmail
    if (error && (error.message?.includes('user_id') || error.code === 'PGRST204')) {
      const allRows = await supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!allRows.error && allRows.data) {
        data = allRows.data.filter(
          (row: any) =>
            row.receipt_data?.userId === effectiveUserId ||
            (currentUser?.email &&
              (row.receipt_data?.userEmail === currentUser.email ||
                row.receipt_data?.customer?.email === currentUser.email))
        );
        error = null;
      }
    }

    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id || row.receipt_data?.userId,
      createdAt: row.created_at,
      docType: row.doc_type,
      outputDocType: row.receipt_data?.docType,
      receiptData: row.receipt_data,
      imageUrl: row.image_url,
    }));
  } catch (err) {
    console.error('Supabase fetch exception:', err);
    return [];
  }
}

/**
 * Delete a receipt from Supabase table `receipts`
 */
export async function deleteReceiptFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('receipts').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase delete exception:', err);
    return false;
  }
}
