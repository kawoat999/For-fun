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
  Printer,
  RefreshCw,
  AlertCircle,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { SavedReceipt, ReceiptData, OutputDocType, Quotation } from '@/lib/types';
import {
  getSavedReceipts,
  deleteSavedReceipt,
  exportReceiptsToCSV,
  exportSingleReceiptToCSV,
  syncWithSupabase,
} from '@/lib/storage';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface ReceiptHistoryProps {
  onLoadIntoQuotation: (
    receipt: ReceiptData,
    targetDocType?: OutputDocType,
    targetStep?: 'quotation-edit' | 'quotation-preview',
    fullQuotation?: Quotation
  ) => void;
  onViewReceipt: (receipt: SavedReceipt) => void;
}

export default function ReceiptHistory({
  onLoadIntoQuotation,
  onViewReceipt,
}: ReceiptHistoryProps) {
  const { user, openAuthModal } = useAuth();
  const [receipts, setReceipts] = useState<SavedReceipt[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Load receipts from local storage and sync with Supabase on mount or when user changes
  const refreshData = async () => {
    const currentUserId = user?.id || null;
    setReceipts(getSavedReceipts(currentUserId));
    if (isSupabaseConfigured() && currentUserId) {
      setIsSyncing(true);
      try {
        const synced = await syncWithSupabase(currentUserId);
        if (synced) {
          setReceipts(synced);
        }
      } catch (err) {
        console.warn('Sync failed', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  useEffect(() => {
    refreshData();
  }, [user?.id]);

  const handleDelete = (id: string) => {
    if (window.confirm('คุณต้องการลบรายการนี้ออกจากประวัติใช่หรือไม่?')) {
      const updated = deleteSavedReceipt(id, user?.id || null);
      setReceipts(updated);
    }
  };

  const handleExportCSV = () => {
    exportReceiptsToCSV(filteredReceipts);
  };

  const handleExportSingle = (item: SavedReceipt) => {
    exportSingleReceiptToCSV(item);
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
      {/* User Account Status & Privacy Banner */}
      {user ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-900">
                ประวัติบิลของบัญชี: {user.name || user.email}
              </p>
              <p className="text-[11px] text-emerald-700">
                ข้อมูลบิลและเอกสารทั้งหมดถูกแยกจัดเก็บเฉพาะบัญชีของคุณอย่างปลอดภัย เมื่อออกจากระบบข้อมูลจะถูกซ่อนอัตโนมัติ
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-amber-900">
                คุณยังไม่ได้เข้าสู่ระบบ (Guest Mode)
              </p>
              <p className="text-[11px] text-amber-700">
                ประวัติบิลของแต่ละบัญชีผู้ใช้จะถูกแยกเก็บอย่างเป็นส่วนตัว หากต้องการดูหรือเข้าถึงประวัติบิลของคุณ กรุณาเข้าสู่ระบบ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAuthModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>เข้าสู่ระบบ / สมัครสมาชิก</span>
          </button>
        </div>
      )}

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
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isSupabaseConfigured() ? 'บันทึกในเครื่อง + Cloud Supabase' : 'บันทึกในเครื่อง (Local Storage)'}
            </p>
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
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative flex-1 md:w-60 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อร้าน, เลขที่บิล..."
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Cloud Sync Button */}
          {isSupabaseConfigured() && (
            <button
              type="button"
              onClick={refreshData}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all shrink-0"
              title="ซิงค์ข้อมูลล่าสุดกับ Supabase Cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ Cloud'}</span>
            </button>
          )}

          {/* Export All CSV Button */}
          <button
            type="button"
            disabled={filteredReceipts.length === 0}
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all shrink-0"
            title="ดาวน์โหลดข้อมูลประวัติทั้งหมดเป็นไฟล์ CSV สรุป"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV (Excel)</span>
          </button>
        </div>
      </div>

      {/* History Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3">ประเภท</th>
                <th className="py-3 px-3">วันที่บิล / บันทึกเมื่อ</th>
                <th className="py-3 px-3">ชื่อร้านค้า / ลูกค้า</th>
                <th className="py-3 px-3">เลขที่เอกสาร</th>
                <th className="py-3 px-3 text-center">รายการ</th>
                <th className="py-3 px-3 text-right">ยอดเงินสุทธิ</th>
                <th className="py-3 px-3 text-center">พิมพ์ / ดาวน์โหลด & จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.map((item, index) => {
                const isExpense = item.docType === 'expense';
                const outputType = item.outputDocType || (isExpense ? 'receipt' : 'quotation');
                const isDO = outputType === 'delivery_order';
                const isRC = outputType === 'receipt';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-medium">
                      {index + 1}
                    </td>

                    {/* Doc Type Badges */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDO
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : isRC
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isDO ? 'ใบส่งของ' : isRC ? 'ใบเสร็จรับเงิน' : 'ใบเสนอราคา'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {isExpense ? 'บิลรายจ่าย' : 'บิลรายรับ'}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 text-slate-600">
                      <div className="font-medium text-slate-800">
                        {item.receiptData.date || formatDate(item.createdAt)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        บันทึก: {formatDate(item.createdAt)}
                      </div>
                    </td>

                    {/* Merchant / Client */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 line-clamp-1 max-w-[180px]">
                        {item.receiptData.merchantName || '-'}
                      </div>
                      {item.receiptData.taxId && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          Tax ID: {item.receiptData.taxId}
                        </div>
                      )}
                    </td>

                    {/* Document / Receipt No */}
                    <td className="py-3 px-3 font-mono text-slate-600">
                      <div className="font-semibold">{item.receiptData.receiptNumber || '-'}</div>
                      {item.quotationData?.poNumber && (
                        <div className="text-[10px] text-slate-400">PO: {item.quotationData.poNumber}</div>
                      )}
                    </td>

                    {/* Items count */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium text-[11px]">
                        {(item.receiptData.items || []).length} รายการ
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-sm text-slate-900">
                      ฿{formatCurrency(item.receiptData.totalAmount || 0)}
                    </td>

                    {/* Actions: Download / Print / Export */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* 1. Open / Print Receipt A4 Immediately */}
                        <button
                          type="button"
                          onClick={() =>
                            onLoadIntoQuotation(
                              item.receiptData,
                              'receipt',
                              'quotation-preview',
                              item.quotationData
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-all"
                          title="เปิดเป็นใบเสร็จรับเงิน A4 พร้อมสั่งพิมพ์หรือบันทึก PDF ทันที"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>พิมพ์/โหลดใบเสร็จ</span>
                        </button>

                        {/* 2. Download Itemized CSV for this specific bill */}
                        <button
                          type="button"
                          onClick={() => handleExportSingle(item)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-semibold rounded-lg transition-colors"
                          title="ดาวน์โหลดรายการบิลนี้เป็นไฟล์ CSV สำหรับ Excel"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>โหลด CSV</span>
                        </button>

                        {/* 3. Open as Delivery Order shortcut */}
                        <button
                          type="button"
                          onClick={() =>
                            onLoadIntoQuotation(
                              item.receiptData,
                              'delivery_order',
                              'quotation-preview',
                              item.quotationData
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors border border-indigo-200"
                          title="เปิดเป็นใบส่งของ A4"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">ใบส่งของ</span>
                        </button>

                        {/* 4. Open as Quotation shortcut */}
                        <button
                          type="button"
                          onClick={() =>
                            onLoadIntoQuotation(
                              item.receiptData,
                              'quotation',
                              'quotation-preview',
                              item.quotationData
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors border border-blue-200"
                          title="เปิดเป็นใบเสนอราคา A4"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">ใบเสนอราคา</span>
                        </button>

                        {/* 5. Edit in Editor */}
                        <button
                          type="button"
                          onClick={() =>
                            onLoadIntoQuotation(
                              item.receiptData,
                              item.outputDocType || 'receipt',
                              'quotation-edit',
                              item.quotationData
                            )
                          }
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="แก้ไขข้อมูลในแบบฟอร์ม"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* 6. Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบรายการนี้ออกจากประวัติ"
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
                    <p className="text-sm font-semibold text-slate-600">
                      {user ? 'ยังไม่มีประวัติรายการบิลในบัญชีนี้' : 'ยังไม่มีประวัติรายการบิลในโหมดผู้เยี่ยมชม'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {user
                        ? 'เมื่อท่านสแกนบิลหรือสร้างเอกสารในขณะที่เข้าสู่ระบบ ข้อมูลจะถูกบันทึกผูกกับบัญชีนี้โดยอัตโนมัติ'
                        : 'ข้อมูลบิลของแต่ละบัญชีจะถูกแยกเก็บอย่างปลอดภัย หากต้องการดูประวัติบิลของคุณ กรุณาเข้าสู่ระบบ'}
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
