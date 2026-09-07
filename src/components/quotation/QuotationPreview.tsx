'use client';

import React, { useState } from 'react';
import {
  Printer,
  ArrowLeft,
  Download,
  Check,
  Copy,
  Receipt,
  FileText,
  Calendar,
  Upload,
  Image as ImageIcon,
  Trash2,
  Truck,
} from 'lucide-react';
import { Quotation, OutputDocType } from '@/lib/types';
import { formatCurrency, formatDate, bahtText } from '@/lib/formatters';

interface QuotationPreviewProps {
  quotation: Quotation;
  onBackToEdit: () => void;
  onToggleDocType?: (type: OutputDocType) => void;
  onUpdateQuotation?: (quotation: Quotation) => void;
}

export default function QuotationPreview({
  quotation,
  onBackToEdit,
  onToggleDocType,
  onUpdateQuotation,
}: QuotationPreviewProps) {
  const [copied, setCopied] = useState(false);
  const isReceipt = quotation.docType === 'receipt';
  const isDeliveryOrder = quotation.docType === 'delivery_order';

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('กรุณาเลือกไฟล์รูปภาพขนาดไม่เกิน 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const base64 = loadEvt.target?.result as string;
      if (base64 && onUpdateQuotation) {
        onUpdateQuotation({
          ...quotation,
          seller: { ...quotation.seller, logoUrl: base64 },
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('company_logo', base64);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    if (onUpdateQuotation) {
      onUpdateQuotation({
        ...quotation,
        seller: { ...quotation.seller, logoUrl: '' },
      });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('company_logo');
      }
    }
  };

  // Calculations
  const subtotal = quotation.items.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
  const discount = Math.max(0, quotation.discount || 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const vatAmount = (taxableAmount * (quotation.vatRate || 0)) / 100;
  const withholdingTaxAmount = (taxableAmount * (quotation.withholdingTaxRate || 0)) / 100;
  const grandTotal = taxableAmount + vatAmount - withholdingTaxAmount;

  const handlePrint = () => {
    window.print();
  };

  const docTitleThai = isDeliveryOrder
    ? 'ใบส่งของ'
    : isReceipt
    ? 'ใบเสร็จรับเงิน'
    : 'ใบเสนอราคา';
  const docTitleEng = isDeliveryOrder
    ? 'DELIVERY ORDER'
    : isReceipt
    ? 'RECEIPT'
    : 'QUOTATION';

  const handleCopySummary = () => {
    const customerLabel = isDeliveryOrder ? 'ลูกค้า/ผู้รับสินค้า' : isReceipt ? 'ลูกค้า/ผู้จ่ายเงิน' : 'ลูกค้า';
    const text = `${docTitleThai}: ${quotation.quotationNumber}\n${customerLabel}: ${quotation.client.name}\nยอดรวมทั้งสิ้น: ฿${formatCurrency(grandTotal)} (${bahtText(grandTotal)})\nวันที่: ${quotation.issueDate}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(quotation, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${quotation.quotationNumber || 'document'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToEdit}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          กลับไปแก้ไขเอกสาร
        </button>

        {/* 1-Click Document Type Toggle in Preview */}
        {onToggleDocType && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onToggleDocType('quotation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                quotation.docType === 'quotation'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              ใบเสนอราคา (Quotation)
            </button>
            <button
              type="button"
              onClick={() => onToggleDocType('receipt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isReceipt
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              ใบเสร็จรับเงิน (Receipt)
            </button>
            <button
              type="button"
              onClick={() => onToggleDocType('delivery_order')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isDeliveryOrder
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              ใบส่งของ (Delivery Order)
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'คัดลอกแล้ว' : 'คัดลอกสรุป'}
          </button>

          <button
            type="button"
            onClick={handleDownloadJSON}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            ดาวน์โหลด JSON
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className={`inline-flex items-center gap-2 px-5 py-2 text-white text-xs font-bold rounded-lg shadow hover:shadow-md transition-all ${
              isDeliveryOrder
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : isReceipt
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Printer className="w-4 h-4" />
            สั่งพิมพ์ / บันทึก PDF (A4)
          </button>
        </div>
      </div>

      {/* A4 Printable Document Container */}
      <div className="print-area max-w-[210mm] mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-md print:shadow-none print:p-0 print:max-w-none text-slate-800 text-xs">
        {/* Header: Company Profile & Document Title */}
        <div className="flex justify-between items-start border-b border-slate-300 pb-6 mb-6">
          <div className="flex items-start gap-4 max-w-xl">
            {quotation.seller.logoUrl ? (
              <div className="relative group shrink-0">
                <img
                  src={quotation.seller.logoUrl}
                  alt="Company Logo"
                  className="w-20 h-20 md:w-24 md:h-24 object-contain rounded-lg border border-slate-200 p-1 bg-white shadow-2xs"
                />
                {onUpdateQuotation && (
                  <div className="print:hidden absolute inset-0 bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 rounded-lg flex flex-col items-center justify-center transition-opacity gap-1 p-1">
                    <label className="text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer hover:underline">
                      <Upload className="w-3 h-3" />
                      เปลี่ยน
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-[10px] text-red-300 hover:text-red-100 flex items-center gap-0.5 hover:underline"
                    >
                      <Trash2 className="w-3 h-3" />
                      ลบ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              onUpdateQuotation && (
                <label className="print:hidden flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 text-slate-400 hover:text-blue-600 cursor-pointer transition-all shrink-0 p-1 text-center">
                  <ImageIcon className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-semibold leading-tight">+ ใส่โลโก้</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )
            )}

            <div className="space-y-1">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {quotation.seller.name || 'ชื่อบริษัท / ผู้ประกอบการ'}
              </h1>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {quotation.seller.address || '-'}
              </p>
              <div className="text-slate-600 text-[11px] space-y-0.5 pt-1">
                <p>
                  <span className="font-semibold">เลขประจำตัวผู้เสียภาษี:</span>{' '}
                  <span className="font-mono">{quotation.seller.taxId || '-'}</span>
                  {quotation.seller.branch && ` (${quotation.seller.branch})`}
                </p>
                <p>
                  <span className="font-semibold">โทร:</span> {quotation.seller.phone || '-'}{' '}
                  {quotation.seller.email && `| อีเมล: ${quotation.seller.email}`}
                </p>
              </div>
            </div>
          </div>

          <div className="text-right space-y-2">
            <div
              className={`inline-block px-4 py-1.5 rounded text-sm font-bold tracking-wider uppercase text-white ${
                isDeliveryOrder ? 'bg-indigo-900' : isReceipt ? 'bg-emerald-800' : 'bg-slate-900'
              }`}
            >
              {docTitleThai}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              {docTitleEng}
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-left min-w-[240px] space-y-2 text-[11px]">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-medium shrink-0">เลขที่ / No:</span>
                <span className="hidden print:inline font-mono font-bold text-slate-900">
                  {quotation.quotationNumber || '-'}
                </span>
                <input
                  type="text"
                  value={quotation.quotationNumber || ''}
                  onChange={(e) => onUpdateQuotation?.({ ...quotation, quotationNumber: e.target.value })}
                  placeholder={
                    isDeliveryOrder
                      ? 'เช่น DO-202609-001'
                      : isReceipt
                      ? 'เช่น RC-202609-001'
                      : 'เช่น QT-202609-001'
                  }
                  className="print:hidden font-mono font-bold text-slate-900 text-xs py-0.5 px-2 border border-slate-300 hover:border-blue-400 focus:border-blue-500 rounded bg-white text-right w-36 shadow-2xs"
                  title="คลิกเพื่อแก้ไขเลขที่เอกสาร"
                />
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 print:hidden" />
                  {isDeliveryOrder ? 'วันที่ส่งของ / Date:' : 'วันที่ / Date:'}
                </span>
                <span className="hidden print:inline text-slate-800 font-medium">
                  {formatDate(quotation.issueDate)}
                </span>
                <div className="print:hidden flex items-center gap-1.5">
                  <input
                    type="date"
                    value={quotation.issueDate || ''}
                    onChange={(e) =>
                      onUpdateQuotation?.({ ...quotation, issueDate: e.target.value })
                    }
                    className="text-xs text-slate-800 py-0.5 px-2 border border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded bg-white cursor-pointer shadow-2xs"
                    title="คลิกเพื่อแก้ไขวันที่เอกสาร"
                  />
                  <span className="text-[11px] text-slate-700 font-semibold whitespace-nowrap bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                    {formatDate(quotation.issueDate)}
                  </span>
                </div>
              </div>

              {isDeliveryOrder ? (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium shrink-0">เลขที่ใบสั่งซื้อ / PO:</span>
                  <span className="hidden print:inline font-mono font-medium text-slate-800">
                    {quotation.poNumber || '-'}
                  </span>
                  <input
                    type="text"
                    value={quotation.poNumber || ''}
                    onChange={(e) => onUpdateQuotation?.({ ...quotation, poNumber: e.target.value })}
                    placeholder="เช่น PO-2026-088"
                    className="print:hidden font-mono text-xs text-slate-800 py-0.5 px-2 border border-slate-300 hover:border-indigo-400 focus:border-indigo-500 rounded bg-white text-right w-36 shadow-2xs font-medium"
                    title="คลิกเพื่อแก้ไขเลขที่ใบสั่งซื้อ"
                  />
                </div>
              ) : isReceipt ? (
                <>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 print:hidden" />
                      วันที่ชำระ / Paid:
                    </span>
                    <span className="hidden print:inline text-slate-800 font-medium">
                      {formatDate(quotation.paymentDate || quotation.issueDate)}
                    </span>
                    <div className="print:hidden flex items-center gap-1.5">
                      <input
                        type="date"
                        value={quotation.paymentDate || quotation.issueDate || ''}
                        onChange={(e) =>
                          onUpdateQuotation?.({ ...quotation, paymentDate: e.target.value })
                        }
                        className="text-xs text-slate-800 py-0.5 px-2 border border-slate-300 hover:border-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded bg-white cursor-pointer shadow-2xs"
                        title="คลิกเพื่อแก้ไขวันที่ชำระเงิน"
                      />
                      <span className="text-[11px] text-emerald-700 font-semibold whitespace-nowrap bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        {formatDate(quotation.paymentDate || quotation.issueDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-medium shrink-0">วิธีชำระ / Method:</span>
                    <span className="hidden print:inline text-slate-800 font-medium">
                      {quotation.paymentMethod || '-'}
                    </span>
                    <input
                      type="text"
                      value={quotation.paymentMethod || ''}
                      onChange={(e) =>
                        onUpdateQuotation?.({ ...quotation, paymentMethod: e.target.value })
                      }
                      placeholder="เช่น โอนเงินผ่านธนาคาร"
                      className="print:hidden text-xs text-slate-800 py-0.5 px-2 border border-slate-300 hover:border-emerald-400 focus:border-emerald-500 rounded bg-white text-right w-36 shadow-2xs font-medium"
                      title="คลิกเพื่อแก้ไขวิธีชำระเงิน"
                    />
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 print:hidden" />
                    ยืนราคาถึง / Valid:
                  </span>
                  <span className="hidden print:inline text-slate-800 font-medium">
                    {formatDate(quotation.validUntil)}
                  </span>
                  <div className="print:hidden flex items-center gap-1.5">
                    <input
                      type="date"
                      value={quotation.validUntil || ''}
                      onChange={(e) =>
                        onUpdateQuotation?.({ ...quotation, validUntil: e.target.value })
                      }
                      className="text-xs text-slate-800 py-0.5 px-2 border border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded bg-white cursor-pointer shadow-2xs"
                      title="คลิกเพื่อแก้ไขกำหนดยืนราคาถึง"
                    />
                    <span className="text-[11px] text-slate-700 font-semibold whitespace-nowrap bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {formatDate(quotation.validUntil)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Information Block */}
        <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            {isDeliveryOrder
              ? 'ข้อมูลผู้รับสินค้า / สถานที่จัดส่ง (Consignee):'
              : isReceipt
              ? 'ข้อมูลผู้จ่ายเงิน / Received From:'
              : 'ข้อมูลลูกค้า / Bill To:'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-sm">{quotation.client.name || '-'}</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {quotation.client.address || '-'}
              </p>
            </div>
            <div className="space-y-1 text-slate-600 text-[11px]">
              <p>
                <span className="font-semibold">เลขประจำตัวผู้เสียภาษี:</span>{' '}
                <span className="font-mono">{quotation.client.taxId || '-'}</span>
              </p>
              <p>
                <span className="font-semibold">ติดต่อ/โทร:</span> {quotation.client.phone || '-'}
              </p>
              {quotation.client.email && (
                <p>
                  <span className="font-semibold">อีเมล:</span> {quotation.client.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-6 border border-slate-300 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 text-[11px]">
                <th className="py-2.5 px-3 w-12 text-center border-r border-slate-300">ลำดับ</th>
                <th className="py-2.5 px-3 border-r border-slate-300">รายการสินค้า / บริการ</th>
                <th className="py-2.5 px-3 w-16 text-center border-r border-slate-300">จำนวน</th>
                <th className="py-2.5 px-3 w-16 text-center border-r border-slate-300">หน่วย</th>
                <th className="py-2.5 px-3 w-28 text-right border-r border-slate-300">ราคาต่อหน่วย</th>
                <th className="py-2.5 px-3 w-28 text-right">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              {quotation.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 text-center text-slate-500 border-r border-slate-200">
                    {index + 1}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-800 border-r border-slate-200">
                    {item.name || '-'}
                  </td>
                  <td className="py-2 px-3 text-center font-mono border-r border-slate-200">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-600 border-r border-slate-200">
                    {item.unit || 'รายการ'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono border-r border-slate-200">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                    {formatCurrency(item.totalPrice)}
                  </td>
                </tr>
              ))}
              {/* Minimum row padding if few items */}
              {Array.from({ length: Math.max(0, 5 - quotation.items.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-8">
                  <td className="border-r border-slate-200"></td>
                  <td className="border-r border-slate-200"></td>
                  <td className="border-r border-slate-200"></td>
                  <td className="border-r border-slate-200"></td>
                  <td className="border-r border-slate-200"></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Thai Baht text & Totals Summary */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7 flex flex-col justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                จำนวนเงินตัวอักษร (Total in Words)
              </div>
              <div className="text-xs font-semibold text-slate-800">
                {bahtText(grandTotal)}
              </div>
            </div>

            {(quotation.paymentTerms || quotation.notes || quotation.paymentMethod || (isDeliveryOrder && quotation.poNumber)) && (
              <div className="pt-3 mt-3 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                {isDeliveryOrder && quotation.poNumber && (
                  <p>
                    <span className="font-semibold text-slate-700">เลขที่ใบสั่งซื้ออ้างอิง (PO No.):</span>{' '}
                    {quotation.poNumber}
                  </p>
                )}
                {isReceipt && quotation.paymentMethod && (
                  <p>
                    <span className="font-semibold text-slate-700">วิธีการชำระเงิน:</span>{' '}
                    {quotation.paymentMethod}
                  </p>
                )}
                {!isReceipt && !isDeliveryOrder && quotation.paymentTerms && (
                  <p>
                    <span className="font-semibold text-slate-700">เงื่อนไขการชำระเงิน:</span>{' '}
                    {quotation.paymentTerms}
                  </p>
                )}
                {quotation.notes && (
                  <p>
                    <span className="font-semibold text-slate-700">หมายเหตุ:</span> {quotation.notes}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="md:col-span-5 border border-slate-200 rounded-lg p-3 space-y-1.5 text-[11px] bg-white">
            <div className="flex justify-between text-slate-600">
              <span>รวมเป็นเงิน (Subtotal):</span>
              <span className="font-mono font-medium">{formatCurrency(subtotal)} ฿</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>หักส่วนลด (Discount):</span>
                <span className="font-mono font-medium">-{formatCurrency(discount)} ฿</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>ยอดหลังหักส่วนลด:</span>
              <span className="font-mono font-medium">{formatCurrency(taxableAmount)} ฿</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>ภาษีมูลค่าเพิ่ม VAT {quotation.vatRate}%:</span>
              <span className="font-mono font-medium">{formatCurrency(vatAmount)} ฿</span>
            </div>

            {withholdingTaxAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>หักภาษี ณ ที่จ่าย {quotation.withholdingTaxRate}%:</span>
                <span className="font-mono font-medium">
                  -{formatCurrency(withholdingTaxAmount)} ฿
                </span>
              </div>
            )}

            <div className="pt-2 mt-1 border-t border-slate-300 flex justify-between items-center text-sm font-bold text-slate-900">
              <span>ยอดเงินรวมทั้งสิ้น:</span>
              <span
                className={`font-mono text-base font-bold ${
                  isDeliveryOrder
                    ? 'text-indigo-700'
                    : isReceipt
                    ? 'text-emerald-700'
                    : 'text-blue-700'
                }`}
              >
                {formatCurrency(grandTotal)} ฿
              </span>
            </div>
          </div>
        </div>

        {/* Signature Blocks - Dynamically tailored for Quotation vs Receipt vs Delivery Order */}
        <div className="avoid-break mt-12 grid grid-cols-2 gap-8 pt-4">
          {isDeliveryOrder ? (
            <>
              <div className="text-center space-y-3">
                <div className="text-[11px] text-slate-600 font-medium">
                  ในนาม {quotation.client.name || 'ผู้รับสินค้า'} (Consignee)
                </div>
                <div className="text-[10px] text-slate-500 italic py-1 border-y border-dashed border-slate-200">
                  ได้รับสินค้าตามรายการข้างต้นถูกต้อง ครบถ้วน ในสภาพเรียบร้อยแล้ว
                </div>
                <div className="pt-6">
                  <div className="w-48 mx-auto border-b border-slate-400"></div>
                  <div className="text-[11px] text-slate-500 mt-1.5">
                    (......................................................)
                    <p className="mt-1">ผู้รับสินค้า / วันที่ ....../....../......</p>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-3">
                <div className="text-[11px] text-slate-600 font-medium">
                  ในนาม {quotation.seller.name || 'ผู้ส่งสินค้า'} (Shipper)
                </div>
                <div className="text-[10px] text-transparent select-none py-1">
                  &nbsp;
                </div>
                <div className="pt-6">
                  <div className="w-48 mx-auto border-b border-slate-400"></div>
                  <div className="text-[11px] text-slate-500 mt-1.5">
                    (......................................................)
                    <p className="mt-1">ผู้ส่งสินค้า / วันที่ ....../....../......</p>
                  </div>
                </div>
              </div>
            </>
          ) : isReceipt ? (
            <>
              <div className="text-center space-y-10">
                <div className="text-[11px] text-slate-600 font-medium">
                  ในนาม {quotation.client.name || 'ผู้จ่ายเงิน'} (Payer)
                </div>
                <div className="w-48 mx-auto border-b border-slate-400"></div>
                <div className="text-[11px] text-slate-500">
                  (......................................................)
                  <p className="mt-1">ผู้จ่ายเงิน / วันที่ ....../....../......</p>
                </div>
              </div>

              <div className="text-center space-y-10">
                <div className="text-[11px] text-slate-600 font-medium">
                  ในนาม {quotation.seller.name || 'ผู้รับเงิน'} (Payee)
                </div>
                <div className="w-48 mx-auto border-b border-slate-400"></div>
                <div className="text-[11px] text-slate-500">
                  (......................................................)
                  <p className="mt-1">ผู้รับเงิน / วันที่ ....../....../......</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-10">
                <div className="text-[11px] text-slate-600 font-medium">
                  ในนาม {quotation.client.name || 'ผู้สั่งซื้อ / ผู้รับข้อเสนอ'}
                </div>
                <div className="w-48 mx-auto border-b border-slate-400"></div>
                <div className="text-[11px] text-slate-500">
                  (......................................................)
                  <p className="mt-1">วันที่ ....../....../......</p>
                </div>
              </div>

              <div className="text-center space-y-10">
                <div className="text-[11px] text-slate-600 font-medium">
                  ในนาม {quotation.seller.name || 'ผู้เสนอราคา'}
                </div>
                <div className="w-48 mx-auto border-b border-slate-400"></div>
                <div className="text-[11px] text-slate-500">
                  (......................................................)
                  <p className="mt-1">ผู้มีอำนาจลงนาม / Authorized Signature</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
