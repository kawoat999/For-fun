import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SavedReceipt } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseAnonKey.includes('ใส่_anon_key') &&
    supabaseAnonKey.length > 20
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
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
