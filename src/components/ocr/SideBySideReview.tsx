'use client';

import React, { useState, useEffect } from 'react';
import {
  Save,
  ArrowRight,
  Plus,
  Trash2,
  Calendar,
  Building2,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowLeft,
  RotateCcw,
  Truck,
} from 'lucide-react';
import { ReceiptData, ReceiptItem, DocumentType, OutputDocType } from '@/lib/types';
import ImageViewer from './ImageViewer';
import { formatCurrency } from '@/lib/formatters';
import { saveReceiptToStorage } from '@/lib/storage';

interface SideBySideReviewProps {
  receiptData: ReceiptData;
  imageUrl?: string | null;
  fileName?: string;
  onProceedToQuotation: (data: ReceiptData, targetDocType?: OutputDocType) => void;
  onReset: () => void;
  onSavedToHistory?: () => void;
}

export default function SideBySideReview({
  receiptData: initialData,
  imageUrl,
  fileName,
  onProceedToQuotation,
  onReset,
  onSavedToHistory,
}: SideBySideReviewProps) {
  const [data, setData] = useState<ReceiptData>(initialData);
  const [docType, setDocType] = useState<DocumentType>(initialData.docType || 'expense');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setData(initialData);
    if (initialData.docType) {
      setDocType(initialData.docType);
    }
  }, [initialData]);

  const handleClearForm = () => {
    setData({
      merchantName: '',
      taxId: '',
      address: '',
      phone: '',
      receiptNumber: '',
      date: '',
      items: [],
      subtotal: 0,
      taxRate: 7,
      taxAmount: 0,
      discount: 0,
      totalAmount: 0,
      paymentMethod: '',
    });
  };

  // Handle Field Updates
  const handleFieldChange = (field: keyof ReceiptData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle Item row updates
  const handleItemChange = (id: string, field: keyof ReceiptItem, value: any) => {
    const updatedItems = data.items.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? Number(value) || 0 : item.quantity;
          const price = field === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
          updated.totalPrice = Math.round(qty * price * 100) / 100;
        }
        return updated;
      }
      return item;
    });

    const subtotal = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const taxAmount = (subtotal * (data.taxRate || 0)) / 100;
    const discount = data.discount || 0;
    const totalAmount = subtotal - discount + taxAmount;

    setData((prev) => ({
      ...prev,
      items: updatedItems,
      subtotal,
      taxAmount,
      totalAmount,
    }));
  };

  const handleAddItem = () => {
    const newItem: ReceiptItem = {
      id: `item-${Date.now()}`,
      name: '',
      quantity: 1,
      unit: '',
      unitPrice: 0,
      totalPrice: 0,
    };
    setData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleDeleteItem = (id: string) => {
    const updatedItems = data.items.filter((item) => item.id !== id);
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const taxAmount = (subtotal * (data.taxRate || 0)) / 100;
    const discount = data.discount || 0;
    const totalAmount = subtotal - discount + taxAmount;

    setData((prev) => ({
      ...prev,
      items: updatedItems,
      subtotal,
      taxAmount,
      totalAmount,
    }));
  };

  // Handle Save to LocalStorage Archive
  const handleSaveToArchive = () => {
    saveReceiptToStorage(data, docType, imageUrl);
    setSavedSuccess(true);
    if (onSavedToHistory) onSavedToHistory();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const subtotal = data.items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  const discount = Number(data.discount) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const vatAmount = (taxable * (Number(data.taxRate) || 0)) / 100;
  const grandTotal = taxable + vatAmount;

  // Handle Proceed and Auto-Save to history
  const handleProceedWithAutoSave = (targetType: OutputDocType) => {
    // Auto-save to history so it's guaranteed to appear in 5. ประวัติบิล
    saveReceiptToStorage(data, docType, imageUrl, targetType);
    if (onSavedToHistory) onSavedToHistory();
    onProceedToQuotation({ ...data, docType }, targetType);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            สแกนบิลใหม่
          </button>
          <button
            type="button"
            onClick={handleClearForm}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3 py-2 rounded-lg transition-colors"
            title="ล้างข้อความทั้งหมดในฟอร์ม"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            ล้างฟอร์ม
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Save to LocalStorage */}
          <button
            type="button"
            onClick={handleSaveToArchive}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all shadow-sm ${
              savedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-900 text-white'
            }`}
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                บันทึกลงประวัติสำเร็จ!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                บันทึกประวัติ (Local Archive)
              </>
            )}
          </button>

          {/* Convert to Delivery Order */}
          <button
            type="button"
            onClick={() => handleProceedWithAutoSave('delivery_order')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all"
            title="ดึงข้อมูลบิลไปสร้างใบส่งของทันที"
          >
            <Truck className="w-4 h-4" />
            สร้างใบส่งของ
          </button>

          {/* Convert to Receipt */}
          <button
            type="button"
            onClick={() => handleProceedWithAutoSave('receipt')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all"
          >
            <Receipt className="w-4 h-4" />
            แปลงเป็นใบเสร็จ
          </button>

          {/* Convert to Quotation */}
          <button
            type="button"
            onClick={() => handleProceedWithAutoSave('quotation')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            สร้างใบเสนอราคา
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2-Column Side-by-Side Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5/12): Original Scanned Receipt Image Viewer */}
        <div className="lg:col-span-5 sticky top-20">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                ภาพบิลต้นฉบับ (Original Receipt)
              </span>
              <span className="text-[11px] text-slate-400">ซูมเข้า/ออก หรือหมุนภาพได้</span>
            </div>
            <div className="h-[520px]">
              <ImageViewer
                imageUrl={imageUrl}
                fileName={fileName}
                onReplaceImage={onReset}
              />
            </div>
          </div>
        </div>

        {/* Right Column (7/12): Extracted Data Form (Freely Editable) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Document Type Toggle & Key Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            {/* Document Type Selector (บิลรายจ่าย vs บิลรายรับ) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                ประเภทเอกสาร (Document Type)
              </label>
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDocType('expense')}
                  className={`py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    docType === 'expense'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-white/80"></span>
                  บิลรายจ่าย (Expense)
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('income')}
                  className={`py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    docType === 'income'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-white/80"></span>
                  บิลรายรับ (Income)
                </button>
              </div>
            </div>

            {/* Merchant & Document Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  ชื่อร้านค้า / คู่ค้า
                </label>
                <input
                  type="text"
                  value={data.merchantName || ''}
                  onChange={(e) => handleFieldChange('merchantName', e.target.value)}
                  placeholder="เช่น บริษัท ออฟฟิศ ซัพพลาย จำกัด หรือ ร้านสมใจ"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  เลขประจำตัวผู้เสียภาษี (Tax ID)
                </label>
                <input
                  type="text"
                  value={data.taxId || ''}
                  onChange={(e) => handleFieldChange('taxId', e.target.value)}
                  placeholder="เช่น 01055xxxxxxxx (13 หลัก)"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  วันที่บนบิล (Date)
                </label>
                <input
                  type="date"
                  value={data.date || ''}
                  onChange={(e) => handleFieldChange('date', e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  เลขที่ใบเสร็จ / บิล (Receipt No.)
                </label>
                <input
                  type="text"
                  value={data.receiptNumber || ''}
                  onChange={(e) => handleFieldChange('receiptNumber', e.target.value)}
                  placeholder="เช่น INV-2026-0891 หรือ RC-0045"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  วิธีชำระเงิน (Payment Method)
                </label>
                <input
                  type="text"
                  value={data.paymentMethod || ''}
                  onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}
                  placeholder="เช่น โอนเงินผ่านธนาคาร, PromptPay, เงินสด"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  เบอร์โทรศัพท์ร้านค้า
                </label>
                <input
                  type="text"
                  value={data.phone || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="เช่น 02-234-5678 หรือ 081-234-5678"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                ที่อยู่ร้านค้า / สาขา
              </label>
              <input
                type="text"
                value={data.address || ''}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="เช่น 99/1 ถนนสุขุมวิท 21 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพฯ 10110"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Card 2: Line Items List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600" />
                รายการสินค้าในบิล ({data.items.length} รายการ)
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                เพิ่มรายการ
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3">ชื่อสินค้า / บริการ</th>
                    <th className="py-2.5 px-2 w-16 text-center">จำนวน</th>
                    <th className="py-2.5 px-2 w-16 text-center">หน่วย</th>
                    <th className="py-2.5 px-3 w-24 text-right">ราคา/หน่วย</th>
                    <th className="py-2.5 px-3 w-24 text-right">ราคารวม</th>
                    <th className="py-2.5 px-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-center text-slate-400">{index + 1}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          placeholder="เช่น ค่าบริการ หรือ สินค้า"
                          className="w-full text-xs px-2 py-1 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded bg-white"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || ''}
                          onChange={(e) =>
                            handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          placeholder="1"
                          className="w-full text-xs px-1.5 py-1 text-center border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded bg-white font-mono"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.unit || ''}
                          onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                          placeholder="เช่น ชิ้น"
                          className="w-full text-xs px-1.5 py-1 text-center border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded bg-white"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice === 0 ? '' : item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          className="w-full text-xs px-2 py-1 text-right border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded bg-white font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(item.totalPrice)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        <p className="font-medium">ไม่มีรายการสินค้า</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          กดปุ่ม <span className="text-blue-600 font-semibold">+ เพิ่มรายการ</span> ด้านบนเพื่อเริ่มกรอกข้อมูล
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Box */}
            <div className="p-5 bg-slate-50/80 border-t border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>ยอดรวมย่อย (Subtotal):</span>
                <span className="font-mono font-semibold">{formatCurrency(subtotal)} ฿</span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>ส่วนลด (Discount):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.discount === 0 ? '' : (data.discount || '')}
                    onChange={(e) => handleFieldChange('discount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 text-right border border-slate-300 rounded font-mono text-xs"
                  />
                  <span>฿</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>ภาษีมูลค่าเพิ่ม (VAT):</span>
                  <select
                    value={data.taxRate || 7}
                    onChange={(e) => handleFieldChange('taxRate', parseFloat(e.target.value) || 0)}
                    className="px-2 py-0.5 border border-slate-300 rounded text-xs"
                  >
                    <option value={7}>7%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>
                <span className="font-mono font-semibold">{formatCurrency(vatAmount)} ฿</span>
              </div>

              <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-bold text-slate-900">
                <span>ยอดรวมทั้งสิ้น (Grand Total):</span>
                <span className="font-mono text-base text-blue-700 font-bold">
                  {formatCurrency(grandTotal)} ฿
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
