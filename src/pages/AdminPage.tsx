import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, AdminProfile, Announcement, CustomerProfile, GalleryImage, GameSettings, MenuItem, Order, OrderItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Pizza,
  ImageIcon,
  Megaphone,
  Gamepad2,
  ClipboardList,
  Loader2,
  Menu as MenuIcon,
  Search,
  SlidersHorizontal,
  X,
  LogOut,
} from 'lucide-react';

type OrderWithItems = Order & {
  order_items: OrderItem[];
};

type TabId = 'orders' | 'menu' | 'announcements' | 'gallery' | 'game' | 'admins';

const STATUS_LABELS: { id: Order['status']; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'on_the_way', label: 'On the Way' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const ADMIN_TAB_STORAGE_KEY = 'kaedys_admin_active_tab';

function isTabId(value: string): value is TabId {
  return (
    value === 'orders' ||
    value === 'menu' ||
    value === 'announcements' ||
    value === 'gallery' ||
    value === 'game' ||
    value === 'admins'
  );
}

function AdminCategoryDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeLabel = value === 'All' ? 'All Categories' : value;

  useEffect(() => {
    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 pl-9 pr-10 py-2.5 rounded-xl border border-yellow-500/25 bg-black/40 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <span className="truncate">{activeLabel}</span>
        <span className="ml-auto text-gray-400">▾</span>
      </button>

      {value !== 'All' && (
        <button
          type="button"
          onClick={() => onChange('All')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
          aria-label="Clear category"
          title="Clear"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {open && (
        <div
          className="absolute z-50 mt-2 w-full rounded-xl border border-yellow-500/30 bg-neutral-950/95 shadow-2xl overflow-hidden"
          role="listbox"
        >
          <button
            type="button"
            onClick={() => {
              onChange('All');
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              value === 'All'
                ? 'bg-yellow-400/15 text-yellow-200'
                : 'text-gray-200 hover:bg-white/5'
            }`}
          >
            All Categories
          </button>
          <div className="h-px bg-yellow-500/15" />
          <div className="max-h-56 overflow-auto">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  value === opt
                    ? 'bg-yellow-400/15 text-yellow-200'
                    : 'text-gray-200 hover:bg-white/5'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

async function sendStatusEmail(order: Order, newStatus: Order['status']) {
  const webhookUrl = import.meta.env.VITE_STATUS_EMAIL_WEBHOOK;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: order.id,
        status: newStatus,
        paymentMethod: order.payment_method,
        finalAmount: order.final_amount,
      }),
    });
  } catch (error) {
    console.error('Error calling status email webhook', error);
  }
}

export default function AdminPage() {
  const { signOut, adminProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const fromHash = window.location.hash.replace('#', '');
    if (isTabId(fromHash)) return fromHash;
    const fromStorage = localStorage.getItem(ADMIN_TAB_STORAGE_KEY) || '';
    if (isTabId(fromStorage)) return fromStorage;
    return 'orders';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMasterAdmin = !!adminProfile?.is_master_admin;

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [deleteMenuItem, setDeleteMenuItem] = useState<MenuItem | null>(null);
  const [deletingMenuItem, setDeletingMenuItem] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategory, setMenuCategory] = useState<string>('All');
  const [menuForm, setMenuForm] = useState({
    category: 'Budget Meals',
    custom_category: '',
    name: '',
    description: '',
    price: '',
    imageFile: null as File | null,
    image_url: '',
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });

  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [gameLoading, setGameLoading] = useState(false);

  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [customersById, setCustomersById] = useState<Record<string, CustomerProfile>>({});

  useEffect(() => {
    localStorage.setItem(ADMIN_TAB_STORAGE_KEY, activeTab);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}#${activeTab}`
    );
  }, [activeTab]);

  useEffect(() => {
    const onHashChange = () => {
      const tab = window.location.hash.replace('#', '');
      if (isTabId(tab)) setActiveTab(tab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!isMasterAdmin && activeTab === 'admins') {
      setActiveTab('orders');
    }
  }, [activeTab, isMasterAdmin]);

  const categoryOptions = useMemo(() => {
    const preferred = ['Budget Meals', 'Pizza', 'Silog Meals', 'Drinks'];
    const set = new Set<string>();

    for (const item of menuItems) {
      const label =
        item.category === 'Others' ? item.custom_category?.trim() || 'Others' : item.category?.trim();
      if (label) set.add(label);
    }

    // Keep Others available for the add/edit form
    set.add('Others');

    const dynamic = [...set].filter((c) => !preferred.includes(c) && c !== 'Others').sort();
    const orderedPreferred = preferred.filter((c) => set.has(c));
    return [...orderedPreferred, ...dynamic, 'Others'];
  }, [menuItems]);

  const filterCategoryOptions = useMemo(
    () => categoryOptions.filter((c) => c !== 'Others'),
    [categoryOptions]
  );

  const filteredMenuItems = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return menuItems.filter((item) => {
      const categoryLabel =
        item.category === 'Others' ? item.custom_category || 'Others' : item.category;

      const matchesCategory = menuCategory === 'All' ? true : categoryLabel === menuCategory;
      const matchesQuery = !q
        ? true
        : [
            item.name,
            item.description,
            item.category,
            item.custom_category || '',
            categoryLabel,
            String(item.price ?? ''),
          ]
            .join(' ')
            .toLowerCase()
            .includes(q);

      return matchesCategory && matchesQuery;
    });
  }, [menuCategory, menuItems, menuSearch]);

  useEffect(() => {
    if (menuCategory !== 'All' && !filterCategoryOptions.includes(menuCategory)) {
      setMenuCategory('All');
    }
  }, [filterCategoryOptions, menuCategory]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items (*)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const ordersData = (data || []) as OrderWithItems[];
      setOrders(ordersData);

      const userIds = Array.from(new Set(ordersData.map((o) => o.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: customers, error: custError } = await supabase
          .from('customer_profiles')
          .select('*')
          .in('id', userIds);
        if (custError) throw custError;
        const map: Record<string, CustomerProfile> = {};
        for (const c of customers || []) {
          map[c.id] = c as CustomerProfile;
        }
        setCustomersById(map);
      } else {
        setCustomersById({});
      }
    } catch (error) {
      console.error('Error loading orders', error);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const fetchMenuItems = async () => {
    setMenuLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMenuItems((data || []) as MenuItem[]);
    } catch (error) {
      console.error('Error loading menu items', error);
    } finally {
      setMenuLoading(false);
    }
  };

  const updateOrderStatus = async (order: OrderWithItems, status: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', order.id);

      if (error) throw error;
      await sendStatusEmail(order, status);
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order status', error);
    }
  };

  const toggleMenuAvailability = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id);
      if (error) throw error;
      await fetchMenuItems();
    } catch (error) {
      console.error('Error updating menu availability', error);
    }
  };

  const fetchAnnouncements = async () => {
    setAnnLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements((data || []) as Announcement[]);
    } catch (error) {
      console.error('Error loading announcements', error);
    } finally {
      setAnnLoading(false);
    }
  };

  // When notification system detects a new order (via polling),
  // refresh the orders list if the Orders tab is currently active.
  useEffect(() => {
    const handler = () => {
      if (activeTab === 'orders') {
        fetchOrders();
      }
    };
    window.addEventListener('kaedys:new-order', handler as EventListener);
    return () => window.removeEventListener('kaedys:new-order', handler as EventListener);
  }, [activeTab, fetchOrders]);

  useEffect(() => {
    // Always load admin data for any logged-in user on the admin site
    fetchOrders();
    fetchMenuItems();
    fetchAnnouncements();
    fetchGallery();
    fetchGameSettings();
    if (isMasterAdmin) {
      fetchAdmins();
    }
  }, [isMasterAdmin, fetchOrders]);

  // Realtime updates for orders list:
  // re-fetch only when there are INSERT/UPDATE/DELETE events on orders
  // (no constant polling while the admin is reading).
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          // Only refresh when Orders tab is visible to avoid surprise jumps
          if (activeTab === 'orders') {
            fetchOrders();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, fetchOrders]);

  const createAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{ title: newAnnouncement.title, content: newAnnouncement.content, active: true }]);

      if (error) throw error;
      setNewAnnouncement({ title: '', content: '' });
      await fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement', error);
    }
  };

  const toggleAnnouncementActive = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ active: !announcement.active })
        .eq('id', announcement.id);

      if (error) throw error;
      await fetchAnnouncements();
    } catch (error) {
      console.error('Error updating announcement', error);
    }
  };

  const fetchGallery = async () => {
    setGalleryLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setGalleryImages((data || []) as GalleryImage[]);
    } catch (error) {
      console.error('Error loading gallery', error);
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleGalleryUpload = async (file: File | null) => {
    if (!file) return;
    if (galleryImages.length >= 10) {
      alert('Maximum of 10 gallery images reached.');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `gallery-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(uploadData.path);

      const { error: insertError } = await supabase
        .from('gallery_images')
        .insert([
          {
            image_url: urlData.publicUrl,
            display_order: galleryImages.length + 1,
          },
        ]);

      if (insertError) throw insertError;
      await fetchGallery();
    } catch (error) {
      console.error('Error uploading gallery image', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchGameSettings = async () => {
    setGameLoading(true);
    try {
      const { data, error } = await supabase
        .from('game_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setGameSettings(data as GameSettings);
    } catch (error) {
      console.error('Error loading game settings', error);
    } finally {
      setGameLoading(false);
    }
  };

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAdmins((data || []) as AdminProfile[]);
    } catch (error) {
      console.error('Error loading admin profiles', error);
    } finally {
      setAdminsLoading(false);
    }
  };

  const updateAdminActive = async (admin: AdminProfile, makeActive: boolean) => {
    try {
      if (admin.is_master_admin && !makeActive) {
        alert('You cannot deactivate the Master Admin account.');
        return;
      }
      const { error } = await supabase
        .from('admin_profiles')
        .update({ is_active: makeActive })
        .eq('id', admin.id);
      if (error) throw error;
      await fetchAdmins();
    } catch (error) {
      console.error('Error updating admin approval status', error);
      alert('Failed to update admin status. Please try again.');
    }
  };

  const toggleFallingPizzaActive = async () => {
    if (!gameSettings) return;
    try {
      const { error } = await supabase
        .from('game_settings')
        .update({
          is_active: !(gameSettings.falling_pizza_active ?? gameSettings.is_active),
          falling_pizza_active: !(gameSettings.falling_pizza_active ?? gameSettings.is_active),
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameSettings.id);

      if (error) throw error;
      await fetchGameSettings();
    } catch (error) {
      console.error('Error updating game settings', error);
    }
  };

  // Spin the Wheel game removed.

  const handleSelectTab = (tab: TabId) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to log out?')) return;
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const sidebarNav = (
    <div className="space-y-2">
      <button
        onClick={() => handleSelectTab('orders')}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          activeTab === 'orders'
            ? 'bg-yellow-400 text-black shadow-lg'
            : 'bg-black/30 text-gray-200 hover:bg-neutral-800'
        }`}
      >
        <ClipboardList className="w-4 h-4" />
        Orders
      </button>
      <button
        onClick={() => handleSelectTab('menu')}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          activeTab === 'menu'
            ? 'bg-yellow-400 text-black shadow-lg'
            : 'bg-black/30 text-gray-200 hover:bg-neutral-800'
        }`}
      >
        <Pizza className="w-4 h-4" />
        Menu
      </button>
      <button
        onClick={() => handleSelectTab('announcements')}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          activeTab === 'announcements'
            ? 'bg-yellow-400 text-black shadow-lg'
            : 'bg-black/30 text-gray-200 hover:bg-neutral-800'
        }`}
      >
        <Megaphone className="w-4 h-4" />
        Promos
      </button>
      <button
        onClick={() => handleSelectTab('gallery')}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          activeTab === 'gallery'
            ? 'bg-yellow-400 text-black shadow-lg'
            : 'bg-black/30 text-gray-200 hover:bg-neutral-800'
        }`}
      >
        <ImageIcon className="w-4 h-4" />
        Gallery
      </button>
      <button
        onClick={() => handleSelectTab('game')}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          activeTab === 'game'
            ? 'bg-yellow-400 text-black shadow-lg'
            : 'bg-black/30 text-gray-200 hover:bg-neutral-800'
        }`}
      >
        <Gamepad2 className="w-4 h-4" />
        Discount Game
      </button>
      {isMasterAdmin && (
        <button
          onClick={() => handleSelectTab('admins')}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'admins'
              ? 'bg-yellow-400 text-black shadow-lg'
              : 'bg-black/30 text-gray-200 hover:bg-neutral-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Admin Approvals
        </button>
      )}
    </div>
  );

  const handleSaveMenuItem = async () => {
    try {
      const price = Number(menuForm.price);
      if (!menuForm.name || !menuForm.description || !Number.isFinite(price)) {
        alert('Please fill out name, description, and a valid price.');
        return;
      }
      if (menuForm.category === 'Others' && !menuForm.custom_category.trim()) {
        alert('Please enter a custom category.');
        return;
      }

      let imageUrl = menuForm.image_url;
      if (menuForm.imageFile) {
        const fileExt = menuForm.imageFile.name.split('.').pop();
        const fileName = `menu-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('menu')
          .upload(fileName, menuForm.imageFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('menu').getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      }

      const payload = {
        name: menuForm.name,
        description: menuForm.description,
        price,
        category: menuForm.category,
        custom_category: menuForm.category === 'Others' ? menuForm.custom_category.trim() : null,
        image_url: imageUrl,
      };

      if (!payload.image_url) {
        alert('Please upload an image.');
        return;
      }

      if (editingMenuItem) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', editingMenuItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('menu_items').insert([{ ...payload, is_available: true }]);
        if (error) throw error;
      }

      setMenuModalOpen(false);
      setEditingMenuItem(null);
      await fetchMenuItems();
    } catch (error) {
      console.error('Error saving menu item', error);
      alert('Failed to save menu item. Please try again.');
    }
  };

  const handleConfirmDeleteMenuItem = async () => {
    if (!deleteMenuItem) return;
    setDeletingMenuItem(true);
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', deleteMenuItem.id);
      if (error) throw error;
      setDeleteMenuItem(null);
      await fetchMenuItems();
    } catch (error) {
      console.error('Error deleting menu item', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setDeletingMenuItem(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 pb-8">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-yellow-500/20">
        <div className="w-full px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 md:h-12 md:w-12 rounded-full border-2 border-yellow-400 overflow-hidden bg-black">
              <img
                src="/kaedypizza.jpg"
                alt="KaeDy's Pizza Hub Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="leading-tight">
              <p className="text-base md:text-lg font-bold text-yellow-300">KaeDy&apos;s Pizza Hub</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] md:text-xs text-gray-400">
                  {adminProfile?.full_name ? `Admin: ${adminProfile.full_name}` : 'Admin Dashboard'}
                </p>
                {adminProfile?.full_name && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      adminProfile?.is_master_admin
                        ? 'bg-yellow-400/15 text-yellow-200 border-yellow-500/40'
                        : 'bg-neutral-800 text-gray-200 border-neutral-700'
                    }`}
                  >
                    {adminProfile?.is_master_admin ? 'MASTER ADMIN' : 'ADMIN'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 transition-all"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile side drawer menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-30 flex">
            {/* Backdrop */}
            <button
              type="button"
              className="flex-1 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <div className="w-72 max-w-[80%] bg-gradient-to-b from-black to-neutral-900 border-l border-yellow-500/40 shadow-[0_0_25px_rgba(0,0,0,0.8)] p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full border-2 border-yellow-400 overflow-hidden bg-black">
                    <img
                      src="/kaedypizza.jpg"
                      alt="KaeDy's Pizza Hub Logo"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="leading-tight">
                    <p className="text-base font-bold text-yellow-300">KaeDy&apos;s Pizza Hub</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] text-gray-400 truncate max-w-[165px]">
                        {adminProfile?.full_name ? adminProfile.full_name : 'Admin'}
                      </p>
                      {adminProfile?.full_name && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            adminProfile?.is_master_admin
                              ? 'bg-yellow-400/15 text-yellow-200 border-yellow-500/40'
                              : 'bg-neutral-800 text-gray-200 border-neutral-700'
                          }`}
                        >
                          {adminProfile?.is_master_admin ? 'MASTER' : 'ADMIN'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-300 hover:bg-yellow-500/20 hover:text-yellow-300 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-1 space-y-2 rounded-2xl bg-black/40 border border-yellow-500/30 p-2">
                <button
                  onClick={() => handleSelectTab('orders')}
                  className={`w-full inline-flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold ${
                    activeTab === 'orders'
                      ? 'bg-yellow-400 text-black'
                      : 'bg-neutral-800 text-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Orders
                  </span>
                </button>

                <button
                  onClick={() => handleSelectTab('menu')}
                  className={`w-full inline-flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold ${
                    activeTab === 'menu'
                      ? 'bg-yellow-400 text-black'
                      : 'bg-neutral-800 text-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Pizza className="w-4 h-4" />
                    Menu
                  </span>
                </button>

                <button
                  onClick={() => handleSelectTab('announcements')}
                  className={`w-full inline-flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold ${
                    activeTab === 'announcements'
                      ? 'bg-yellow-400 text-black'
                      : 'bg-neutral-800 text-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4" />
                    Promos & Announcements
                  </span>
                </button>

                <button
                  onClick={() => handleSelectTab('gallery')}
                  className={`w-full inline-flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold ${
                    activeTab === 'gallery'
                      ? 'bg-yellow-400 text-black'
                      : 'bg-neutral-800 text-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Gallery
                  </span>
                </button>

                <button
                  onClick={() => handleSelectTab('game')}
                  className={`w-full inline-flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold ${
                    activeTab === 'game'
                      ? 'bg-yellow-400 text-black'
                      : 'bg-neutral-800 text-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" />
                    Discount Game
                  </span>
                </button>
                {isMasterAdmin && (
                  <button
                    onClick={() => handleSelectTab('admins')}
                    className={`w-full inline-flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold ${
                      activeTab === 'admins'
                        ? 'bg-yellow-400 text-black'
                        : 'bg-neutral-800 text-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4" />
                      Admins
                    </span>
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="w-full px-4 md:px-6 pt-6">
        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex w-64 shrink-0">
            <div className="w-full sticky top-[88px] h-[calc(100vh-104px)] rounded-2xl border border-yellow-500/25 bg-black/30 p-3 flex flex-col">
              <p className="text-xs font-semibold text-gray-400 px-2 py-2">Navigation</p>
              {sidebarNav}
              <div className="mt-auto pt-4">
                <button
                  onClick={handleLogout}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-yellow-300 mb-1">
                Admin Dashboard
              </h1>
              <p className="text-gray-300 text-sm md:text-base">
                Manage orders, menu availability, promotions, gallery, and the discount game.
              </p>
            </div>

        {menuModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-lg bg-neutral-900 rounded-2xl border border-yellow-500/30 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-yellow-500/20">
                <h3 className="text-lg font-bold text-yellow-300">
                  {editingMenuItem ? 'Edit Product' : 'Add Product'}
                </h3>
                <button
                  onClick={() => setMenuModalOpen(false)}
                  className="p-2 rounded-lg text-gray-300 hover:bg-yellow-500/10 hover:text-yellow-300 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Category</label>
                  <select
                    value={menuForm.category}
                    onChange={(e) => setMenuForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-black text-white border border-yellow-500/30"
                  >
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {menuForm.category === 'Others' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Custom category</label>
                    <input
                      value={menuForm.custom_category}
                      onChange={(e) => setMenuForm((p) => ({ ...p, custom_category: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-black text-white border border-yellow-500/30"
                      placeholder="Enter category name"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Product name</label>
                  <input
                    value={menuForm.name}
                    onChange={(e) => setMenuForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-black text-white border border-yellow-500/30"
                    placeholder="e.g. Pepperoni Pizza"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Short description</label>
                  <textarea
                    value={menuForm.description}
                    onChange={(e) => setMenuForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-black text-white border border-yellow-500/30"
                    rows={3}
                    placeholder="Write a short description"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Price (₱)</label>
                    <input
                      value={menuForm.price}
                      onChange={(e) => setMenuForm((p) => ({ ...p, price: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-black text-white border border-yellow-500/30"
                      inputMode="decimal"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setMenuForm((p) => ({ ...p, imageFile: e.target.files?.[0] || null }))}
                      className="w-full text-sm text-gray-200"
                    />
                  </div>
                </div>
                {(menuForm.image_url || menuForm.imageFile) && (
                  <div className="rounded-xl overflow-hidden border border-yellow-500/20 bg-black/40">
                    <img
                      src={menuForm.imageFile ? URL.createObjectURL(menuForm.imageFile) : menuForm.image_url}
                      alt="Preview"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-yellow-500/20 flex gap-3 justify-end">
                <button
                  onClick={() => setMenuModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-800 text-gray-200 font-semibold hover:bg-neutral-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMenuItem}
                  className="px-4 py-2 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-300 transition-all"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {!!deleteMenuItem && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md bg-neutral-900 rounded-2xl border border-yellow-500/30 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-yellow-500/20">
                <h3 className="text-lg font-bold text-yellow-300">Remove product</h3>
                <button
                  type="button"
                  onClick={() => (deletingMenuItem ? null : setDeleteMenuItem(null))}
                  className="p-2 rounded-lg text-gray-300 hover:bg-yellow-500/10 hover:text-yellow-300 transition-all disabled:opacity-50"
                  disabled={deletingMenuItem}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-200">
                  Are you sure you want to remove{' '}
                  <span className="font-semibold text-yellow-200">{deleteMenuItem.name}</span>?
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  This will permanently delete the product from the database. This action cannot be undone.
                </p>

                <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteMenuItem(null)}
                    disabled={deletingMenuItem}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 text-gray-200 text-sm font-semibold hover:bg-neutral-700 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteMenuItem}
                    disabled={deletingMenuItem}
                    className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-all disabled:opacity-50"
                  >
                    {deletingMenuItem ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <section className="bg-neutral-900 rounded-xl shadow-lg p-4 md:p-6 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-yellow-300">Recent Orders</h2>
            </div>
            {ordersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <p className="text-gray-300 text-center py-6">No orders yet.</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const customer = customersById[order.user_id];
                  return (
                  <div
                    key={order.id}
                    className="border border-yellow-500/20 rounded-2xl p-4 md:p-5 hover:shadow-md transition-all bg-black/40"
                  >
                    <div className="grid gap-4 lg:grid-cols-[3fr_7fr]">
                      {/* Left: customer info */}
                      <div className="rounded-2xl border border-yellow-500/20 bg-black/30 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <p className="text-base font-bold text-yellow-200">Customer Information</p>
                          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold border border-yellow-500/40 bg-black/40 text-gray-200">
                            {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="rounded-xl border border-yellow-500/15 bg-black/25 p-3">
                            <p className="text-[11px] font-semibold text-gray-400">Name</p>
                            <p className="mt-1 text-gray-100 font-semibold leading-snug break-words">
                              {customer?.full_name || 'Unknown customer'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-yellow-500/15 bg-black/25 p-3">
                            <p className="text-[11px] font-semibold text-gray-400">Email</p>
                            <p className="mt-1 text-gray-200 leading-snug break-words">
                              {customer?.email || 'No email'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-yellow-500/15 bg-black/25 p-3">
                            <p className="text-[11px] font-semibold text-gray-400">Contact no.</p>
                            <p className="mt-1 text-gray-100 leading-snug break-words">
                              {order.contact_phone || customer?.phone || 'No phone'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-yellow-500/15 bg-black/25 p-3">
                            <p className="text-[11px] font-semibold text-gray-400">Address</p>
                            <p className="mt-1 text-gray-200 leading-snug break-words">
                              {order.delivery_address || customer?.address || 'No address provided'}
                            </p>
                          </div>

                          {(() => {
                            // Cart checkout currently appends "Customer: ...\nEmail: ..." to notes.
                            // In admin UI, show only the actual customer instruction part.
                            const raw = (order.notes || '').trim();
                            if (!raw) return null;
                            const instruction = raw.split('\n\nCustomer:')[0]?.trim();
                            if (!instruction) return null;
                            return (
                              <div className="rounded-xl border border-yellow-500/15 bg-black/25 p-3">
                                <p className="text-[11px] font-semibold text-gray-400">
                                  Special instructions
                                </p>
                                <p className="mt-1 text-sm text-gray-200 whitespace-pre-wrap break-words">
                                  {instruction}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Right: order details */}
                      <div className="rounded-2xl border border-yellow-500/20 bg-black/30 p-4 flex flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-bold text-yellow-200">
                              Order #{order.id.slice(0, 8)}
                            </p>
                            <p className="text-sm text-gray-400">
                              {new Date(order.created_at).toLocaleString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border border-white/10 bg-black/30 text-gray-200">
                            {order.payment_method}
                          </span>
                          <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs text-gray-400">Status</span>
                            <select
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order, e.target.value as Order['status'])}
                              className="text-sm font-semibold border border-yellow-500/35 rounded-xl px-3 py-2 bg-black/50 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            >
                              {STATUS_LABELS.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-yellow-500/15 bg-black/30 p-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-xs font-semibold text-gray-300">Items</p>
                            <p className="text-xs text-gray-500">
                              {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
                            {order.order_items.map((item) => {
                              const menuItem = menuItems.find((m) => m.id === item.menu_item_id);
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 rounded-lg bg-black/40 px-2 py-2"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {menuItem && (
                                      <img
                                        src={menuItem.image_url}
                                        alt={item.menu_item_name}
                                        className="w-16 h-16 rounded-lg object-cover border border-yellow-500/30"
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-sm text-gray-100 leading-snug break-words">
                                        <span className="text-gray-300 font-semibold">{item.quantity}×</span>{' '}
                                        {item.menu_item_name}
                                      </p>
                                      <p className="text-[11px] text-gray-400">
                                        ₱{item.price.toFixed(2)} each
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-semibold text-yellow-200 whitespace-nowrap">
                                    ₱{item.subtotal.toFixed(2)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Bottom summary */}
                        <div className="mt-4 pt-4 border-t border-yellow-500/15 flex items-end justify-between gap-3">
                          <div className="text-xs text-gray-400">
                            <p>Summary</p>
                            {order.discount_amount > 0 ? (
                              <p className="text-[11px] text-green-300/90 mt-1">
                                Discount: -₱{order.discount_amount.toFixed(2)}
                              </p>
                            ) : (
                              <p className="text-[11px] text-gray-500 mt-1">No discount</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Total</p>
                            <p className="text-xl font-extrabold text-yellow-300 leading-tight">
                              ₱{order.final_amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );})}
              </div>
            )}
          </section>
        )}

        {activeTab === 'menu' && (
          <section className="bg-neutral-900 rounded-xl shadow-lg p-4 md:p-6 border border-yellow-500/30">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
              <Pizza className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-yellow-300">Menu Availability</h2>
              </div>
              <button
                onClick={() => {
                  setEditingMenuItem(null);
                  setMenuForm({
                    category: 'Budget Meals',
                    custom_category: '',
                    name: '',
                    description: '',
                    price: '',
                    imageFile: null,
                    image_url: '',
                  });
                  setMenuModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-yellow-400 text-black text-sm font-semibold hover:bg-yellow-300 transition-all"
              >
                + Add Product
              </button>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Add, edit, and toggle availability. The public menu is loaded from the database.
            </p>

            <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Search by name, description, price..."
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-yellow-500/25 bg-black/40 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                  />
                  {menuSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => setMenuSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
                      aria-label="Clear search"
                      title="Clear"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-64">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Category</label>
                <AdminCategoryDropdown
                  value={menuCategory}
                  onChange={setMenuCategory}
                  options={filterCategoryOptions}
                />
              </div>

              <div className="flex items-center gap-2 lg:ml-auto">
                <span className="text-xs text-gray-400">Showing</span>
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-400/15 text-yellow-200 border border-yellow-500/30">
                  {filteredMenuItems.length}/{menuItems.length}
                </span>
              </div>
            </div>
            {menuLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
              </div>
            ) : menuItems.length === 0 ? (
              <p className="text-gray-300 text-center py-6">No menu items yet.</p>
            ) : filteredMenuItems.length === 0 ? (
              <p className="text-gray-300 text-center py-6">No matching products.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-yellow-500/20 rounded-lg p-4 bg-black/40 flex flex-col gap-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[112px_1fr] gap-4">
                      <div className="w-full sm:w-28 sm:shrink-0">
                        <div className="aspect-square rounded-lg overflow-hidden border border-yellow-500/20 bg-black/40">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-yellow-300 leading-tight truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {item.category === 'Others'
                                ? item.custom_category || 'Others'
                                : item.category}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              item.is_available
                                ? 'bg-green-500/20 text-green-300 border border-green-500/60'
                                : 'bg-red-500/20 text-red-300 border border-red-500/60'
                            }`}
                          >
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-base text-gray-100 font-bold">
                            ₱{Number(item.price).toFixed(2)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-300 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => toggleMenuAvailability(item)}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                          item.is_available
                            ? 'bg-red-600 text-white hover:bg-red-500'
                            : 'bg-green-600 text-white hover:bg-green-500'
                        }`}
                      >
                        {item.is_available ? 'Mark as Unavailable' : 'Mark as Available'}
                      </button>
                      <button
                        onClick={() => {
                          const resolvedCategory =
                            item.category === 'Others'
                              ? item.custom_category || 'Others'
                              : item.category;
                          setEditingMenuItem(item);
                          setMenuForm({
                            category: resolvedCategory,
                            custom_category: resolvedCategory === 'Others' ? item.custom_category || '' : '',
                            name: item.name,
                            description: item.description,
                            price: String(item.price),
                            imageFile: null,
                            image_url: item.image_url,
                          });
                          setMenuModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-md text-[15px] font-semibold bg-yellow-400 text-black hover:bg-yellow-300 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteMenuItem(item)}
                        className="px-2.5 py-1.5 rounded-md text-[13px] font-semibold bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/25 transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'announcements' && (
          <section className="bg-neutral-900 rounded-xl shadow-lg p-4 md:p-6 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-yellow-300">
                Promos & Announcements
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-1 border border-dashed border-yellow-500/60 rounded-lg p-4 bg-black/40">
                <h3 className="font-semibold text-yellow-300 mb-2">
                  New Announcement
                </h3>
                <input
                  type="text"
                  value={newAnnouncement.title}
                  onChange={(e) =>
                    setNewAnnouncement((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Title"
                  className="w-full mb-2 px-3 py-2 border border-yellow-500/40 rounded-lg text-sm bg-black text-white"
                />
                <textarea
                  value={newAnnouncement.content}
                  onChange={(e) =>
                    setNewAnnouncement((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Details"
                  rows={4}
                  className="w-full mb-3 px-3 py-2 border border-yellow-500/40 rounded-lg text-sm bg-black text-white"
                />
                <button
                  onClick={createAnnouncement}
                  className="w-full bg-yellow-400 text-black py-2 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition-all"
                >
                  Post Announcement
                </button>
              </div>

              <div className="md:col-span-2">
                {annLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                  </div>
                ) : announcements.length === 0 ? (
                  <p className="text-gray-300 text-center py-6">
                    No announcements yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((a) => (
                      <div
                        key={a.id}
                        className="border border-yellow-500/20 rounded-lg p-3 flex items-start justify-between gap-3 bg-black/40"
                      >
                        <div>
                          <p className="font-semibold text-yellow-300">{a.title}</p>
                          <p className="text-sm text-gray-200">{a.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(a.created_at).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleAnnouncementActive(a)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            a.active
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-neutral-800 text-gray-300'
                          }`}
                        >
                          {a.active ? 'Active' : 'Hidden'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'gallery' && (
          <section className="bg-neutral-900 rounded-xl shadow-lg p-4 md:p-6 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-yellow-300">Gallery Images</h2>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Upload up to <strong>10</strong> photos. These appear in the public gallery
              carousel.
            </p>

            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleGalleryUpload(e.target.files?.[0] || null)}
                className="w-full md:w-auto text-sm text-gray-200"
                disabled={uploadingImage}
              />
              <p className="text-xs text-gray-400">
                {galleryImages.length}/10 images uploaded
              </p>
            </div>

            {galleryLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
              </div>
            ) : galleryImages.length === 0 ? (
              <p className="text-gray-300 text-center py-6">
                No images yet. Upload your first gallery photo.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {galleryImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-black/40 border border-yellow-500/30"
                  >
                    <img
                      src={img.image_url}
                      alt="Gallery"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'game' && (
          <section className="bg-neutral-900 rounded-xl shadow-lg p-4 md:p-6 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-4">
              <Gamepad2 className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-yellow-300">Discount Game</h2>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Toggle each discount game on or off for all customers.
            </p>

            {gameLoading || !gameSettings ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-yellow-500/20 bg-black/30 p-3">
                  <div>
                    <p className="font-semibold text-gray-200">
                      Math Challenge is{' '}
                      <span
                        className={
                          (gameSettings.falling_pizza_active ?? gameSettings.is_active)
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {(gameSettings.falling_pizza_active ?? gameSettings.is_active) ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Last updated: {new Date(gameSettings.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={toggleFallingPizzaActive}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      (gameSettings.falling_pizza_active ?? gameSettings.is_active)
                        ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-200 hover:bg-green-500/30'
                    }`}
                  >
                    {(gameSettings.falling_pizza_active ?? gameSettings.is_active) ? 'Disable' : 'Enable'}
                  </button>
                </div>

                {/* Spin the Wheel game removed */}
              </div>
            )}
          </section>
        )}

        {isMasterAdmin && activeTab === 'admins' && (
          <section className="bg-neutral-900 rounded-xl shadow-lg p-4 md:p-6 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-yellow-300">Admin Accounts</h2>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Approve or decline admin access. Only the Master Admin can manage these accounts.
            </p>

            {adminsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
              </div>
            ) : admins.length === 0 ? (
              <p className="text-gray-300 text-center py-6">No admin accounts found.</p>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="border border-yellow-500/20 rounded-lg p-3 bg-black/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-yellow-300">
                        {admin.full_name}{' '}
                        {admin.is_master_admin && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-400 text-black">
                            MASTER ADMIN
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-300">{admin.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Registered:{' '}
                        {new Date(admin.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                          admin.is_active
                            ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                            : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}
                      >
                        {admin.is_active ? 'Approved' : 'Pending'}
                      </span>
                      {!admin.is_master_admin && (
                        <div className="flex gap-2">
                          {!admin.is_active ? (
                            <>
                              <button
                                onClick={() => updateAdminActive(admin, true)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-500 transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateAdminActive(admin, false)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-700 text-white hover:bg-red-600 transition-all"
                              >
                                Decline
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => updateAdminActive(admin, false)}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-700 text-white hover:bg-red-600 transition-all"
                            >
                              Disable
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}

