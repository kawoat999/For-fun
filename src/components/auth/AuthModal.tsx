'use client';

import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Zap,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, signIn, signUp, demoLogin } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setError('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);

    if (mode === 'signin') {
      const res = await signIn(email.trim(), password);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน');
      }
    } else {
      const res = await signUp(email.trim(), password, name.trim());
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'สมัครสมาชิกไม่สำเร็จ');
      } else {
        setSuccessMsg('สมัครสมาชิกสำเร็จแล้ว! กำลังเข้าสู่ระบบ...');
      }
    }
  };

  const handleQuickDemo = () => {
    const targetEmail = email.trim() || 'kawoat1471@gmail.com';
    demoLogin(targetEmail, name.trim() || targetEmail.split('@')[0]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              {mode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {mode === 'signin' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกใหม่'}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === 'signin' ? 'เข้าใช้ระบบจัดการบิลและเอกสาร' : 'สร้างบัญชีเพื่อบันทึกประวัติบิลของคุณ'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-4">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เข้าสู่ระบบ (Sign In)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              สมัครสมาชิก (Sign Up)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {email.trim() && (
                <button
                  type="button"
                  onClick={() => demoLogin(email.trim(), name.trim() || email.trim().split('@')[0])}
                  className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>เข้าใช้งานด้วย {email.trim()} ทันที</span>
                </button>
              )}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ชื่อ-นามสกุล หรือ ชื่อร้านค้า
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี หรือ ร้านค้าของฉัน"
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">อีเมล (Email)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">รหัสผ่าน (Password)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full text-xs pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2 top-1/2 -translate-y-1/2 rounded-lg"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                กำลังดำเนินการ...
              </span>
            ) : mode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" />
                เข้าสู่ระบบ
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                สมัครสมาชิก
              </>
            )}
          </button>
          {mode === 'signin' && (
            <p className="text-[11px] text-slate-400 text-center">
              💡 เข้าสู่ระบบได้ทันที (หากยังไม่มีบัญชี ระบบจะสร้างให้อัตโนมัติ)
            </p>
          )}
        </form>

        {/* Quick Demo Login Option */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500 mb-2">หรือต้องการทดลองใช้งานแบบด่วน?</p>
          <button
            type="button"
            onClick={handleQuickDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>เข้าใช้งานทันที (Guest / Demo Mode)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
