'use client';

import React, { useState } from 'react';
import { Cloud, Check, Copy, ExternalLink, Key, Database, X, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SupabaseModal({ isOpen, onClose, onSuccess }: SupabaseModalProps) {
  const [anonKey, setAnonKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const isConfigured = isSupabaseConfigured();

  if (!isOpen) return null;

  const sqlCode = `-- คำสั่งสร้างตารางใน Supabase SQL Editor
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  doc_type TEXT NOT NULL,
  receipt_data JSONB NOT NULL,
  image_url TEXT
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read and write on receipts"
  ON receipts FOR ALL TO anon USING (true) WITH CHECK (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anonKey.trim()) {
      setError('กรุณาวางรหัส anon key');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/setup-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonKey: anonKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกล้มเหลว');
      }

      onSuccess();
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">ตั้งค่าเชื่อมต่อ Supabase Cloud Database</h3>
              <p className="text-[11px] text-slate-400">
                URL: https://qiqmmsclfuzzxojruwpp.supabase.co
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Step 1: Get Anon Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                  1
                </span>
                คัดลอก Anon Key จาก Supabase
              </span>
              <a
                href="https://supabase.com/dashboard/project/qiqmmsclfuzzxojruwpp/settings/api"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold hover:underline"
              >
                เปิดหน้า API Settings ทันที
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              คลิกลิงก์ด้านบนเพื่อเปิดหน้า API Settings ของโปรเจกต์คุณ จากนั้นในช่อง{' '}
              <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">anon public</code>{' '}
              กดคัดลอกข้อความยาวๆ แล้วนำมาวางในช่องด้านล่างนี้:
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="วาง eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... ที่นี่"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-slate-50"
                />
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-all"
              >
                {isLoading ? 'กำลังตรวจสอบและบันทึก...' : 'บันทึก Anon Key ลงในระบบ'}
              </button>
            </form>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                  2
                </span>
                สร้างตาราง receipts ใน Supabase
              </span>
              <a
                href="https://supabase.com/dashboard/project/qiqmmsclfuzzxojruwpp/sql/new"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-semibold hover:underline"
              >
                เปิดหน้า SQL Editor
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-500 text-[11px]">
              เปิดหน้า SQL Editor แล้ววางคำสั่งนี้เพื่อสร้างตารางเก็บข้อมูลบิล:
            </p>

            <div className="relative bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[10px] overflow-x-auto">
              <pre>{sqlCode}</pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-sans flex items-center gap-1 transition-colors"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedSql ? 'คัดลอกแล้ว' : 'คัดลอก SQL'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
