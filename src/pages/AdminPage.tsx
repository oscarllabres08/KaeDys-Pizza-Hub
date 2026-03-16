import { useEffect, useState } from 'react';
import { supabase, Announcement, GalleryImage, GameSettings, Order, OrderItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Pizza,
  ImageIcon,
  Megaphone,
  Gamepad2,
  ClipboardList,
  Loader2,
  Menu as MenuIcon,
  X,
  LogOut,
} from 'lucide-react';
import { MENU_ITEMS } from './MenuPage';

type OrderWithItems = Order & {
  order_items: OrderItem[];
};

type TabId = 'orders' | 'menu' | 'announcements' | 'gallery' | 'game';

const STATUS_LABELS: { id: Order['status']; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'on_the_way', label: 'On the Way' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

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
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('orders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [menuAvailability, setMenuAvailability] = useState<Record<string, boolean>>({});

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });

  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [gameLoading, setGameLoading] = useState(false);

  useEffect(() => {
    // Always load admin data for any logged-in user on the admin site
    fetchOrders();
    fetchAnnouncements();
    fetchGallery();
    fetchGameSettings();
  }, []);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items (*)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders((data || []) as OrderWithItems[]);
    } catch (error) {
      console.error('Error loading orders', error);
    } finally {
      setOrdersLoading(false);
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

  const toggleMenuAvailability = (id: string) => {
    setMenuAvailability((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('menuAvailability', JSON.stringify(next));
      } catch (error) {
        console.error('Error saving menu availability', error);
      }
      return next;
    });
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('menuAvailability');
      if (stored) {
        setMenuAvailability(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading menu availability', error);
    }
  }, []);

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

  const toggleGameActive = async () => {
    if (!gameSettings) return;
    try {
      const { error } = await supabase
        .from('game_settings')
        .update({ is_active: !gameSettings.is_active })
        .eq('id', gameSettings.id);

      if (error) throw error;
      await fetchGameSettings();
    } catch (error) {
      console.error('Error updating game settings', error);
    }
  };

  const handleSelectTab = (tab: TabId) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const navButtons = (
    <>
      <button
        onClick={() => handleSelectTab('orders')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          activeTab === 'orders'
            ? 'bg-yellow-400 text-black shadow-lg'
            : 'bg-neutral-900 text-gray-200 hover:bg-neutral-800'
        }`}
      >
        <ClipboardList className="w-4 h-4" />
        Orders
      </button>
      <button
        onClick={() => handleSelectTab('menu')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          activeTab === 'menu'
            ? 'bg-yellow-400 text-black shadow-lg'
            : 'bg-neutral-900 text-gray-200 hover:bg-neutral-800'
        }`}
      >
        <Pizza className="w-4 h-4" />
        Menu
      </button>
      <button
        onClick={() => handleSelectTab('announcements')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          activeTab === 'announcements'
            ? 'bg-yellow-400 text-black shadow-lg'
            : 'bg-neutral-900 text-gray-200 hover:bg-neutral-800'
        }`}
      >
        <Megaphone className="w-4 h-4" />
        Promos
      </button>
      <button
        onClick={() => handleSelectTab('gallery')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          activeTab === 'gallery'
            ? 'bg-yellow-400 text-black shadow-lg'
            : 'bg-neutral-900 text-gray-200 hover:bg-neutral-800'
        }`}
      >
        <ImageIcon className="w-4 h-4" />
        Gallery
      </button>
      <button
        onClick={() => handleSelectTab('game')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          activeTab === 'game'
            ? 'bg-yellow-400 text-black shadow-lg'
            : 'bg-neutral-900 text-gray-200 hover:bg-neutral-800'
        }`}
      >
        <Gamepad2 className="w-4 h-4" />
        Discount Game
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 pb-8">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-yellow-500/20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full border-2 border-yellow-400 overflow-hidden bg-black">
              <img
                src="/kaedypizza.jpg"
                alt="KaeDy's Pizza Hub Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-yellow-300">KaeDy&apos;s Pizza Hub</p>
              <p className="text-[11px] text-gray-400">Admin Dashboard</p>
            </div>
          </div>

          {/* Desktop nav + logout */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex flex-wrap gap-2 justify-end">{navButtons}</div>
            <button
              onClick={() => signOut()}
              className="ml-2 inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
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
                  <div className="h-8 w-8 rounded-full border-2 border-yellow-400 overflow-hidden bg-black">
                    <img
                      src="/kaedypizza.jpg"
                      alt="KaeDy's Pizza Hub Logo"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-yellow-300">KaeDy&apos;s Pizza Hub</p>
                    <p className="text-[11px] text-gray-400">Admin</p>
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
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
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

      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-yellow-300 mb-1">
            Admin Dashboard
          </h1>
          <p className="text-gray-300 text-sm md:text-base">
            Manage orders, menu availability, promotions, gallery, and the discount game.
          </p>
        </div>

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
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-yellow-500/20 rounded-lg p-4 hover:shadow-md transition-all bg-black/40"
                  >
                    <div className="flex flex-wrap justify-between gap-2 mb-3">
                      <div>
                        <p className="text-sm text-gray-300">
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.delivery_address}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-200">
                          Total:{' '}
                          <span className="font-semibold text-yellow-300">
                            ₱{order.final_amount.toFixed(2)}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Payment: {order.payment_method}
                        </p>
                      </div>
                    </div>
                    <div className="mb-3">
                      {order.order_items.map((item) => (
                        <p key={item.id} className="text-sm text-gray-200">
                          {item.quantity}x {item.menu_item_name} - ₱
                          {item.subtotal.toFixed(2)}
                        </p>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-yellow-500/20 pt-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-gray-400">Status:</span>
                        <select
                          value={order.status}
                          onChange={(e) =>
                            updateOrderStatus(order, e.target.value as Order['status'])
                          }
                          className="text-sm border border-yellow-500/40 rounded-lg px-2 py-1 bg-black text-white"
                        >
                          {STATUS_LABELS.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'menu' && (
          <section className="bg-neutral-900 rounded-xl shadow-lg p-4 md:p-6 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-4">
              <Pizza className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-yellow-300">Menu Availability</h2>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Toggle items as available or unavailable. The public hardcoded menu will respect these flags.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MENU_ITEMS.map((item) => {
                const available = menuAvailability[item.id] ?? true;
                return (
                  <div
                    key={item.id}
                    className="border border-yellow-500/20 rounded-lg p-4 flex flex-col gap-2 bg-black/40"
                  >
                    <p className="font-semibold text-yellow-300">{item.name}</p>
                    <p className="text-sm text-gray-300 line-clamp-2">
                      {item.description}
                    </p>
                    <p className="text-sm text-gray-200">
                      ₱{item.price.toFixed(2)} • {item.category}
                    </p>
                    <button
                      onClick={() => toggleMenuAvailability(item.id)}
                      className={`mt-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        available
                          ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                          : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'
                      }`}
                    >
                      {available ? 'Available' : 'Unavailable'}
                    </button>
                  </div>
                );
              })}
            </div>
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
              Toggle the Falling Pizza discount game on or off for all customers.
            </p>

            {gameLoading || !gameSettings ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-200">
                    Game is currently{' '}
                    <span className={gameSettings.is_active ? 'text-green-400' : 'text-red-400'}>
                      {gameSettings.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Last updated: {new Date(gameSettings.updated_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={toggleGameActive}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    gameSettings.is_active
                      ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
                      : 'bg-green-500/20 text-green-200 hover:bg-green-500/30'
                  }`}
                >
                  {gameSettings.is_active ? 'Disable Game' : 'Enable Game'}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

