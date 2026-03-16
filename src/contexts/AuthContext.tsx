import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    userData: Omit<UserProfile, 'id' | 'created_at' | 'is_admin' | 'is_master_admin' | 'admin_approved'>,
    isAdminSignUp?: boolean
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: Omit<UserProfile, 'id' | 'created_at' | 'is_admin' | 'is_master_admin' | 'admin_approved'>,
    isAdminSignUp: boolean = false
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Create basic profile record for all sign-ups
      const { error: profileError } = await supabase.from('user_profiles').insert([
        {
          id: data.user.id,
          full_name: userData.full_name,
          phone: userData.phone,
          address: userData.address,
        },
      ]);

      if (profileError) throw profileError;

      // Only admin sign-up flow can create / mark master admin
      if (isAdminSignUp) {
        // Check if there is already a master admin
        const { data: existingAdmins, error: checkError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('is_master_admin', true)
          .limit(1);

        if (checkError) throw checkError;

        const isFirstAdmin = !existingAdmins || existingAdmins.length === 0;

        if (isFirstAdmin) {
          // First ever admin: auto Master Admin and auto approved
          await supabase
            .from('user_profiles')
            .update({
              is_admin: true,
              is_master_admin: true,
              admin_approved: true,
            })
            .eq('id', data.user.id);
        } else {
          // Next admins: need approval from Master Admin
          await supabase
            .from('user_profiles')
            .update({
              is_admin: true,
              admin_approved: false,
            })
            .eq('id', data.user.id);
        }
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
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin: profile?.is_admin ?? false,
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
