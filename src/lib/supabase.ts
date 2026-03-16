import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserProfile = {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  is_admin: boolean;
  is_master_admin: boolean;
  admin_approved: boolean;
  created_at: string;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  available: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: 'COD' | 'GCash';
  payment_reference: string | null;
  payment_proof_url: string | null;
  status: 'pending' | 'confirmed' | 'preparing' | 'on_the_way' | 'completed' | 'cancelled';
  delivery_address: string;
  contact_phone: string;
  notes: string | null;
  created_at: string;
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
  updated_at: string;
};
