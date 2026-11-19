import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { authService, isCustomerProfileComplete } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const userProfile = await authService.getCurrentUserProfile();
      setProfile(userProfile);
      return userProfile;
    } catch (err) {
      console.error('Gagal memuat profil auth:', err);
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Ambil profil saat pertama kali aplikasi dibuka
    refreshProfile();

    // 2. Listener otomatis untuk event auth Supabase (OAuth redirect, sign-in, token refresh, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const userProfile = await authService.ensureUserProfile(session.user);
          setProfile(userProfile);
        } catch (err) {
          console.error('Gagal sinkronisasi data user:', err);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const isComplete = profile?.role === 'customer' ? isCustomerProfileComplete(profile) : true;

  const value = {
    profile,
    setProfile,
    loading,
    refreshProfile,
    isAuthenticated: !!profile,
    isProfileComplete: isComplete,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
}
