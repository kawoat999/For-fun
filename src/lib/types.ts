export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
}

export type DocumentType = 'expense' | 'income';
export type OutputDocType = 'quotation' | 'receipt';

export interface ReceiptData {
  docType?: DocumentType; // บิลรายจ่าย หรือ บิลรายรับ
  merchantName: string;
  taxId?: string;
  address?: string;
  phone?: string;
  receiptNumber?: string;
  date?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxRate?: number; // e.g. 7
  taxAmount?: number;
  discount?: number;
  totalAmount: number;
  paymentMethod?: string;
  notes?: string;
}

export interface SavedReceipt {
  id: string;
  createdAt: string;
  docType: DocumentType;
  receiptData: ReceiptData;
  imageUrl?: string | null;
}

export interface CompanyInfo {
  name: string;
  taxId: string;
  branch: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
}

export interface Quotation {
  id: string;
  docType: OutputDocType; // 'quotation' = ใบเสนอราคา, 'receipt' = ใบเสร็จรับเงิน
  quotationNumber: string;
  issueDate: string;
  validUntil: string;
  paymentDate?: string;
  paymentMethod?: string;
  seller: CompanyInfo;
  client: CompanyInfo;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  vatRate: number; // default 7%
  withholdingTaxRate: number; // 0%, 1%, 3%
  paymentTerms: string;
  notes: string;
  preparedBy: string;
  authorizedBy: string;
}
