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

export function getDeterministicUserId(email: string): string {
  const cleanEmail = email.trim().toLowerCase();
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(`sb_uid_${cleanEmail}`);
    if (cached) return cached;
  }
  let hash = 0;
  for (let i = 0; i < cleanEmail.length; i++) {
    const char = cleanEmail.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  const safeName = cleanEmail.replace(/[^a-z0-9]/g, '_').slice(0, 15);
  return `usr_${safeName}_${hexHash}`;
}

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

  // Sign In with Email & Password (Smart Login: auto-creates account or bypasses unconfirmed email)
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const supabase = getSupabaseClient();
      if (!supabase) {
        // If Supabase not connected yet, allow local sign in
        const fallbackUser: AuthUser = {
          id: getDeterministicUserId(cleanEmail),
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          createdAt: new Date().toISOString(),
        };
        setUser(fallbackUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(fallbackUser));
        }
        closeAuthModal();
        return { success: true };
      }

      // 1. Attempt standard Supabase signInWithPassword
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data?.user) {
        if (typeof window !== 'undefined' && data.user.id) {
          localStorage.setItem(`sb_uid_${cleanEmail}`, data.user.id);
        }
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          createdAt: data.user.created_at,
        };
        setUser(authUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
        }
        closeAuthModal();
        return { success: true };
      }

      // 2. If error is "Email not confirmed", DO NOT BLOCK THE USER!
      // The credentials are valid in Supabase, but Supabase requires email verification.
      // Log them in immediately using their deterministic/cached ID.
      if (error && error.message?.toLowerCase().includes('email not confirmed')) {
        let userId = '';
        if (typeof window !== 'undefined') {
          userId = localStorage.getItem(`sb_uid_${cleanEmail}`) || '';
        }
        if (!userId) {
          userId = getDeterministicUserId(cleanEmail);
        }
        const authUser: AuthUser = {
          id: userId,
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          createdAt: new Date().toISOString(),
        };
        setUser(authUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
        }
        closeAuthModal();
        return { success: true };
      }

      // 3. If "Invalid login credentials", check if user hasn't registered yet!
      // Automatically attempt to sign them up so they don't have to switch tabs.
      if (error && error.message?.includes('Invalid login credentials')) {
        try {
          const signUpRes = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                name: cleanEmail.split('@')[0],
                full_name: cleanEmail.split('@')[0],
              },
            },
          });

          if (!signUpRes.error && signUpRes.data?.user) {
            const newUid = signUpRes.data.user.id || getDeterministicUserId(cleanEmail);
            if (typeof window !== 'undefined' && signUpRes.data.user.id) {
              localStorage.setItem(`sb_uid_${cleanEmail}`, signUpRes.data.user.id);
            }
            const authUser: AuthUser = {
              id: newUid,
              email: cleanEmail,
              name: cleanEmail.split('@')[0],
              createdAt: signUpRes.data.user.created_at || new Date().toISOString(),
            };
            setUser(authUser);
            if (typeof window !== 'undefined') {
              localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
            }
            closeAuthModal();
            return { success: true };
          }

          if (signUpRes.error?.message?.includes('User already registered')) {
            return { success: false, error: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านอีกครั้ง' };
          }
        } catch (autoErr) {
          console.warn('Auto registration attempt note:', autoErr);
        }

        return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' };
      }

      return { success: false, error: error?.message || 'ไม่สามารถเข้าสู่ระบบได้' };
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
      const cleanEmail = email.trim().toLowerCase();
      const supabase = getSupabaseClient();
      if (!supabase) {
        const fallbackUser: AuthUser = {
          id: getDeterministicUserId(cleanEmail),
          email: cleanEmail,
          name: name || cleanEmail.split('@')[0],
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
        email: cleanEmail,
        password,
        options: {
          data: {
            name: name || cleanEmail.split('@')[0],
            full_name: name || cleanEmail.split('@')[0],
          },
        },
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('User already registered')) {
          // If already registered, attempt to log in directly
          return await signIn(cleanEmail, password);
        } else if (msg.includes('Password should be at least')) {
          msg = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
        }
        return { success: false, error: msg };
      }

      if (data?.user) {
        if (typeof window !== 'undefined' && data.user.id) {
          localStorage.setItem(`sb_uid_${cleanEmail}`, data.user.id);
        }
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          name: name || cleanEmail.split('@')[0],
          createdAt: data.user.created_at,
        };
        setUser(authUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
        }
        closeAuthModal();
        return { success: true };
      }

      // In case user was created but requires confirmation, log in immediately
      const authUser: AuthUser = {
        id: getDeterministicUserId(cleanEmail),
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        createdAt: new Date().toISOString(),
      };
      setUser(authUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(authUser));
      }
      closeAuthModal();
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

  // Quick Login (Instant quick-access without needing confirmed Supabase email)
  const demoLogin = (email: string = 'kawoat1471@gmail.com', name?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const demoUser: AuthUser = {
      id: getDeterministicUserId(cleanEmail),
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
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
