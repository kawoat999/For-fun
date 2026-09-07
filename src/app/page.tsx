'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Scan,
  Columns2,
  FileEdit,
  Printer,
  History,
  Receipt,
  FileText,
  Cloud,
  Truck,
} from 'lucide-react';
import FileUploader from '@/components/ocr/FileUploader';
import SideBySideReview from '@/components/ocr/SideBySideReview';
import ReceiptHistory from '@/components/history/ReceiptHistory';
import QuotationEditor from '@/components/quotation/QuotationEditor';
import QuotationPreview from '@/components/quotation/QuotationPreview';
import SupabaseModal from '@/components/ui/SupabaseModal';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Quotation, ReceiptData, SavedReceipt, OutputDocType } from '@/lib/types';
import { DEFAULT_SELLER_INFO, DEFAULT_CLIENT_INFO, SAMPLE_RECEIPTS, EMPTY_RECEIPT_DATA } from '@/lib/sample-data';
import { getSavedReceipts } from '@/lib/storage';

type Step = 'scan' | 'review' | 'history' | 'quotation-edit' | 'quotation-preview';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('scan');
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  // Initialize quotation state
  const [quotation, setQuotation] = useState<Quotation>({
    id: `qt-${Date.now()}`,
    docType: 'quotation',
    quotationNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    seller: DEFAULT_SELLER_INFO,
    client: DEFAULT_CLIENT_INFO,
    items: [],
    subtotal: 0,
    discount: 0,
    vatRate: 7,
    withholdingTaxRate: 0,
    paymentTerms: '',
    notes: '',
    preparedBy: '',
    authorizedBy: '',
  });

  const isReceipt = quotation.docType === 'receipt';
  const isDeliveryOrder = quotation.docType === 'delivery_order';

  const refreshHistoryCount = () => {
    const list = getSavedReceipts();
    setHistoryCount(list.length);
  };

  useEffect(() => {
    refreshHistoryCount();
    if (typeof window !== 'undefined') {
      const savedLogo = localStorage.getItem('company_logo');
      if (savedLogo) {
        setQuotation((prev) => ({
          ...prev,
          seller: { ...prev.seller, logoUrl: savedLogo },
        }));
      }
    }
  }, []);

  // When OCR scan succeeds -> go straight to Side-by-Side Review
  const handleScanSuccess = (data: ReceiptData, previewUrl: string | null) => {
    setScannedImage(previewUrl);
    setActiveReceipt(data);
    setCurrentStep('review');
  };

  // Convert ReceiptData into Quotation, Receipt, or Delivery Order and proceed to editor
  const handleProceedToDocument = (
    data: ReceiptData,
    targetDocType: OutputDocType = 'quotation'
  ) => {
    const isRc = targetDocType === 'receipt';
    const isDo = targetDocType === 'delivery_order';
    const clientInfo = {
      ...DEFAULT_CLIENT_INFO,
      name: data.merchantName || DEFAULT_CLIENT_INFO.name,
      taxId: data.taxId || DEFAULT_CLIENT_INFO.taxId,
      address: data.address || DEFAULT_CLIENT_INFO.address,
      phone: data.phone || DEFAULT_CLIENT_INFO.phone,
    };

    let docNum = data.receiptNumber || '';
    if (docNum && isDo && !docNum.startsWith('DO-')) {
      docNum = `DO-${docNum}`;
    }

    setQuotation((prev) => ({
      ...prev,
      docType: targetDocType,
      quotationNumber: docNum,
      paymentDate: data.date || new Date().toISOString().split('T')[0],
      paymentMethod: data.paymentMethod || (isRc ? 'โอนเงินผ่านธนาคาร' : prev.paymentMethod),
      client: clientInfo,
      items: data.items.length > 0 ? data.items : prev.items,
      subtotal: data.subtotal || prev.subtotal,
      discount: data.discount || 0,
      vatRate: data.taxRate !== undefined ? data.taxRate : 7,
      notes: data.notes || prev.notes,
    }));

    setCurrentStep('quotation-edit');
  };

  // Switch docType from Preview toolbar
  const handleToggleDocTypeFromPreview = (type: OutputDocType) => {
    setQuotation((prev) => {
      let newNum = prev.quotationNumber;
      if (newNum) {
        if (type === 'receipt') {
          newNum = newNum.replace(/^(QT|DO)-/, 'RC-');
          if (!newNum.startsWith('RC-')) newNum = `RC-${newNum}`;
        } else if (type === 'delivery_order') {
          newNum = newNum.replace(/^(QT|RC)-/, 'DO-');
          if (!newNum.startsWith('DO-')) newNum = `DO-${newNum}`;
        } else {
          newNum = newNum.replace(/^(RC|DO)-/, 'QT-');
          if (!newNum.startsWith('QT-')) newNum = `QT-${newNum}`;
        }
      }
      return {
        ...prev,
        docType: type,
        quotationNumber: newNum,
      };
    });
  };

  // View a saved receipt from history in Side-by-Side Review
  const handleViewReceiptFromHistory = (saved: SavedReceipt) => {
    setActiveReceipt(saved.receiptData);
    setScannedImage(saved.imageUrl || null);
    setCurrentStep('review');
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-4">
          {/* Logo & App Title */}
          <div
            onClick={() => setCurrentStep('scan')}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
                Receipt OCR & Document Builder
                <span className="hidden md:inline-block text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-mono">
                  Gemini 2.5 Flash
                </span>
              </h1>
              <p className="text-[11px] text-slate-500">
                สแกนบิล &bull; บันทึกรายรับ-รายจ่าย &bull; สลับใบเสนอราคา / ใบเสร็จรับเงิน A4
              </p>
            </div>
          </div>

          {/* Navigation Tabs (1, 2, 3, 4, 5 Consecutive) */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* 1. สแกนบิล */}
            <button
              onClick={() => setCurrentStep('scan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                currentStep === 'scan'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>1. สแกนบิล</span>
            </button>

            {/* 2. ตรวจสอบบิล (แสดงตลอดเวลา เรียงลำดับถูกต้อง) */}
            <button
              onClick={() => {
                if (!activeReceipt) {
                  setActiveReceipt(EMPTY_RECEIPT_DATA);
                }
                setCurrentStep('review');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                currentStep === 'review'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>2. ตรวจสอบบิล</span>
            </button>

            {/* 3. แก้ไขใบเสนอราคา / แก้ไขใบเสร็จ / แก้ไขใบส่งของ */}
            <button
              onClick={() => setCurrentStep('quotation-edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                currentStep === 'quotation-edit'
                  ? isDeliveryOrder
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : isReceipt
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isDeliveryOrder ? (
                <Truck className="w-3.5 h-3.5" />
              ) : isReceipt ? (
                <Receipt className="w-3.5 h-3.5" />
              ) : (
                <FileEdit className="w-3.5 h-3.5" />
              )}
              <span>
                {isDeliveryOrder
                  ? '3. แก้ไขใบส่งของ'
                  : isReceipt
                  ? '3. แก้ไขใบเสร็จ'
                  : '3. แก้ไขใบเสนอราคา'}
              </span>
            </button>

            {/* 4. พิมพ์ใบส่งของ / ใบเสร็จ / ใบเสนอราคา A4 */}
            <button
              onClick={() => setCurrentStep('quotation-preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                currentStep === 'quotation-preview'
                  ? isDeliveryOrder
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : isReceipt
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {isDeliveryOrder
                  ? '4. พิมพ์ใบส่งของ A4'
                  : isReceipt
                  ? '4. พิมพ์ใบเสร็จ A4'
                  : '4. พิมพ์ใบเสนอราคา A4'}
              </span>
            </button>

            {/* 5. ประวัติบิล */}
            <button
              onClick={() => {
                refreshHistoryCount();
                setCurrentStep('history');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                currentStep === 'history'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>5. ประวัติบิล</span>
              {historyCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] rounded-full font-mono">
                  {historyCount}
                </span>
              )}
            </button>
          </div>

          {/* Supabase Cloud Connection Button */}
          <button
            type="button"
            onClick={() => setShowSupabaseModal(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              isSupabaseConfigured()
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Cloud className={`w-3.5 h-3.5 ${isSupabaseConfigured() ? 'text-emerald-600' : 'text-slate-500'}`} />
            <span className="hidden lg:inline">
              {isSupabaseConfigured() ? 'Cloud เชื่อมต่อแล้ว' : 'ตั้งค่า Cloud'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* Step 1: Scan & Upload */}
        {currentStep === 'scan' && (
          <div className="max-w-4xl mx-auto">
            <FileUploader onScanSuccess={handleScanSuccess} />
          </div>
        )}

        {/* Step 2: Side-by-Side Review (Image Left + Form Right) */}
        {currentStep === 'review' && (
          <SideBySideReview
            receiptData={activeReceipt || EMPTY_RECEIPT_DATA}
            imageUrl={scannedImage}
            onProceedToQuotation={handleProceedToDocument}
            onReset={() => {
              setActiveReceipt(null);
              setScannedImage(null);
              setCurrentStep('scan');
            }}
            onSavedToHistory={refreshHistoryCount}
          />
        )}

        {/* Step 3: Local Storage History & Export CSV */}
        {currentStep === 'history' && (
          <ReceiptHistory
            onLoadIntoQuotation={handleProceedToDocument}
            onViewReceipt={handleViewReceiptFromHistory}
          />
        )}

        {/* Step 4: Quotation / Receipt Editor */}
        {currentStep === 'quotation-edit' && (
          <QuotationEditor
            quotation={quotation}
            onChange={setQuotation}
            onPreview={() => setCurrentStep('quotation-preview')}
            onBackToScan={() => (activeReceipt ? setCurrentStep('review') : setCurrentStep('scan'))}
            scannedImagePreview={scannedImage}
          />
        )}

        {/* Step 5: A4 Print Preview */}
        {currentStep === 'quotation-preview' && (
          <QuotationPreview
            quotation={quotation}
            onBackToEdit={() => setCurrentStep('quotation-edit')}
            onToggleDocType={handleToggleDocTypeFromPreview}
            onUpdateQuotation={setQuotation}
          />
        )}
      </div>

      {/* Supabase Connection Modal */}
      <SupabaseModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        onSuccess={refreshHistoryCount}
      />

      {/* App Footer (Hidden in Print) */}
      <footer className="no-print mt-20 py-6 border-t border-slate-200 text-center text-xs text-slate-400">
        Receipt OCR & Document Builder &bull; React, Next.js 15, Tailwind CSS, Gemini 2.5 Flash
      </footer>
    </main>
  );
}
