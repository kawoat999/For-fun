import { SavedReceipt, ReceiptData, DocumentType, Quotation, OutputDocType } from './types';
import { formatCurrency, formatDate } from './formatters';
import { syncReceiptToSupabase, deleteReceiptFromSupabase, fetchReceiptsFromSupabase } from './supabase';

const STORAGE_KEY = 'receipt_ocr_archive_v1';

/**
 * Load all saved receipts from localStorage safely
 */
export function getSavedReceipts(): SavedReceipt[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load receipts from localStorage', error);
    return [];
  }
}

/**
 * Resilient localStorage writer with multi-tier quota fallback
 */
function safeSaveToLocalStorage(receipts: SavedReceipt[]): boolean {
  if (typeof window === 'undefined') return false;

  // Don't allow massive raw base64 images to blow the 5MB browser quota
  const sanitized = receipts.map((item) => {
    if (item.imageUrl && item.imageUrl.length > 50000) {
      // If image is larger than 50KB base64, omit from localStorage to preserve quota
      return { ...item, imageUrl: null };
    }
    return item;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch (err1) {
    console.warn('Storage quota exceeded, retrying without any images...', err1);
    try {
      const withoutImg = receipts.map((item) => ({ ...item, imageUrl: null }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutImg));
      return true;
    } catch (err2) {
      console.warn('Storage quota still exceeded, trimming to latest 30 records...', err2);
      try {
        const trimmed = receipts.slice(0, 30).map((item) => ({ ...item, imageUrl: null }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        return true;
      } catch (err3) {
        console.error('Critical failure writing receipts to localStorage', err3);
        return false;
      }
    }
  }
}

/**
 * Save OCR scanned receipt data to storage
 */
export function saveReceiptToStorage(
  receiptData: ReceiptData,
  docType: DocumentType = 'expense',
  imageUrl?: string | null,
  outputDocType?: OutputDocType
): SavedReceipt {
  const current = getSavedReceipts();
  const newReceipt: SavedReceipt = {
    id: `rcpt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
    docType,
    outputDocType: outputDocType || (docType === 'expense' ? 'receipt' : 'quotation'),
    receiptData: {
      ...receiptData,
      docType,
    },
    imageUrl: imageUrl || null,
  };

  const updated = [newReceipt, ...current];
  safeSaveToLocalStorage(updated);

  // Asynchronously sync to Supabase if configured
  syncReceiptToSupabase(newReceipt).catch((err) => {
    console.warn('Background sync to Supabase failed', err);
  });

  return newReceipt;
}

/**
 * Save or update a Quotation / Receipt / Delivery Order in History
 */
export function saveQuotationToStorage(
  quotation: Quotation,
  imageUrl?: string | null
): SavedReceipt {
  const current = getSavedReceipts();
  const isReceipt = quotation.docType === 'receipt';

  const docType: DocumentType = isReceipt ? 'income' : 'income';
  const subtotal = quotation.items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  const discount = Number(quotation.discount) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const vatAmount = (taxable * (Number(quotation.vatRate) || 0)) / 100;
  const withholdingTaxAmount = (taxable * (Number(quotation.withholdingTaxRate) || 0)) / 100;
  const grandTotal = taxable + vatAmount - withholdingTaxAmount;

  const receiptData: ReceiptData = {
    docType,
    merchantName: quotation.client.name || quotation.seller.name || 'ไม่ระบุชื่อ',
    taxId: quotation.client.taxId || quotation.seller.taxId || '',
    address: quotation.client.address || '',
    phone: quotation.client.phone || '',
    receiptNumber: quotation.quotationNumber || '',
    date: quotation.issueDate || new Date().toISOString().split('T')[0],
    items: quotation.items || [],
    subtotal: subtotal,
    taxRate: quotation.vatRate,
    taxAmount: vatAmount,
    discount: discount,
    totalAmount: grandTotal,
    paymentMethod: quotation.paymentMethod || '',
    notes: quotation.notes || '',
  };

  // Check if this document already exists in history (by matching quotationNumber or id)
  const existingIndex = current.findIndex(
    (item) =>
      (quotation.quotationNumber && item.receiptData.receiptNumber === quotation.quotationNumber) ||
      item.id === quotation.id ||
      item.quotationData?.id === quotation.id
  );

  let targetId = quotation.id;
  if (!targetId || !targetId.startsWith('rcpt-')) {
    targetId = `rcpt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }

  const savedRecord: SavedReceipt = {
    id: existingIndex >= 0 ? current[existingIndex].id : targetId,
    createdAt: existingIndex >= 0 ? current[existingIndex].createdAt : new Date().toISOString(),
    docType,
    outputDocType: quotation.docType,
    receiptData,
    quotationData: quotation,
    imageUrl: imageUrl || (existingIndex >= 0 ? current[existingIndex].imageUrl : null),
  };

  let updatedList: SavedReceipt[];
  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = savedRecord;
  } else {
    updatedList = [savedRecord, ...current];
  }

  safeSaveToLocalStorage(updatedList);

  // Sync to Supabase in background
  syncReceiptToSupabase(savedRecord).catch((err) => {
    console.warn('Background sync to Supabase failed', err);
  });

  return savedRecord;
}

/**
 * Delete a saved receipt by ID
 */
export function deleteSavedReceipt(id: string): SavedReceipt[] {
  const current = getSavedReceipts();
  const updated = current.filter((r) => r.id !== id);
  safeSaveToLocalStorage(updated);

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

  // Merge cloud items into local map
  cloudReceipts.forEach((cloudItem) => {
    if (!localMap.has(cloudItem.id)) {
      localMap.set(cloudItem.id, cloudItem);
    }
  });

  const merged = Array.from(localMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  safeSaveToLocalStorage(merged);
  return merged;
}

/**
 * Export all or filtered saved receipts to a summary CSV
 */
export function exportReceiptsToCSV(receipts: SavedReceipt[]): void {
  if (!receipts || receipts.length === 0) return;

  const headers = [
    'วันที่บันทึก',
    'รูปแบบเอกสาร',
    'ประเภทบิล',
    'วันที่บนบิล',
    'เลขที่เอกสาร',
    'ชื่อร้านค้า/ลูกค้า',
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
    const outputTypeLabel =
      r.outputDocType === 'delivery_order'
        ? 'ใบส่งของ'
        : r.outputDocType === 'receipt'
        ? 'ใบเสร็จรับเงิน'
        : 'ใบเสนอราคา';

    return [
      `"${formatDate(r.createdAt)}"`,
      `"${outputTypeLabel}"`,
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

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `receipts_summary_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export a SINGLE receipt / quotation as a detailed, itemized CSV file
 */
export function exportSingleReceiptToCSV(receipt: SavedReceipt): void {
  const d = receipt.receiptData;
  const q = receipt.quotationData;

  const docTypeName =
    receipt.outputDocType === 'delivery_order'
      ? 'ใบส่งของ (Delivery Order)'
      : receipt.outputDocType === 'receipt'
      ? 'ใบเสร็จรับเงิน (Receipt)'
      : 'ใบเสนอราคา (Quotation)';

  const lines: string[] = [];

  // Header information block
  lines.push(`"=== รายละเอียด${docTypeName} ==="`);
  lines.push(`"เลขที่เอกสาร","${d.receiptNumber || '-'}"`);
  lines.push(`"วันที่ออกเอกสาร","${d.date || formatDate(receipt.createdAt)}"`);
  lines.push(`"ชื่อลูกค้า/คู่ค้า","${(d.merchantName || '-').replace(/"/g, '""')}"`);
  if (d.taxId) lines.push(`"เลขประจำตัวผู้เสียภาษี","${d.taxId}"`);
  if (d.address) lines.push(`"ที่อยู่","${d.address.replace(/"/g, '""')}"`);
  if (d.phone) lines.push(`"เบอร์โทรศัพท์","${d.phone}"`);
  if (q?.poNumber) lines.push(`"เลขที่ใบสั่งซื้อ (PO No.)","${q.poNumber}"`);
  if (d.paymentMethod) lines.push(`"วิธีการชำระเงิน","${d.paymentMethod}"`);
  lines.push('');

  // Line items table
  lines.push('"ลำดับ","รายการสินค้า/บริการ","จำนวน","หน่วย","ราคาต่อหน่วย (บาท)","จำนวนเงิน (บาท)"');

  (d.items || []).forEach((item, idx) => {
    lines.push(
      [
        idx + 1,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        item.quantity || 1,
        `"${item.unit || 'ชิ้น'}"`,
        item.unitPrice || 0,
        item.totalPrice || 0,
      ].join(',')
    );
  });

  lines.push('');

  // Financial summary
  lines.push(`"","","","","รวมเป็นเงิน (Subtotal):",${d.subtotal ?? 0}`);
  if (d.discount && d.discount > 0) {
    lines.push(`"","","","","หักส่วนลด (Discount):",-${d.discount}`);
  }
  if (d.taxAmount && d.taxAmount > 0) {
    lines.push(`"","","","","ภาษีมูลค่าเพิ่ม VAT (${d.taxRate || 7}%):",${d.taxAmount}`);
  }
  lines.push(`"","","","","ยอดเงินรวมทั้งสิ้น (Grand Total):",${d.totalAmount ?? 0}`);

  if (d.notes) {
    lines.push('');
    lines.push(`"หมายเหตุ","${d.notes.replace(/"/g, '""')}"`);
  }

  // Prepend \uFEFF for proper Thai character encoding in Excel
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanDocNum = (d.receiptNumber || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('download', `${cleanDocNum}_${d.date || 'export'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
