import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, CustomerProfile, AdminProfile } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  customerProfile: CustomerProfile | null;
  adminProfile: AdminProfile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    userData: Omit<CustomerProfile, 'id' | 'created_at'>,
    isAdminSignUp?: boolean
  ) => Promise<void>;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfiles(session.user.id);
      } else {
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
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfiles = async (userId: string) => {
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
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: Omit<CustomerProfile, 'id' | 'created_at'>,
    isAdminSignUp: boolean = false
  ) => {
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

        // If there is no master admin yet, promote this account
        const { data: existingMaster, error: masterCheckError } = await supabase
          .from('admin_profiles')
          .select('id')
          .eq('is_master_admin', true)
          .limit(1);

        if (masterCheckError) throw masterCheckError;

        const isFirstMaster = !existingMaster || existingMaster.length === 0;
        if (isFirstMaster) {
          const { error: promoteError } = await supabase
            .from('admin_profiles')
            .update({ is_master_admin: true, is_active: true })
            .eq('id', data.user.id);
          if (promoteError) throw promoteError;
        }
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
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
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
