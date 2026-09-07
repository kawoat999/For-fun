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

/**
 * Sync a receipt to Supabase table `receipts`
 */
export async function syncReceiptToSupabase(saved: SavedReceipt): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('receipts').upsert({
      id: saved.id,
      created_at: saved.createdAt,
      doc_type: saved.docType,
      receipt_data: saved.receiptData,
      image_url: saved.imageUrl,
    });

    if (error) {
      console.error('Supabase upsert error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase sync error:', err);
    return false;
  }
}

/**
 * Fetch all receipts from Supabase table `receipts`
 */
export async function fetchReceiptsFromSupabase(): Promise<SavedReceipt[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      docType: row.doc_type,
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
