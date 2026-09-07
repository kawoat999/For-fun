import { SavedReceipt, ReceiptData, DocumentType } from './types';
import { formatCurrency, formatDate } from './formatters';
import { syncReceiptToSupabase, deleteReceiptFromSupabase, fetchReceiptsFromSupabase } from './supabase';

const STORAGE_KEY = 'receipt_ocr_archive_v1';

export function getSavedReceipts(): SavedReceipt[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load receipts from localStorage', error);
    return [];
  }
}

export function saveReceiptToStorage(
  receiptData: ReceiptData,
  docType: DocumentType,
  imageUrl?: string | null
): SavedReceipt {
  const current = getSavedReceipts();
  const newReceipt: SavedReceipt = {
    id: `rcpt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
    docType,
    receiptData: {
      ...receiptData,
      docType,
    },
    imageUrl: imageUrl || null,
  };

  const updated = [newReceipt, ...current];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    // If local storage is full because of base64 images, retry without the image URL
    console.warn('Storage quota exceeded, saving without image', error);
    const withoutImg = updated.map((item) => ({ ...item, imageUrl: null }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutImg));
  }

  // Asynchronously sync to Supabase if configured
  syncReceiptToSupabase(newReceipt).catch((err) => {
    console.warn('Background sync to Supabase failed', err);
  });

  return newReceipt;
}

export function deleteSavedReceipt(id: string): SavedReceipt[] {
  const current = getSavedReceipts();
  const updated = current.filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to delete receipt from localStorage', error);
  }

  // Delete from Supabase in background
  deleteReceiptFromSupabase(id).catch((err) => {
    console.warn('Background delete from Supabase failed', err);
  });

  return updated;
}

/**
 * Sync all records between Supabase and LocalStorage
 */
export async function syncWithSupabase(): Promise<SavedReceipt[]> {
  const cloudReceipts = await fetchReceiptsFromSupabase();
  if (!cloudReceipts || cloudReceipts.length === 0) {
    return getSavedReceipts();
  }

  const localReceipts = getSavedReceipts();
  const localMap = new Map<string, SavedReceipt>(localReceipts.map((r) => [r.id, r]));

  // Merge cloud items into local
  cloudReceipts.forEach((cloudItem) => {
    if (!localMap.has(cloudItem.id)) {
      localMap.set(cloudItem.id, cloudItem);
    }
  });

  const merged = Array.from(localMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to save merged receipts to localStorage', err);
  }

  return merged;
}

/**
 * Export saved receipts to CSV format with UTF-8 BOM for Excel compatibility (supports Thai language)
 */
export function exportReceiptsToCSV(receipts: SavedReceipt[]): void {
  if (!receipts || receipts.length === 0) return;

  const headers = [
    'วันที่สร้างรายการ',
    'ประเภทเอกสาร',
    'วันที่บนบิล',
    'เลขที่บิล/ใบเสร็จ',
    'ชื่อร้านค้า/คู่ค้า',
    'เลขประจำตัวผู้เสียภาษี',
    'รายการสินค้าทั้งหมด',
    'ยอดรวมย่อย (บาท)',
    'ส่วนลด (บาท)',
    'ภาษี VAT (บาท)',
    'ยอดสุทธิ (บาท)',
    'วิธีการชำระเงิน',
    'หมายเหตุ',
  ];

  const rows = receipts.map((r) => {
    const d = r.receiptData;
    const itemsSummary = (d.items || [])
      .map((it) => `${it.name} (${it.quantity} ${it.unit || 'ชิ้น'} x ${it.unitPrice} = ${it.totalPrice})`)
      .join('; ');

    const docTypeLabel = r.docType === 'expense' ? 'บิลรายจ่าย' : 'บิลรายรับ';

    return [
      `"${formatDate(r.createdAt)}"`,
      `"${docTypeLabel}"`,
      `"${d.date || ''}"`,
      `"${d.receiptNumber || ''}"`,
      `"${(d.merchantName || '').replace(/"/g, '""')}"`,
      `"${d.taxId || ''}"`,
      `"${itemsSummary.replace(/"/g, '""')}"`,
      d.subtotal ?? 0,
      d.discount ?? 0,
      d.taxAmount ?? 0,
      d.totalAmount ?? 0,
      `"${(d.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(d.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  // Prepend \uFEFF BOM for Excel Thai language encoding
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `receipts_archive_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
