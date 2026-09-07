'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '@/lib/types';
import { getSupabaseClient } from '@/lib/supabase';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  demoLogin: (email?: string, name?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'receipt_app_auth_user_v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Load session from Supabase or localStorage on mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user && mounted) {
            const sbUser = data.session.user;
            const authUser: AuthUser = {
              id: sbUser.id,
              email: sbUser.email || '',
              name: sbUser.user_metadata?.name || sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0],
              createdAt: sbUser.created_at,
            };
            setUser(authUser);
            if (typeof window !== 'undefined') {
              localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
            }
            setLoading(false);
            return;
          }

          // Listen to Supabase auth state changes
          const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
              if (!mounted) return;
              if (session?.user) {
                const sbUser = session.user;
                const authUser: AuthUser = {
                  id: sbUser.id,
                  email: sbUser.email || '',
                  name: sbUser.user_metadata?.name || sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0],
                  createdAt: sbUser.created_at,
                };
                setUser(authUser);
                if (typeof window !== 'undefined') {
                  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
                }
              } else {
                // If signed out from Supabase
                const localRaw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_USER_KEY) : null;
                if (localRaw) {
                  const localUser = JSON.parse(localRaw);
                  // Keep if it was a demo login
                  if (localUser.id?.startsWith('demo-')) {
                    setUser(localUser);
                    return;
                  }
                }
                setUser(null);
                if (typeof window !== 'undefined') {
                  localStorage.removeItem(LOCAL_USER_KEY);
                }
              }
            }
          );
        }

        // Fallback to local storage
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(LOCAL_USER_KEY);
          if (raw) {
            setUser(JSON.parse(raw));
          }
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Sign In with Email & Password
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        // If Supabase not connected yet, allow local/demo sign in
        const fallbackUser: AuthUser = {
          id: `usr-${Date.now()}`,
          email,
          name: email.split('@')[0],
          createdAt: new Date().toISOString(),
        };
        setUser(fallbackUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(fallbackUser));
        }
        closeAuthModal();
        return { success: true };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('Invalid login credentials')) {
          msg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
        } else if (msg.includes('Email not confirmed')) {
          msg = 'อีเมลนี้ยังไม่ได้ยืนยันในระบบ Supabase (สามารถเข้าสู่ระบบแบบด่วนได้)';
        }
        return { success: false, error: msg };
      }

      if (data?.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || email.split('@')[0],
          createdAt: data.user.created_at,
        };
        setUser(authUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
        }
        closeAuthModal();
        return { success: true };
      }

      return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
    }
  };

  // Sign Up with Email & Password
  const signUp = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        const fallbackUser: AuthUser = {
          id: `usr-${Date.now()}`,
          email,
          name: name || email.split('@')[0],
          createdAt: new Date().toISOString(),
        };
        setUser(fallbackUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(fallbackUser));
        }
        closeAuthModal();
        return { success: true };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
            full_name: name || email.split('@')[0],
          },
        },
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('User already registered')) {
          msg = 'อีเมลนี้มีอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบ';
        } else if (msg.includes('Password should be at least')) {
          msg = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
        }
        return { success: false, error: msg };
      }

      if (data?.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || email,
          name: name || email.split('@')[0],
          createdAt: data.user.created_at,
        };
        setUser(authUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
        }
        closeAuthModal();
        return { success: true };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก' };
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LOCAL_USER_KEY);
      }
    }
  };

  // Demo Login (Instant quick-access without needing confirmed Supabase email)
  const demoLogin = (email: string = 'demo.user@example.com', name: string = 'ผู้ใช้งานทั่วไป') => {
    const demoUser: AuthUser = {
      id: `demo-${Date.now()}`,
      email,
      name,
      createdAt: new Date().toISOString(),
    };
    setUser(demoUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(demoUser));
    }
    closeAuthModal();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        signIn,
        signUp,
        signOut,
        demoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
