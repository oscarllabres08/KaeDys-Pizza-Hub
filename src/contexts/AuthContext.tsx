import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, CustomerProfile, AdminProfile } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  customerProfile: CustomerProfile | null;
  adminProfile: AdminProfile | null;
  loading: boolean;
  profilesLoaded: boolean;
  refreshProfiles: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData: Omit<CustomerProfile, 'id' | 'created_at'>,
    isAdminSignUp?: boolean
  ) => Promise<{ requiresAdminApproval: boolean; isMasterAdmin: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfiles(session.user.id);
      } else {
        setProfilesLoaded(true);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfiles(session.user.id);
        } else {
          setCustomerProfile(null);
          setAdminProfile(null);
          setProfilesLoaded(true);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfiles = async (userId: string) => {
    setLoading(true);
    setProfilesLoaded(false);
    try {
      const [{ data: cust, error: custErr }, { data: admin, error: adminErr }] = await Promise.all([
        supabase.from('customer_profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('admin_profiles').select('*').eq('id', userId).maybeSingle(),
      ]);

      if (custErr) throw custErr;
      if (adminErr) throw adminErr;
      setCustomerProfile((cust as CustomerProfile) ?? null);
      setAdminProfile((admin as AdminProfile) ?? null);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setProfilesLoaded(true);
      setLoading(false);
    }
  };

  const refreshProfiles = async () => {
    const userId = user?.id;
    if (!userId) return;
    await fetchProfiles(userId);
  };

  const signUp = async (
    email: string,
    password: string,
    userData: Omit<CustomerProfile, 'id' | 'created_at'>,
    isAdminSignUp: boolean = false
  ) => {
    let requiresAdminApproval = false;
    let isMasterAdmin = false;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      if (isAdminSignUp) {
        // Admin sign-up: create admin profile (do NOT create a customer profile)
        const { error: adminInsertError } = await supabase.from('admin_profiles').insert([
          {
            id: data.user.id,
            full_name: userData.full_name,
            email,
            is_active: false,
          },
        ]);
        if (adminInsertError) throw adminInsertError;
      } else {
        // Customer sign-up
        const { error: customerError } = await supabase.from('customer_profiles').insert([
          {
            id: data.user.id,
            full_name: userData.full_name,
            phone: userData.phone,
            address: userData.address ?? null,
          },
        ]);
        if (customerError) throw customerError;
      }

      // Ensure UI updates immediately after registration
      await fetchProfiles(data.user.id);

      // Determine approval requirement from freshly loaded profile (RLS-safe)
      if (isAdminSignUp) {
        const { data: adminRow } = await supabase
          .from('admin_profiles')
          .select('is_active, is_master_admin')
          .eq('id', data.user.id)
          .maybeSingle();
        isMasterAdmin = !!adminRow?.is_master_admin;
        requiresAdminApproval = !adminRow?.is_active;
      }
    }

    return { requiresAdminApproval, isMasterAdmin };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Ensure UI updates immediately after login
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user?.id) {
      await fetchProfiles(sessionData.session.user.id);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    customerProfile,
    adminProfile,
    loading,
    profilesLoaded,
    refreshProfiles,
    signUp,
    signIn,
    signOut,
    isAdmin: adminProfile?.is_active ?? false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
