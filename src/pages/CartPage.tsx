import { useCallback, useEffect, useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useBuyNow } from '../contexts/BuyNowContext';
import { supabase } from '../lib/supabase';

type CartPageProps = {
  onNavigate: (page: string) => void;
  startInCheckout?: boolean;
};

export default function CartPage({ onNavigate, startInCheckout = false }: CartPageProps) {
  type WalletMethod = 'GCash' | 'Maya' | 'PayPal';
  const WALLET_METHODS: WalletMethod[] = ['GCash', 'Maya', 'PayPal'];
  const {
    cart,
    updateQuantity,
    removeFromCart,
    cartTotal,
    discountPercent,
    discountAmount,
    finalTotal,
    clearCart,
  } = useCart();
  const { buyNowItems, buyNowTotal, updateBuyNowQuantity, clearBuyNow } = useBuyNow();
  const { user, customerProfile } = useAuth();
  // Cart: "Proceed to Checkout" opens delivery form. Buy Now (#checkout): review → Proceed → delivery form.
  const [showCheckout, setShowCheckout] = useState(false);
  const [buyNowCheckoutStep, setBuyNowCheckoutStep] = useState<'review' | 'details'>('review');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | WalletMethod>('COD');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [walletSettings, setWalletSettings] = useState<
    Record<WalletMethod, { qrSrc: string | null; accountNumber: string | null }>
  >({
    GCash: { qrSrc: '/QR.png', accountNumber: null },
    Maya: { qrSrc: null, accountNumber: null },
    PayPal: { qrSrc: null, accountNumber: null },
  });
  const [notes, setNotes] = useState('');
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'info' | 'success' | 'error';
    onClose?: () => void;
  }>({ open: false, title: '', message: '', variant: 'info' });

  const openModal = (next: Omit<typeof modal, 'open'>) => {
    setModal({ ...next, open: true });
  };

  const closeModal = () => {
    const cb = modal.onClose;
    setModal((m) => ({ ...m, open: false, onClose: undefined }));
    cb?.();
  };

  const modalEl = modal.open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
      <div className="relative w-full max-w-md rounded-2xl border border-yellow-500/25 bg-neutral-950 shadow-2xl">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className={`text-base font-bold ${
                  modal.variant === 'success'
                    ? 'text-green-300'
                    : modal.variant === 'error'
                      ? 'text-red-300'
                      : 'text-yellow-300'
                }`}
              >
                {modal.title}
              </p>
              <p className="text-sm text-gray-300 mt-2 leading-relaxed">{modal.message}</p>
            </div>
            <button
              onClick={closeModal}
              className="shrink-0 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 transition-all"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={closeModal}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                modal.variant === 'success'
                  ? 'bg-green-600 text-white hover:bg-green-500'
                  : modal.variant === 'error'
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'bg-yellow-400 text-black hover:bg-yellow-300'
              }`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  /** Buy Now session (separate from cart — does not remove cart items) */
  const isBuyNowFlow = !!buyNowItems && buyNowItems.length > 0;
  const isBuyNowRoute = startInCheckout && isBuyNowFlow;
  const showBuyNowDeliveryForm = isBuyNowRoute && buyNowCheckoutStep === 'details';
  const isCartCheckoutForm = !startInCheckout && showCheckout;

  const deliveryFormVisible = showBuyNowDeliveryForm || isCartCheckoutForm;

  const loadWalletSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payment_method_settings')
        .select('method, qr_storage_path, account_number, updated_at')
        .in('method', WALLET_METHODS);

      if (error) throw error;
      const next: Record<WalletMethod, { qrSrc: string | null; accountNumber: string | null }> = {
        GCash: { qrSrc: '/QR.png', accountNumber: null },
        Maya: { qrSrc: null, accountNumber: null },
        PayPal: { qrSrc: null, accountNumber: null },
      };
      for (const row of data || []) {
        const method = row.method as WalletMethod;
        const qrPath = row.qr_storage_path;
        const account = row.account_number ?? null;
        if (!qrPath) {
          next[method] = {
            qrSrc: method === 'GCash' ? '/QR.png' : null,
            accountNumber: account,
          };
          continue;
        }
        const { data: pub } = supabase.storage.from('payment-qr').getPublicUrl(qrPath);
        const v = row.updated_at ? `?v=${encodeURIComponent(row.updated_at)}` : '';
        next[method] = {
          qrSrc: `${pub.publicUrl}${v}`,
          accountNumber: account,
        };
      }
      setWalletSettings(next);
    } catch (e) {
      console.warn('Could not load payment method settings; using fallback.', e);
      setWalletSettings({
        GCash: { qrSrc: '/QR.png', accountNumber: null },
        Maya: { qrSrc: null, accountNumber: null },
        PayPal: { qrSrc: null, accountNumber: null },
      });
    }
  }, []);

  useEffect(() => {
    void loadWalletSettings();
  }, [loadWalletSettings]);

  useEffect(() => {
    if (paymentMethod === 'COD') return;
    const channel = supabase
      .channel('cart-payment-settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_method_settings' },
        () => {
          void loadWalletSettings();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [paymentMethod, loadWalletSettings]);

  useEffect(() => {
    if (startInCheckout) setBuyNowCheckoutStep('review');
  }, [startInCheckout]);

  useEffect(() => {
    if (!deliveryFormVisible) return;
    setDeliveryName(customerProfile?.full_name || '');
    setDeliveryPhone(customerProfile?.phone || '');
    setDeliveryEmail(user?.email || '');
  }, [deliveryFormVisible, customerProfile, user?.email]);

  /** Line items for place order — cart checkout uses cart only; Buy Now delivery uses buyNow only */
  const checkoutLineItems = showBuyNowDeliveryForm
    ? buyNowItems!
    : isCartCheckoutForm
      ? cart
      : [];
  const checkoutSubtotal = showBuyNowDeliveryForm ? buyNowTotal : isCartCheckoutForm ? cartTotal : 0;
  const checkoutDiscountPercent = showBuyNowDeliveryForm ? 0 : discountPercent;
  const checkoutDiscountAmount = showBuyNowDeliveryForm ? 0 : discountAmount;
  const checkoutFinalTotal = showBuyNowDeliveryForm ? buyNowTotal : isCartCheckoutForm ? finalTotal : 0;

  const showCheckoutForm = showBuyNowDeliveryForm || isCartCheckoutForm;

  const handleCheckout = async () => {
    if (!user || !customerProfile) return;

    if (!checkoutLineItems || checkoutLineItems.length === 0) {
      openModal({
        title: 'No items to checkout',
        message: 'Please add items before placing an order.',
        variant: 'info',
      });
      return;
    }

    if (!deliveryName.trim() || !deliveryPhone.trim() || !deliveryAddress.trim() || !deliveryEmail.trim()) {
      openModal({
        title: 'Complete Delivery Information',
        message: 'Please complete delivery information (Name, Phone, Address, Email).',
        variant: 'info',
      });
      return;
    }

    if (paymentMethod !== 'COD' && (!paymentReference || !paymentProof)) {
      openModal({
        title: 'E-wallet Payment Required',
        message: 'Please provide the reference number and upload proof of payment.',
        variant: 'info',
      });
      return;
    }

    setLoading(true);

    try {
      let paymentProofUrl = null;

      if (paymentProof) {
        const fileExt = paymentProof.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, paymentProof);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(uploadData.path);

        paymentProofUrl = urlData.publicUrl;
      }

      const notesPayload =
        (notes ? `${notes.trim()}\n\n` : '') +
        `Customer: ${deliveryName.trim()}\nEmail: ${deliveryEmail.trim()}`;

      const pItems = checkoutLineItems.map((item) => ({
        menu_item_id: item.id,
        menu_item_name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      }));

      // One DB round-trip: prevents flaky mobile networks from inserting the order
      // but failing on a second request (user sees error while order exists in admin).
      const { data: orderId, error: placeError } = await supabase.rpc('place_customer_order', {
        p_total_amount: checkoutSubtotal,
        p_discount_amount: checkoutDiscountAmount,
        p_final_amount: checkoutFinalTotal,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference?.trim() || null,
        p_payment_proof_url: paymentProofUrl,
        p_delivery_address: deliveryAddress.trim(),
        p_contact_phone: deliveryPhone.trim(),
        p_notes: notesPayload,
        p_items: pItems,
      });

      if (placeError) throw placeError;
      if (!orderId) throw new Error('place_customer_order returned no order id');

      if (showBuyNowDeliveryForm) {
        clearBuyNow();
      } else {
        clearCart();
      }
      openModal({
        title: 'Order Placed',
        message: 'Order placed successfully! We will notify you once confirmed.',
        variant: 'success',
        onClose: () => onNavigate('home'),
      });
    } catch (error) {
      console.error('Error placing order:', error);
      openModal({
        title: 'Checkout Failed',
        message: 'Failed to place order. Please try again.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <>
        {modalEl}
        <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-16 px-4 flex items-center justify-center">
          <div className="text-center">
            <ShoppingBag className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-yellow-300 mb-4">
              Please sign in to view your cart
            </h2>
            <button
              onClick={() => onNavigate('auth')}
              className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  // #checkout URL is only for Buy Now (direct checkout). Normal cart uses #cart → Proceed to Checkout.
  if (startInCheckout && !isBuyNowFlow) {
    return (
      <>
        {modalEl}
        <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-16 px-4 flex items-center justify-center">
          <div className="text-center max-w-md space-y-4">
            <ShoppingBag className="w-24 h-24 text-yellow-400 mx-auto mb-2" />
            <h2 className="text-2xl font-bold text-yellow-300">Buy Now checkout</h2>
            <p className="text-sm text-gray-400">
              This page is for orders started with <span className="text-yellow-200 font-semibold">Buy Now</span> from
              the menu. Your saved cart is separate and unchanged.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => onNavigate('menu')}
                className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all"
              >
                Go to Menu
              </button>
              <button
                type="button"
                onClick={() => onNavigate('cart')}
                className="bg-neutral-800 text-gray-200 px-8 py-3 rounded-lg font-semibold hover:bg-neutral-700 transition-all border border-yellow-500/25"
              >
                Open Cart
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!startInCheckout && cart.length === 0 && !isBuyNowFlow) {
    return (
      <>
        {modalEl}
        <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-16 px-4 flex items-center justify-center">
          <div className="text-center">
            <ShoppingBag className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-yellow-300 mb-4">Your cart is empty</h2>
            <button
              onClick={() => onNavigate('menu')}
              className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all"
            >
              Browse Menu
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!startInCheckout && cart.length === 0 && isBuyNowFlow) {
    return (
      <>
        {modalEl}
        <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-16 px-4 flex items-center justify-center">
          <div className="text-center max-w-md space-y-4">
            <ShoppingBag className="w-24 h-24 text-yellow-400 mx-auto mb-2" />
            <h2 className="text-2xl font-bold text-yellow-300">Your cart is empty</h2>
            <p className="text-sm text-gray-400">
              You still have a <span className="text-yellow-200 font-semibold">Buy Now</span> order in progress (separate
              from this cart).
            </p>
            <button
              type="button"
              onClick={() => onNavigate('checkout')}
              className="w-full bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all"
            >
              Continue Buy Now checkout
            </button>
            <button
              type="button"
              onClick={() => onNavigate('menu')}
              className="w-full bg-neutral-800 text-gray-200 px-8 py-3 rounded-lg font-semibold hover:bg-neutral-700 transition-all border border-yellow-500/25"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </>
    );
  }

  /* Buy Now: review item(s) + quantity, then Proceed to Checkout (delivery form) */
  if (isBuyNowRoute && buyNowCheckoutStep === 'review' && buyNowItems && buyNowItems.length > 0) {
    return (
      <>
        {modalEl}
        <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-yellow-300">Buy Now — Review</h1>
              <p className="text-sm text-gray-400 mt-1">
                Adjust quantity, then continue. Your saved cart is unchanged.
              </p>
            </div>

            <div className="bg-neutral-900/80 rounded-2xl shadow-xl p-4 sm:p-6 mb-6 border border-yellow-500/25">
              {buyNowItems.map((item) => (
                <div key={item.id} className="py-4 border-b border-yellow-500/15 last:border-b-0">
                  <div className="flex gap-4">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-xl shrink-0 border border-yellow-500/15"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-yellow-300 break-words leading-snug">{item.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">₱{item.price.toFixed(2)} each</p>

                      <div className="mt-3 inline-flex items-center gap-2 bg-black/40 border border-yellow-500/25 rounded-full px-2 py-1">
                        <button
                          type="button"
                          onClick={() => updateBuyNowQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-neutral-900 hover:bg-neutral-800 transition-all"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4 text-gray-200" />
                        </button>
                        <span className="font-semibold w-8 text-center text-gray-100">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateBuyNowQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-neutral-900 hover:bg-neutral-800 transition-all"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4 text-gray-200" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Item total</span>
                    <span className="font-bold text-yellow-300">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-neutral-900/80 rounded-xl border border-yellow-500/25 p-3 sm:p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-yellow-300">Order Summary</h2>
                <span className="text-[11px] text-gray-400">{buyNowItems.length} item(s)</span>
              </div>
              <div className="flex justify-between text-base font-bold text-yellow-300 pt-2 border-t border-yellow-500/20">
                <span>Total</span>
                <span className="text-white">₱{buyNowTotal.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearBuyNow();
                    onNavigate('menu');
                  }}
                  className="flex-1 inline-flex min-h-[42px] items-center justify-center rounded-lg bg-neutral-800 px-3 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-neutral-700 sm:px-4"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setBuyNowCheckoutStep('details')}
                  className="flex-1 inline-flex min-h-[42px] items-center justify-center rounded-lg bg-yellow-400 px-3 py-3 text-center text-sm font-semibold leading-normal text-black shadow-md transition-colors hover:bg-yellow-300 sm:px-4"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (showCheckoutForm && checkoutLineItems.length > 0) {
    return (
      <>
        {modalEl}
        <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-neutral-900 rounded-xl shadow-lg p-6 border border-yellow-500/30">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-yellow-300">
                  {showBuyNowDeliveryForm ? 'Buy Now — Checkout' : 'Checkout'}
                </h2>
                {showBuyNowDeliveryForm && (
                  <p className="text-xs text-gray-400 mt-2">
                    This order is separate from your cart. Items in your cart stay saved.
                  </p>
                )}
              </div>

            <div className="mb-6">
              <h3 className="font-semibold text-yellow-300 mb-2">Delivery Information</h3>
              <p className="text-xs text-gray-400 mb-3">
                Please fill out all delivery details. For address, include your complete address:
                Zone, Street, Barangay, City, and Province.
              </p>
              <div className="bg-black/40 p-4 rounded-lg space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Name</label>
                  <input
                    value={deliveryName}
                    onChange={(e) => setDeliveryName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Phone</label>
                  <input
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Complete Address</label>
                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400"
                    rows={3}
                    placeholder="Zone, Street, Barangay, City, Province"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Email</label>
                  <input
                    value={deliveryEmail}
                    onChange={(e) => setDeliveryEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400"
                    placeholder="Email address"
                    inputMode="email"
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <label className="block text-sm font-semibold text-gray-100">
                  Payment Method
                </label>
                <span className="text-[11px] text-gray-400">
                  Choose how you want to pay
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  className={`group flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
                    paymentMethod === 'COD'
                      ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_0_1px_rgba(250,204,21,0.35)]'
                      : 'border-white/10 bg-black/30 hover:border-yellow-500/60 hover:bg-black/40'
                  }`}
                >
                  <div
                    className={`mt-0.5 h-8 w-8 rounded-full border text-xs font-bold flex items-center justify-center ${
                      paymentMethod === 'COD'
                        ? 'border-yellow-400 text-yellow-300 bg-yellow-500/10'
                        : 'border-gray-500 text-gray-300 bg-black/40'
                    }`}
                  >
                    COD
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        paymentMethod === 'COD' ? 'text-yellow-200' : 'text-gray-100'
                      }`}
                    >
                      Cash on Delivery
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Pay when your order arrives.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('GCash')}
                  className={`group flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
                    paymentMethod === 'GCash'
                      ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_0_1px_rgba(250,204,21,0.35)]'
                      : 'border-white/10 bg-black/30 hover:border-yellow-500/60 hover:bg-black/40'
                  }`}
                >
                  <div
                    className={`mt-0.5 h-8 w-8 rounded-full border text-xs font-extrabold flex items-center justify-center ${
                      paymentMethod === 'GCash'
                        ? 'border-yellow-400 text-yellow-300 bg-yellow-500/10'
                        : 'border-gray-500 text-gray-300 bg-black/40'
                    }`}
                  >
                    G
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        paymentMethod === 'GCash' ? 'text-yellow-200' : 'text-gray-100'
                      }`}
                    >
                      GCash
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">Scan QR or use account number.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Maya')}
                  className={`group flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
                    paymentMethod === 'Maya'
                      ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_0_1px_rgba(250,204,21,0.35)]'
                      : 'border-white/10 bg-black/30 hover:border-yellow-500/60 hover:bg-black/40'
                  }`}
                >
                  <div
                    className={`mt-0.5 h-8 w-8 rounded-full border text-xs font-extrabold flex items-center justify-center ${
                      paymentMethod === 'Maya'
                        ? 'border-yellow-400 text-yellow-300 bg-yellow-500/10'
                        : 'border-gray-500 text-gray-300 bg-black/40'
                    }`}
                  >
                    M
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${paymentMethod === 'Maya' ? 'text-yellow-200' : 'text-gray-100'}`}>Maya</p>
                    <p className="text-[11px] text-gray-400 mt-1">Scan QR or use account number.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('PayPal')}
                  className={`group flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
                    paymentMethod === 'PayPal'
                      ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_0_1px_rgba(250,204,21,0.35)]'
                      : 'border-white/10 bg-black/30 hover:border-yellow-500/60 hover:bg-black/40'
                  }`}
                >
                  <div
                    className={`mt-0.5 h-8 w-8 rounded-full border text-xs font-extrabold flex items-center justify-center ${
                      paymentMethod === 'PayPal'
                        ? 'border-yellow-400 text-yellow-300 bg-yellow-500/10'
                        : 'border-gray-500 text-gray-300 bg-black/40'
                    }`}
                  >
                    P
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${paymentMethod === 'PayPal' ? 'text-yellow-200' : 'text-gray-100'}`}>PayPal</p>
                    <p className="text-[11px] text-gray-400 mt-1">Scan QR or use account number.</p>
                  </div>
                </button>
              </div>
            </div>

            {paymentMethod !== 'COD' && (
              <div className="mb-6 p-4 bg-black/40 rounded-xl border border-yellow-500/30">
                <div className="text-center mb-4">
                  <p className="font-semibold text-yellow-300 mb-2">
                    {paymentMethod} - Scan QR Code to Pay
                  </p>
                  <div className="bg-black/60 p-4 rounded-xl inline-block border border-white/10">
                    {walletSettings[paymentMethod as WalletMethod]?.qrSrc ? (
                      <img
                        src={walletSettings[paymentMethod as WalletMethod].qrSrc || ''}
                        alt={`${paymentMethod} QR Code`}
                        className="w-48 h-48 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 rounded-lg border border-dashed border-gray-600 flex items-center justify-center text-gray-500 text-sm px-3">
                        No QR uploaded yet for {paymentMethod}.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4 rounded-lg border border-yellow-500/20 bg-black/30 px-3 py-2">
                  <p className="text-xs font-semibold text-gray-400">E-wallet account number</p>
                  <p className="text-sm text-yellow-200 mt-1 break-words">
                    {walletSettings[paymentMethod as WalletMethod]?.accountNumber || 'No account number set yet.'}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400"
                    placeholder="Enter GCash reference number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Upload Payment Screenshot
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-black text-white"
                    required
                  />
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Order Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400"
                rows={3}
                placeholder="Any special instructions?"
              />
            </div>

            <div className="mb-6 p-4 bg-black/40 rounded-lg">
              <p className="text-sm font-semibold text-gray-200 mb-3">Order Summary</p>
              <div className="space-y-2 mb-4">
                {checkoutLineItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-100 break-words">
                        <span className="font-semibold text-gray-300">{item.quantity}×</span> {item.name}
                      </p>
                      <p className="text-[11px] text-gray-400">₱{item.price.toFixed(2)} each</p>
                    </div>
                    <p className="text-sm font-semibold text-yellow-200 whitespace-nowrap">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-200">Subtotal:</span>
                <span className="font-semibold text-yellow-300">₱{checkoutSubtotal.toFixed(2)}</span>
              </div>
              {checkoutDiscountPercent > 0 && (
                <div className="flex justify-between mb-2 text-green-400">
                  <span>Discount ({checkoutDiscountPercent.toFixed(0)}%):</span>
                  <span className="font-semibold">-₱{checkoutDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-yellow-300 pt-2 border-t border-yellow-500/30">
                <span>Total:</span>
                <span className="text-white">₱{checkoutFinalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  if (showBuyNowDeliveryForm) {
                    setBuyNowCheckoutStep('review');
                    return;
                  }
                  setShowCheckout(false);
                }}
                className="flex-1 bg-neutral-800 text-gray-200 py-3 rounded-lg font-semibold hover:bg-neutral-700 transition-all"
              >
                {showBuyNowDeliveryForm ? 'Back' : 'Back to Cart'}
              </button>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="flex-1 bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all disabled:opacity-50"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {modalEl}
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-yellow-300">Your Cart</h1>
            <p className="text-sm text-gray-400 mt-1">Review your items before checkout.</p>
          </div>

          {isBuyNowFlow && (
            <div className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-gray-200">
              <span className="font-semibold text-yellow-200">Buy Now</span> is separate: you have a quick checkout in
              progress.{' '}
              <button
                type="button"
                onClick={() => onNavigate('checkout')}
                className="text-yellow-300 font-semibold underline underline-offset-2 hover:text-yellow-200"
              >
                Continue Buy Now checkout
              </button>
              {' · '}
              <button
                type="button"
                onClick={() => {
                  clearBuyNow();
                }}
                className="text-gray-400 hover:text-gray-300 text-xs"
              >
                Cancel Buy Now
              </button>
            </div>
          )}

        <div className="bg-neutral-900/80 rounded-2xl shadow-xl p-4 sm:p-6 mb-6 border border-yellow-500/25">
          {cart.map((item) => (
            <div
              key={item.id}
              className="py-4 border-b border-yellow-500/15 last:border-b-0"
            >
              <div className="flex gap-4">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-xl shrink-0 border border-yellow-500/15"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-yellow-300 break-words leading-snug">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    ₱{item.price.toFixed(2)} each
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 bg-black/40 border border-yellow-500/25 rounded-full px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-neutral-900 hover:bg-neutral-800 transition-all"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4 text-gray-200" />
                      </button>
                      <span className="font-semibold w-8 text-center text-gray-100">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-neutral-900 hover:bg-neutral-800 transition-all"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4 text-gray-200" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-red-900/35 hover:bg-red-800/60 border border-red-500/20 transition-all"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">Item total</span>
                <span className="font-bold text-yellow-300">
                  ₱{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-neutral-900/80 rounded-2xl shadow-xl p-4 sm:p-6 border border-yellow-500/25">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-yellow-300">Order Summary</h2>
            <span className="text-xs text-gray-400">{cart.length} item(s)</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Subtotal</span>
              <span className="font-semibold text-gray-100">₱{cartTotal.toFixed(2)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Game Discount ({discountPercent.toFixed(0)}%)</span>
                <span className="font-semibold">-₱{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-3 mt-3 border-t border-yellow-500/20 flex justify-between text-lg font-bold">
              <span className="text-yellow-300">Total</span>
              <span className="text-white">₱{finalTotal.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full mt-5 bg-yellow-400 text-black py-3 rounded-xl font-semibold hover:bg-yellow-300 transition-all shadow-lg"
          >
            Proceed to Checkout
          </button>
        </div>
        </div>
      </div>
    </>
  );
}
