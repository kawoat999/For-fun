'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Trash2,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  Receipt,
  Search,
  Eye,
  FileText,
  Truck,
} from 'lucide-react';
import { SavedReceipt, ReceiptData, OutputDocType } from '@/lib/types';
import { getSavedReceipts, deleteSavedReceipt, exportReceiptsToCSV } from '@/lib/storage';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface ReceiptHistoryProps {
  onLoadIntoQuotation: (receipt: ReceiptData, targetDocType?: OutputDocType) => void;
  onViewReceipt: (receipt: SavedReceipt) => void;
}

export default function ReceiptHistory({
  onLoadIntoQuotation,
  onViewReceipt,
}: ReceiptHistoryProps) {
  const [receipts, setReceipts] = useState<SavedReceipt[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load receipts on mount
  useEffect(() => {
    setReceipts(getSavedReceipts());
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm('คุณต้องการลบรายการนี้ออกจากประวัติใช่หรือไม่?')) {
      const updated = deleteSavedReceipt(id);
      setReceipts(updated);
    }
  };

  const handleExportCSV = () => {
    exportReceiptsToCSV(filteredReceipts);
  };

  // Filter receipts
  const filteredReceipts = receipts.filter((r) => {
    const matchType = filterType === 'all' || r.docType === filterType;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (r.receiptData.merchantName || '').toLowerCase().includes(term) ||
      (r.receiptData.receiptNumber || '').toLowerCase().includes(term) ||
      (r.receiptData.taxId || '').includes(term);
    return matchType && matchSearch;
  });

  // Calculate statistics
  const totalExpense = receipts
    .filter((r) => r.docType === 'expense')
    .reduce((sum, r) => sum + (r.receiptData.totalAmount || 0), 0);

  const totalIncome = receipts
    .filter((r) => r.docType === 'income')
    .reduce((sum, r) => sum + (r.receiptData.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Expense Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ยอดรวมบิลรายจ่าย
            </p>
            <p className="text-xl font-bold font-mono text-red-600 mt-0.5">
              ฿{formatCurrency(totalExpense)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {receipts.filter((r) => r.docType === 'expense').length} รายการ
            </p>
          </div>
        </div>

        {/* Total Income Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ยอดรวมบิลรายรับ
            </p>
            <p className="text-xl font-bold font-mono text-emerald-600 mt-0.5">
              ฿{formatCurrency(totalIncome)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {receipts.filter((r) => r.docType === 'income').length} รายการ
            </p>
          </div>
        </div>

        {/* Total Documents Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              เอกสารทั้งหมดในระบบ
            </p>
            <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              {receipts.length} รายการ
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">บันทึกในเครื่อง (Local Storage)</p>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Type Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full md:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              filterType === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ทั้งหมด ({receipts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('expense')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              filterType === 'expense'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            บิลรายจ่าย ({receipts.filter((r) => r.docType === 'expense').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('income')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              filterType === 'income'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            บิลรายรับ ({receipts.filter((r) => r.docType === 'income').length})
          </button>
        </div>

        {/* Search & Export Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อร้าน, เลขที่บิล..."
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            disabled={filteredReceipts.length === 0}
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            ส่งออก CSV (Excel)
          </button>
        </div>
      </div>

      {/* History Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">ประเภท</th>
                <th className="py-3 px-4">วันที่บิล / บันทึกเมื่อ</th>
                <th className="py-3 px-4">ชื่อร้านค้า / คู่ค้า</th>
                <th className="py-3 px-4">เลขที่บิล</th>
                <th className="py-3 px-4 text-center">จำนวนรายการ</th>
                <th className="py-3 px-4 text-right">ยอดเงินสุทธิ</th>
                <th className="py-3 px-4 text-center">จัดการ & แปลงเอกสาร</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.map((item, index) => {
                const isExpense = item.docType === 'expense';
                return (
                  <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">
                      {index + 1}
                    </td>

                    {/* Doc Type Badge */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isExpense
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isExpense ? 'บิลรายจ่าย' : 'บิลรายรับ'}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-600">
                      <div>{item.receiptData.date || formatDate(item.createdAt)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        บันทึก: {formatDate(item.createdAt)}
                      </div>
                    </td>

                    {/* Merchant */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {item.receiptData.merchantName || '-'}
                      </div>
                      {item.receiptData.taxId && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          Tax ID: {item.receiptData.taxId}
                        </div>
                      )}
                    </td>

                    {/* Receipt No */}
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {item.receiptData.receiptNumber || '-'}
                    </td>

                    {/* Items count */}
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-medium text-[11px]">
                        {(item.receiptData.items || []).length} รายการ
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-sm text-slate-900">
                      ฿{formatCurrency(item.receiptData.totalAmount || 0)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* Convert to Delivery Order shortcut */}
                        <button
                          type="button"
                          onClick={() => onLoadIntoQuotation(item.receiptData, 'delivery_order')}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors border border-indigo-200"
                          title="ดึงข้อมูลไปเปิดเป็นใบส่งของทันที"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>ใบส่งของ</span>
                        </button>

                        {/* Convert to Receipt shortcut */}
                        <button
                          type="button"
                          onClick={() => onLoadIntoQuotation(item.receiptData, 'receipt')}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors border border-emerald-200"
                          title="ดึงข้อมูลไปเปิดเป็นใบเสร็จรับเงินทันที"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>แปลงเป็นใบเสร็จ</span>
                        </button>

                        {/* Convert to Quotation */}
                        <button
                          type="button"
                          onClick={() => onLoadIntoQuotation(item.receiptData, 'quotation')}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors border border-blue-200"
                          title="ดึงข้อมูลไปเปิดเป็นใบเสนอราคา"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>ใบเสนอราคา</span>
                        </button>

                        {/* View in Review */}
                        <button
                          type="button"
                          onClick={() => onViewReceipt(item)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="ดูรายละเอียด / แก้ไขบิล"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">ยังไม่มีประวัติรายการบิล</p>
                    <p className="text-xs text-slate-400 mt-1">
                      เมื่อท่านสแกนบิลและกด &ldquo;บันทึกประวัติ (Local Archive)&rdquo; ข้อมูลจะปรากฏที่นี่
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
