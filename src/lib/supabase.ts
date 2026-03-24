import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isAdminApp =
  typeof document !== 'undefined' && document.getElementById('admin-root') !== null;

// Use different auth storage keys so admin/public sessions don't overwrite each other
// when opened in different tabs of the same browser.
const storageKey = isAdminApp ? 'kaedys_sb_admin_auth' : 'kaedys_sb_public_auth';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type CustomerProfile = {
  id: string;
  full_name: string;
  username?: string | null;
  phone: string;
  address: string | null;
  email?: string | null;
  suspended_until?: string | null;
  suspension_reason?: string | null;
  created_at: string;
};

export type AdminProfile = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  is_master_admin: boolean;
  is_active: boolean;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  custom_category?: string | null;
  is_available: boolean;
  display_order?: number;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: 'COD' | 'GCash' | 'Maya' | 'PayPal';
  payment_reference: string | null;
  payment_proof_url: string | null;
  status: 'pending' | 'confirmed' | 'preparing' | 'on_the_way' | 'completed' | 'cancelled';
  delivery_address: string;
  contact_phone: string;
  notes: string | null;
  is_archived?: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentMethodCode = 'GCash' | 'Maya' | 'PayPal';

export type PaymentMethodSetting = {
  method: PaymentMethodCode;
  qr_storage_path: string | null;
  account_number: string | null;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  price: number;
  subtotal: number;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  active: boolean;
  created_at: string;
};

export type GalleryImage = {
  id: string;
  image_url: string;
  display_order: number;
  created_at: string;
};

export type GamePlay = {
  id: string;
  user_id: string;
  score: number;
  discount_earned: number;
  claimed: boolean;
  played_at: string;
};

export type GameSettings = {
  id: string;
  is_active: boolean;
  falling_pizza_active?: boolean | null;
  updated_at: string;
};

/** Singleton row `id = 1` — official GCash QR object path in Storage bucket `gcash-qr` */
export type SiteSettings = {
  id: number;
  gcash_qr_storage_path: string | null;
  updated_at: string;
};
