'use client';

import React from 'react';
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
  FileSpreadsheet,
  Receipt,
  FileText,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { Quotation, ReceiptItem, OutputDocType } from '@/lib/types';
import { formatCurrency, bahtText } from '@/lib/formatters';

interface QuotationEditorProps {
  quotation: Quotation;
  onChange: (updated: Quotation) => void;
  onPreview: () => void;
  onBackToScan: () => void;
  scannedImagePreview?: string | null;
}

export default function QuotationEditor({
  quotation,
  onChange,
  onPreview,
  onBackToScan,
  scannedImagePreview,
}: QuotationEditorProps) {
  const isReceipt = quotation.docType === 'receipt';

  // Toggle Document Type between Quotation and Receipt
  const handleToggleDocType = (type: OutputDocType) => {
    let newDocNumber = quotation.quotationNumber;
    if (newDocNumber) {
      if (type === 'receipt') {
        if (newDocNumber.startsWith('QT-')) {
          newDocNumber = newDocNumber.replace(/^QT-/, 'RC-');
        } else if (!newDocNumber.startsWith('RC-')) {
          newDocNumber = `RC-${newDocNumber}`;
        }
      } else {
        if (newDocNumber.startsWith('RC-')) {
          newDocNumber = newDocNumber.replace(/^RC-/, 'QT-');
        } else if (!newDocNumber.startsWith('QT-')) {
          newDocNumber = `QT-${newDocNumber}`;
        }
      }
    }

    onChange({
      ...quotation,
      docType: type,
      quotationNumber: newDocNumber,
      paymentDate: quotation.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: quotation.paymentMethod || '',
    });
  };

  // Update item field
  const handleItemChange = (id: string, field: keyof ReceiptItem, value: any) => {
    const updatedItems = quotation.items.map((item) => {
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

    const newSubtotal = updatedItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
    onChange({
      ...quotation,
      items: updatedItems,
      subtotal: newSubtotal,
    });
  };

  // Add new blank item
  const handleAddItem = () => {
    const newItem: ReceiptItem = {
      id: `item-${Date.now()}`,
      name: '',
      quantity: 1,
      unit: '',
      unitPrice: 0,
      totalPrice: 0,
    };
    onChange({
      ...quotation,
      items: [...quotation.items, newItem],
    });
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    const updatedItems = quotation.items.filter((item) => item.id !== id);
    const newSubtotal = updatedItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
    onChange({
      ...quotation,
      items: updatedItems,
      subtotal: newSubtotal,
    });
  };

  // Calculations
  const subtotal = quotation.items.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
  const discount = Math.max(0, quotation.discount || 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const vatAmount = (taxableAmount * (quotation.vatRate || 0)) / 100;
  const withholdingTaxAmount = (taxableAmount * (quotation.withholdingTaxRate || 0)) / 100;
  const grandTotal = taxableAmount + vatAmount - withholdingTaxAmount;

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={onBackToScan}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          กลับไปตรวจสอบบิล
        </button>

        {/* 1-Click Document Type Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => handleToggleDocType('quotation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isReceipt
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            ใบเสนอราคา (Quotation)
          </button>
          <button
            type="button"
            onClick={() => handleToggleDocType('receipt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isReceipt
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            ใบเสร็จรับเงิน (Receipt)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPreview}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all ${
              isReceipt ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            ดูตัวอย่าง & สั่งพิมพ์ A4
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Scanned Receipt reference & Document Details */}
        <div className="lg:col-span-4 space-y-6">
          {scannedImagePreview && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                ภาพบิลต้นฉบับ (Scanned Receipt)
              </h3>
              <div className="rounded-xl overflow-hidden border border-slate-200 max-h-72 overflow-y-auto bg-slate-50 flex items-center justify-center">
                <img
                  src={scannedImagePreview}
                  alt="Original Receipt"
                  className="w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Document Metadata Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                {isReceipt ? (
                  <Receipt className="w-4 h-4 text-emerald-600" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                )}
                {isReceipt ? 'ข้อมูลใบเสร็จรับเงิน' : 'ข้อมูลใบเสนอราคา'}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isReceipt ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                }`}
              >
                {isReceipt ? 'RECEIPT' : 'QUOTATION'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {isReceipt ? 'เลขที่ใบเสร็จรับเงิน (Receipt No.)' : 'เลขที่ใบเสนอราคา (Quotation No.)'}
              </label>
              <input
                type="text"
                value={quotation.quotationNumber}
                onChange={(e) => onChange({ ...quotation, quotationNumber: e.target.value })}
                placeholder={isReceipt ? 'เช่น RC-202609-001' : 'เช่น QT-202609-001'}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isReceipt ? 'วันที่ออกใบเสร็จ' : 'วันที่ออกเอกสาร'}
                </label>
                <input
                  type="date"
                  value={quotation.issueDate}
                  onChange={(e) => onChange({ ...quotation, issueDate: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isReceipt ? 'วันที่ชำระเงิน (Payment Date)' : 'กำหนดยืนราคาถึง'}
                </label>
                <input
                  type="date"
                  value={isReceipt ? quotation.paymentDate || quotation.issueDate : quotation.validUntil}
                  onChange={(e) =>
                    onChange({
                      ...quotation,
                      [isReceipt ? 'paymentDate' : 'validUntil']: e.target.value,
                    })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Payment Method field (specifically active for Receipt) */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {isReceipt ? 'วิธีการชำระเงิน (Payment Method)' : 'เงื่อนไขการชำระเงิน (Payment Terms)'}
              </label>
              <input
                type="text"
                value={isReceipt ? quotation.paymentMethod || '' : quotation.paymentTerms}
                onChange={(e) =>
                  onChange({
                    ...quotation,
                    [isReceipt ? 'paymentMethod' : 'paymentTerms']: e.target.value,
                  })
                }
                placeholder={
                  isReceipt
                    ? 'เช่น โอนเงินผ่านธนาคาร, PromptPay, เงินสด'
                    : 'เช่น เครดิต 30 วัน, มัดจำ 50%, ชำระทันทีเมื่อส่งมอบงาน'
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {isReceipt && (
                <div className="flex gap-1.5 mt-1.5">
                  {['โอนเงินผ่านธนาคาร', 'เงินสด', 'PromptPay', 'บัตรเครดิต'].map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => onChange({ ...quotation, paymentMethod: pm })}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                หมายเหตุเพิ่มเติม (Notes)
              </label>
              <textarea
                rows={2}
                value={quotation.notes}
                onChange={(e) => onChange({ ...quotation, notes: e.target.value })}
                placeholder="เช่น รับประกันสินค้า 1 ปี, ราคารวมภาษีมูลค่าเพิ่ม 7% แล้ว, กำหนดส่งมอบภายใน 7 วัน..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Seller / My Company Profile */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-blue-600" />
              {isReceipt ? 'ข้อมูลผู้รับเงิน (Payee / บริษัทของคุณ)' : 'ข้อมูลผู้ออกเอกสาร (ผู้ขาย / ฝ่ายเสนอราคา)'}
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">ชื่อบริษัท / ร้านค้า</label>
              <input
                type="text"
                value={quotation.seller.name}
                onChange={(e) =>
                  onChange({
                    ...quotation,
                    seller: { ...quotation.seller, name: e.target.value },
                  })
                }
                placeholder={
                  isReceipt
                    ? 'เช่น บริษัท ผู้รับเงิน จำกัด หรือชื่อร้านของคุณ'
                    : 'เช่น บริษัท ผู้ขาย จำกัด หรือชื่อร้านของคุณ'
                }
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">เลขผู้เสียภาษี</label>
                <input
                  type="text"
                  value={quotation.seller.taxId}
                  onChange={(e) =>
                    onChange({
                      ...quotation,
                      seller: { ...quotation.seller, taxId: e.target.value },
                    })
                  }
                  placeholder="เช่น 01055xxxxxxxx (13 หลัก)"
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={quotation.seller.phone}
                  onChange={(e) =>
                    onChange({
                      ...quotation,
                      seller: { ...quotation.seller, phone: e.target.value },
                    })
                  }
                  placeholder="เช่น 02-999-8888 หรือ 081-234-5678"
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">ที่อยู่</label>
              <textarea
                rows={2}
                value={quotation.seller.address}
                onChange={(e) =>
                  onChange({
                    ...quotation,
                    seller: { ...quotation.seller, address: e.target.value },
                  })
                }
                placeholder="เช่น 123 อาคารสยามทาวเวอร์ ชั้น 15 ถนนพระราม 9 แขวงห้วยขวาง กรุงเทพฯ 10310"
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right column: Client Info & Line Items Table */}
        <div className="lg:col-span-8 space-y-6">
          {/* Client Info Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-emerald-600" />
              {isReceipt ? 'ข้อมูลผู้จ่ายเงิน / ลูกค้า (Payer)' : 'ข้อมูลลูกค้า / ผู้รับการเสนอราคา (Client)'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  {isReceipt ? 'ชื่อผู้จ่ายเงิน / ลูกค้า' : 'ชื่อบริษัท / ลูกค้า'}
                </label>
                <input
                  type="text"
                  value={quotation.client.name}
                  onChange={(e) =>
                    onChange({
                      ...quotation,
                      client: { ...quotation.client, name: e.target.value },
                    })
                  }
                  placeholder={
                    isReceipt
                      ? 'เช่น บริษัท ลูกค้า จำกัด หรือ ชื่อผู้จ่ายเงิน'
                      : 'เช่น บริษัท ลูกค้า จำกัด หรือ ชื่อผู้รับการเสนอราคา'
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                <input
                  type="text"
                  value={quotation.client.taxId}
                  onChange={(e) =>
                    onChange({
                      ...quotation,
                      client: { ...quotation.client, taxId: e.target.value },
                    })
                  }
                  placeholder="เช่น 01055xxxxxxxx หรือ เลขประจำตัวประชาชน"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">เบอร์โทรศัพท์ / อีเมล</label>
                <input
                  type="text"
                  value={quotation.client.phone}
                  onChange={(e) =>
                    onChange({
                      ...quotation,
                      client: { ...quotation.client, phone: e.target.value },
                    })
                  }
                  placeholder="เช่น 02-123-4567 หรือ customer@company.com"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">ที่อยู่ลูกค้า</label>
                <input
                  type="text"
                  value={quotation.client.address}
                  onChange={(e) =>
                    onChange({
                      ...quotation,
                      client: { ...quotation.client, address: e.target.value },
                    })
                  }
                  placeholder="เช่น 88/9 อาคารพญาไทคอมเพล็กซ์ ถนนพญาไท แขวงทุ่งพญาไท กรุงเทพฯ 10400"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                รายการสินค้าและบริการ ({quotation.items.length} รายการ)
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                เพิ่มรายการ
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/75 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3">รายละเอียดสินค้า / บริการ</th>
                    <th className="py-3 px-3 w-20 text-center">จำนวน</th>
                    <th className="py-3 px-3 w-20 text-center">หน่วย</th>
                    <th className="py-3 px-3 w-28 text-right">ราคา/หน่วย (฿)</th>
                    <th className="py-3 px-3 w-28 text-right">ราคารวม (฿)</th>
                    <th className="py-3 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotation.items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          placeholder="เช่น บริการพัฒนาเว็บไซต์ หรือ Dell UltraSharp 27"
                          className="w-full text-xs px-2.5 py-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded transition-all"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || ''}
                          onChange={(e) =>
                            handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          placeholder="1"
                          className="w-full text-xs px-2 py-1.5 text-center bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded transition-all font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.unit || ''}
                          onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                          placeholder="เช่น ชิ้น, งาน"
                          className="w-full text-xs px-2 py-1.5 text-center bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded transition-all"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice === 0 ? '' : item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          className="w-full text-xs px-2 py-1.5 text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded transition-all font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(item.totalPrice)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                          title="ลบแถวนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary Box */}
            <div className="p-6 bg-slate-50 border-t border-slate-200">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    จำนวนเงินตัวอักษร (Thai Baht Text):
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700">
                    {bahtText(grandTotal)}
                  </div>
                </div>

                <div className="w-full md:w-80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>รวมเป็นเงิน (Subtotal):</span>
                    <span className="font-mono font-semibold">{formatCurrency(subtotal)} ฿</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>ส่วนลด (Discount ฿):</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={quotation.discount === 0 ? '' : quotation.discount}
                      onChange={(e) =>
                        onChange({
                          ...quotation,
                          discount: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                      className="w-24 px-2 py-1 text-right border border-slate-300 rounded font-mono"
                    />
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>ภาษีมูลค่าเพิ่ม (VAT):</span>
                      <select
                        value={quotation.vatRate}
                        onChange={(e) =>
                          onChange({
                            ...quotation,
                            vatRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="px-1.5 py-0.5 border border-slate-300 rounded text-xs"
                      >
                        <option value={7}>7%</option>
                        <option value={0}>0%</option>
                      </select>
                    </div>
                    <span className="font-mono font-semibold">{formatCurrency(vatAmount)} ฿</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>หัก ณ ที่จ่าย (WHT):</span>
                      <select
                        value={quotation.withholdingTaxRate}
                        onChange={(e) =>
                          onChange({
                            ...quotation,
                            withholdingTaxRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="px-1.5 py-0.5 border border-slate-300 rounded text-xs"
                      >
                        <option value={0}>ไม่หัก (0%)</option>
                        <option value={1}>ค่าขนส่ง (1%)</option>
                        <option value={3}>ค่าบริการ (3%)</option>
                      </select>
                    </div>
                    <span className="font-mono font-semibold text-red-600">
                      -{formatCurrency(withholdingTaxAmount)} ฿
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-bold text-slate-900">
                    <span>จำนวนเงินรวมทั้งสิ้น:</span>
                    <span className="font-mono text-blue-600 text-base">
                      {formatCurrency(grandTotal)} ฿
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
