import { useEffect, useMemo, useRef, useState } from 'react';
import { User, Package, Edit2, Save, X, Settings, Image as ImageIcon, ChevronDown, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Order, OrderItem } from '../lib/supabase';

type OrderWithItems = Order & {
  order_items: OrderItem[];
};

export default function ProfilePage() {
  const { user, customerProfile, loading: authLoading, profilesLoaded, refreshProfiles } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingOrders, setDeletingOrders] = useState(false);
  const [deleteOrdersError, setDeleteOrdersError] = useState<string | null>(null);
  const [editingFields, setEditingFields] = useState({
    full_name: false,
    phone: false,
    address: false,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    address: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const passwordNoticeRef = useRef<HTMLDivElement | null>(null);
  const [passwordSuccessModalOpen, setPasswordSuccessModalOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  const avatarOptions = [
    '/avatars/boy1.png',
    '/avatars/boy2.png',
    '/avatars/boy3.png',
    '/avatars/boy4.png',
    '/avatars/boy5.png',
    '/avatars/girl1.png',
    '/avatars/girl2.png',
    '/avatars/girl3.jpg',
    '/avatars/girl4.png',
    '/avatars/girl5.png',
  ];

  useEffect(() => {
    if (!customerProfile) return;
    fetchOrders();
    setProfileForm({
      full_name: customerProfile.full_name ?? '',
      phone: customerProfile.phone ?? '',
      address: customerProfile.address ?? '',
    });
  }, [customerProfile]);

  useEffect(() => {
    if (!user?.id) return;
    const key = `kph:avatar:${user.id}`;
    const saved = window.localStorage.getItem(key);
    setAvatarSrc(saved || null);
  }, [user?.id]);

  useEffect(() => {
    if (!passwordSuccess) return;
    const t = window.setTimeout(() => setPasswordSuccess(null), 8000);
    return () => window.clearTimeout(t);
  }, [passwordSuccess]);

  useEffect(() => {
    if (!passwordError && !passwordSuccess) return;
    // Ensure the note is visible after any loading/rerender.
    window.setTimeout(() => passwordNoticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
  }, [passwordError, passwordSuccess]);

  const fetchOrders = async () => {
    if (!customerProfile) return;

    setOrdersLoading(true);
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', customerProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(ordersData as OrderWithItems[]);
      setSelectedOrderIds((prev) => {
        // Remove selections for orders that no longer exist
        const ids = new Set((ordersData as OrderWithItems[]).map((o) => o.id));
        const next = new Set<string>();
        prev.forEach((id) => {
          if (ids.has(id)) next.add(id);
        });
        return next;
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-orange-100 text-orange-800';
      case 'on_the_way':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const canDeleteOrder = (status: string) => status === 'completed' || status === 'cancelled';

  const activeOrders = useMemo(
    () => orders.filter((o) => !o.is_archived && o.status !== 'completed' && o.status !== 'cancelled'),
    [orders]
  );
  const historyOrders = useMemo(
    () => orders.filter((o) => !!o.is_archived || o.status === 'completed' || o.status === 'cancelled'),
    [orders]
  );

  const toggleSelectOrder = (orderId: string, status: string) => {
    if (!canDeleteOrder(status)) return;
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const selectAllDeletable = () => {
    setSelectedOrderIds(() => {
      const next = new Set<string>();
      historyOrders.forEach((o) => {
        if (canDeleteOrder(o.status)) next.add(o.id);
      });
      return next;
    });
  };

  const clearSelection = () => setSelectedOrderIds(new Set());

  const openDeleteConfirmForSelected = () => {
    setDeleteOrdersError(null);
    if (selectedOrderIds.size === 0) return;
    setDeleteConfirmOpen(true);
  };

  const openDeleteConfirmForSingle = (orderId: string, status: string) => {
    if (!canDeleteOrder(status)) return;
    setDeleteOrdersError(null);
    setSelectedOrderIds(new Set([orderId]));
    setDeleteConfirmOpen(true);
  };

  const handleDeleteSelectedOrders = async () => {
    if (!customerProfile) return;
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0) return;
    setDeletingOrders(true);
    setDeleteOrdersError(null);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('user_id', customerProfile.id)
        .in('status', ['completed', 'cancelled'])
        .in('id', ids);
      if (error) throw error;
      setDeleteConfirmOpen(false);
      clearSelection();
      await fetchOrders();
    } catch (error) {
      console.error('Error deleting orders:', error);
      setDeleteOrdersError('Unable to delete selected orders. Please try again.');
    } finally {
      setDeletingOrders(false);
    }
  };

  const handleProfileChange = (field: 'full_name' | 'phone' | 'address', value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const isEditingAny = editingFields.full_name || editingFields.phone || editingFields.address;

  const startEditField = (field: keyof typeof editingFields) => {
    setEditingFields((prev) => ({ ...prev, [field]: true }));
  };

  const cancelEditing = () => {
    if (!customerProfile) return;
    setEditingFields({ full_name: false, phone: false, address: false });
    setProfileForm({
      full_name: customerProfile.full_name ?? '',
      phone: customerProfile.phone ?? '',
      address: customerProfile.address ?? '',
    });
  };

  const handlePickAvatar = (src: string) => {
    if (!user?.id) return;
    const key = `kph:avatar:${user.id}`;
    window.localStorage.setItem(key, src);
    setAvatarSrc(src);
    setAvatarPickerOpen(false);
  };

  const handleSaveProfile = async () => {
    if (!customerProfile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('customer_profiles')
        .update({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim(),
          address: profileForm.address.trim() || null,
        })
        .eq('id', customerProfile.id);
      if (error) throw error;
      await refreshProfiles();
      setEditingFields({ full_name: false, phone: false, address: false });
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    const email = user?.email ?? customerProfile?.email;
    if (!email) {
      setPasswordError('Missing email for verification.');
      return;
    }
    if (currentPassword.length === 0) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      // Re-authenticate to verify current password before allowing change.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) {
        setPasswordError('Current password is incorrect.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Password changed successfully. Use your new password next time you sign in.');
      setPasswordSuccessModalOpen(true);
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('Unable to change password. Please try again.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (authLoading || !profilesLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-16 px-4 flex items-center justify-center">
        <p className="text-xl text-gray-300">Loading...</p>
      </div>
    );
  }

  if (!customerProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-yellow-300 mb-2">You&apos;re not signed in.</p>
          <p className="text-sm text-gray-300">Please sign in to view your profile and order history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 animate-fadeIn">
          <h1 className="text-3xl md:text-4xl font-black text-yellow-300 tracking-tight">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            View and update your personal details and orders.
          </p>
        </div>

        <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.7)] p-6 md:p-8 mb-8 border border-yellow-500/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAvatarPickerOpen(true)}
                  className="group relative bg-yellow-500/10 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center border border-yellow-500/40 shadow-inner shadow-yellow-500/20 overflow-hidden hover:border-yellow-400/70 transition-colors"
                  aria-label="Choose avatar"
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <User className="w-9 h-9 md:w-10 md:h-10 text-yellow-300" />
                  )}
                  <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute bottom-1.5 right-1.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/80 border border-yellow-500/60 text-yellow-200 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageIcon className="w-4 h-4" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarPickerOpen(true)}
                  className="absolute left-1/2 -bottom-2.5 -translate-x-1/2 px-3.5 py-1 rounded-lg text-[11px] font-semibold bg-yellow-600 text-black border border-yellow-500 shadow-md hover:bg-yellow-500 transition-colors"
                  aria-label="Add avatar"
                >
                  Add
                </button>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-yellow-200 leading-tight">
                  {customerProfile.full_name}
                </h2>
                {customerProfile.username && (
                  <p className="text-sm text-yellow-300/90 mt-1">
                    @{customerProfile.username}
                  </p>
                )}
                {user?.email && (
                  <p className="text-sm text-gray-300 mt-1 break-all">
                    {user.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="rounded-2xl bg-black/40 border border-yellow-500/15 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-wide text-yellow-300/80 uppercase">
                  Full Name
                </p>
                {!editingFields.full_name && (
                  <button
                    type="button"
                    onClick={() => startEditField('full_name')}
                    className="p-2 -m-2 rounded-lg text-yellow-200/90 hover:text-yellow-100 hover:bg-yellow-500/10 transition-colors"
                    aria-label="Edit full name"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editingFields.full_name ? (
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => handleProfileChange('full_name', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-black/70 border border-yellow-500/40 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-100 font-medium">
                  {customerProfile.full_name}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-black/40 border border-yellow-500/15 px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wide text-yellow-300/80 uppercase">
                Username
              </p>
              <p className="mt-1 text-sm text-gray-100 break-all">
                {customerProfile.username ? `@${customerProfile.username}` : '—'}
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                Username cannot be edited.
              </p>
            </div>

            <div className="rounded-2xl bg-black/40 border border-yellow-500/15 px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wide text-yellow-300/80 uppercase">
                Email
              </p>
              <p className="mt-1 text-sm text-gray-100 break-all">
                {user?.email ?? customerProfile.email}
              </p>
            </div>

            <div className="rounded-2xl bg-black/40 border border-yellow-500/15 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-wide text-yellow-300/80 uppercase">
                  Phone Number
                </p>
                {!editingFields.phone && (
                  <button
                    type="button"
                    onClick={() => startEditField('phone')}
                    className="p-2 -m-2 rounded-lg text-yellow-200/90 hover:text-yellow-100 hover:bg-yellow-500/10 transition-colors"
                    aria-label="Edit phone number"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editingFields.phone ? (
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-black/70 border border-yellow-500/40 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-100">
                  {customerProfile.phone || '—'}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-black/40 border border-yellow-500/15 px-4 py-3 md:row-span-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-wide text-yellow-300/80 uppercase">
                  Address
                </p>
                {!editingFields.address && (
                  <button
                    type="button"
                    onClick={() => startEditField('address')}
                    className="p-2 -m-2 rounded-lg text-yellow-200/90 hover:text-yellow-100 hover:bg-yellow-500/10 transition-colors"
                    aria-label="Edit address"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editingFields.address ? (
                <textarea
                  value={profileForm.address}
                  onChange={(e) => handleProfileChange('address', e.target.value)}
                  rows={2}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-black/70 border border-yellow-500/40 text-gray-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-100 whitespace-pre-line">
                  {customerProfile.address || '—'}
                </p>
              )}
            </div>
          </div>

          {isEditingAny && (
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelEditing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-neutral-800 text-gray-100 hover:bg-neutral-700 transition-colors"
                disabled={savingProfile}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-400 text-black hover:bg-yellow-300 transition-colors disabled:opacity-70"
                disabled={savingProfile}
              >
                <Save className="w-4 h-4" />
                {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          )}

          {/* Account settings dropdown */}
          <div className="mt-8 pt-6 border-t border-yellow-500/15">
            <button
              type="button"
              onClick={() => setAccountSettingsOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-3 rounded-2xl bg-black/35 border border-yellow-500/15 px-4 py-3 hover:border-yellow-500/30 transition-colors"
              aria-expanded={accountSettingsOpen}
            >
              <span className="inline-flex items-center gap-2">
                <Settings className="w-5 h-5 text-yellow-400" />
                <span className="text-lg font-bold text-yellow-300">Account Settings</span>
              </span>
              <ChevronDown
                className={`w-5 h-5 text-yellow-200 transition-transform ${accountSettingsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {accountSettingsOpen && (
              <div className="mt-4 rounded-2xl bg-black/30 border border-yellow-500/10 p-4">
                {(passwordError || passwordSuccess) && (
                  <div ref={passwordNoticeRef}>
                    {passwordError && (
                      <div
                        role="alert"
                        className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3"
                      >
                        <p className="text-sm text-red-300 font-semibold">{passwordError}</p>
                      </div>
                    )}
                    {passwordSuccess && (
                      <div
                        role="status"
                        className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
                      >
                        <p className="text-sm text-emerald-300 font-semibold">{passwordSuccess}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-yellow-500/40 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-yellow-500/40 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-yellow-500/40 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-400 text-black hover:bg-yellow-300 transition-colors disabled:opacity-70"
                    disabled={passwordSaving}
                  >
                    {passwordSaving ? 'Updating...' : 'Change Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-neutral-900 rounded-xl shadow-lg p-6 border border-yellow-500/30">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-6 h-6 text-yellow-400" />
            <h2 className="text-2xl font-bold text-yellow-300">My Orders</h2>
          </div>

          {ordersLoading ? (
            <p className="text-center text-gray-300">Loading orders...</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-yellow-200 mb-3">My Orders</h3>
                {activeOrders.length === 0 ? (
                  <p className="text-sm text-gray-400">No active orders.</p>
                ) : (
                  <div className="space-y-4">
                    {activeOrders.map((order) => (
                      <div key={order.id} className="relative">
                        <div className="border border-yellow-500/20 rounded-lg p-4 hover:shadow-md transition-all bg-black/40">
                          <div className="flex justify-between items-start mb-3 gap-3">
                            <div>
                              <p className="text-sm text-gray-300">Order #{order.id.slice(0, 8)}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(order.created_at).toLocaleDateString()} at{' '}
                                {new Date(order.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(order.status)}`}>
                              {getStatusText(order.status)}
                            </span>
                          </div>

                          <div className="mb-3">
                            {order.order_items.map((item) => (
                              <p key={item.id} className="text-sm text-gray-200">
                                {item.quantity}x {item.menu_item_name} - ₱{item.subtotal.toFixed(2)}
                              </p>
                            ))}
                          </div>

                          <div className="border-t border-yellow-500/20 pt-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">Subtotal:</span>
                              <span className="font-semibold text-yellow-300">₱{order.total_amount.toFixed(2)}</span>
                            </div>
                            {order.discount_amount > 0 && (
                              <div className="flex justify-between text-sm text-green-400">
                                <span>Discount:</span>
                                <span className="font-semibold">-₱{order.discount_amount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-lg font-bold mt-2 text-yellow-300">
                              <span>Total:</span>
                              <span className="text-white">₱{order.final_amount.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-yellow-200 mb-3">Order History</h3>
                {historyOrders.length === 0 ? (
                  <p className="text-sm text-gray-400">No order history yet.</p>
                ) : (
                  <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl border border-yellow-500/15 bg-black/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-200">
                  <span className="font-semibold text-yellow-300">{selectedOrderIds.size}</span>{' '}
                  selected
                </div>
                <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={selectAllDeletable}
                    className="px-3 py-1.5 rounded text-xs font-semibold border border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/10 transition-colors whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Select all (completed/cancelled)</span>
                    <span className="sm:hidden">Select all</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-neutral-800 text-gray-100 hover:bg-neutral-700 transition-colors whitespace-nowrap"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={openDeleteConfirmForSelected}
                    disabled={selectedOrderIds.size === 0}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold bg-red-500 text-white hover:bg-red-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
              {historyOrders.map((order) => (
                <div key={order.id} className="relative">
                <div
                  className="border border-yellow-500/20 rounded-lg p-4 hover:shadow-md transition-all bg-black/40"
                >
                  <div className="flex justify-between items-start mb-3 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.has(order.id)}
                          disabled={!canDeleteOrder(order.status)}
                          onChange={() => toggleSelectOrder(order.id, order.status)}
                          className="h-4 w-4 accent-yellow-400 disabled:opacity-40"
                          aria-label={`Select order ${order.id.slice(0, 8)} for deletion`}
                        />
                      <p className="text-sm text-gray-300">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()} at{' '}
                        {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirmForSingle(order.id, order.status)}
                        disabled={!canDeleteOrder(order.status)}
                        className="p-2 rounded-md border border-red-500/25 text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Delete order"
                        title={
                          canDeleteOrder(order.status)
                            ? 'Delete order'
                            : 'Only completed/cancelled orders can be deleted'
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

                  <div className="border-t border-yellow-500/20 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Subtotal:</span>
                      <span className="font-semibold text-yellow-300">
                        ₱{order.total_amount.toFixed(2)}
                      </span>
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-green-400">
                        <span>Discount:</span>
                        <span className="font-semibold">
                          -₱{order.discount_amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold mt-2 text-yellow-300">
                      <span>Total:</span>
                      <span className="text-white">₱{order.final_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-300">Payment:</span>
                      <span className="font-semibold text-gray-100">
                        {order.payment_method}
                      </span>
                    </div>
                  </div>
                </div>
                </div>
              ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {avatarPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setAvatarPickerOpen(false)}
            aria-label="Close avatar picker"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-neutral-950 border border-yellow-500/40 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-yellow-300">Choose an avatar</h3>
                <p className="text-xs text-gray-300 mt-1">Saved locally on this device.</p>
              </div>
              <button
                type="button"
                onClick={() => setAvatarPickerOpen(false)}
                className="p-2 rounded-xl bg-black/60 text-gray-200 border border-yellow-500/25 hover:bg-black/75 hover:text-white transition-all"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-5">
              <div className="grid grid-cols-5 gap-3">
                {avatarOptions.map((src) => {
                  const selected = src === avatarSrc;
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => handlePickAvatar(src)}
                      className={`relative aspect-square rounded-full overflow-hidden border transition-colors ${
                        selected
                          ? 'border-yellow-400 ring-2 ring-yellow-400/40'
                          : 'border-yellow-500/25 hover:border-yellow-400/60'
                      }`}
                      aria-label={`Select avatar ${src}`}
                    >
                      <img
                        src={src}
                        alt="Avatar option"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {passwordSuccessModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setPasswordSuccessModalOpen(false)}
            aria-label="Close success modal"
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-neutral-950 border border-emerald-500/30 shadow-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <h3 className="text-lg font-bold text-emerald-300">
                Password updated
              </h3>
              <p className="mt-2 text-sm text-gray-200">
                Your password has been changed successfully.
              </p>
              <p className="mt-2 text-xs text-gray-400">
                Use your new password the next time you sign in.
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPasswordSuccessModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 text-black hover:bg-emerald-400 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => (!deletingOrders ? setDeleteConfirmOpen(false) : null)}
            aria-label="Close delete confirmation"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-neutral-950 border border-red-500/30 shadow-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <h3 className="text-lg font-bold text-red-300">Delete order(s)?</h3>
              <p className="mt-2 text-sm text-gray-200">
                You are about to delete{' '}
                <span className="font-semibold text-yellow-200">{selectedOrderIds.size}</span>{' '}
                order(s). This is only allowed for <span className="font-semibold">Completed</span>{' '}
                or <span className="font-semibold">Cancelled</span> orders.
              </p>
              <p className="mt-2 text-xs text-gray-400">
                This action cannot be undone.
              </p>

              {deleteOrdersError && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                  <p className="text-sm text-red-300 font-semibold">{deleteOrdersError}</p>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={deletingOrders}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-neutral-800 text-gray-100 hover:bg-neutral-700 transition-colors disabled:opacity-70"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedOrders}
                  disabled={deletingOrders || selectedOrderIds.size === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-400 transition-colors disabled:opacity-70"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingOrders ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
