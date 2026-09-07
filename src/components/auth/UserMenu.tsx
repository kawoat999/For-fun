'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, LogIn, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function UserMenu() {
  const { user, loading, openAuthModal, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse shrink-0"></div>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={openAuthModal}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all shrink-0 cursor-pointer"
        title="เข้าสู่ระบบ หรือ สมัครสมาชิก"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>เข้าสู่ระบบ</span>
      </button>
    );
  }

  const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all shrink-0 border border-slate-200"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
          {initial}
        </div>
        <div className="text-left hidden sm:block max-w-[120px] truncate">
          <p className="text-xs font-bold leading-tight truncate">
            {user.name || user.email.split('@')[0]}
          </p>
          <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900 truncate">
              {user.name || 'ผู้ใช้งาน'}
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {user.email}
            </p>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>เข้าสู่ระบบแล้ว</span>
            </div>
          </div>

          <div className="p-1">
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await signOut();
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ (Sign Out)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
