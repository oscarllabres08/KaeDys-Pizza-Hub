import { useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type CartPageProps = {
  onNavigate: (page: string) => void;
};

export default function CartPage({ onNavigate }: CartPageProps) {
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
  const { user, profile } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'GCash'>('COD');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  const handleCheckout = async () => {
    if (!user || !profile) return;

    if (paymentMethod === 'GCash' && (!paymentReference || !paymentProof)) {
      alert('Please provide payment reference and upload proof of payment');
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

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user.id,
            total_amount: cartTotal,
            discount_amount: discountAmount,
            final_amount: finalTotal,
            payment_method: paymentMethod,
            payment_reference: paymentReference || null,
            payment_proof_url: paymentProofUrl,
            delivery_address: profile.address,
            contact_phone: profile.phone,
            notes: notes || null,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        menu_item_name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      clearCart();
      alert('Order placed successfully! We will notify you once confirmed.');
      onNavigate('home');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
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
    );
  }

  if (cart.length === 0) {
    return (
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
    );
  }

  if (showCheckout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-neutral-900 rounded-xl shadow-lg p-6 border border-yellow-500/30">
            <h2 className="text-2xl font-bold text-yellow-300 mb-6">Checkout</h2>

            <div className="mb-6">
              <h3 className="font-semibold text-yellow-300 mb-2">Delivery Information</h3>
              <div className="bg-black/40 p-4 rounded-lg">
                <p className="text-sm text-gray-200">
                  <strong>Name:</strong> {profile?.full_name}
                </p>
                <p className="text-sm text-gray-200">
                  <strong>Phone:</strong> {profile?.phone}
                </p>
                <p className="text-sm text-gray-200">
                  <strong>Address:</strong> {profile?.address}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentMethod('COD')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'COD'
                      ? 'border-yellow-400 bg-black/40'
                      : 'border-gray-700 hover:border-yellow-400'
                  }`}
                >
                  <p className="font-semibold">Cash on Delivery</p>
                </button>
                <button
                  onClick={() => setPaymentMethod('GCash')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'GCash'
                      ? 'border-yellow-400 bg-black/40'
                      : 'border-gray-700 hover:border-yellow-400'
                  }`}
                >
                  <p className="font-semibold">GCash</p>
                </button>
              </div>
            </div>

            {paymentMethod === 'GCash' && (
              <div className="mb-6 p-4 bg-black/40 rounded-lg border border-yellow-500/30">
                <div className="text-center mb-4">
                  <p className="font-semibold text-yellow-300 mb-2">
                    Scan QR Code to Pay
                  </p>
                  <div className="bg-black p-4 rounded-lg inline-block">
                    <img
                      src="https://images.pexels.com/photos/7289715/pexels-photo-7289715.jpeg?auto=compress&cs=tinysrgb&w=400"
                      alt="GCash QR Code"
                    className="w-48 h-48 object-contain rounded-lg"
                    />
                  </div>
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
              <div className="flex justify-between mb-2">
                <span className="text-gray-200">Subtotal:</span>
                <span className="font-semibold text-yellow-300">₱{cartTotal.toFixed(2)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between mb-2 text-green-400">
                  <span>Discount ({discountPercent.toFixed(0)}%):</span>
                  <span className="font-semibold">-₱{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-yellow-300 pt-2 border-t border-yellow-500/30">
                <span>Total:</span>
                <span className="text-white">₱{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 bg-neutral-800 text-gray-200 py-3 rounded-lg font-semibold hover:bg-neutral-700 transition-all"
              >
                Back to Cart
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-yellow-300 mb-8">Your Cart</h1>

        <div className="bg-neutral-900 rounded-xl shadow-lg p-6 mb-6 border border-yellow-500/30">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 py-4 border-b last:border-b-0"
            >
              <img
                src={item.image_url}
                alt={item.name}
                className="w-20 h-20 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-300">{item.name}</h3>
                <p className="text-sm text-gray-300">₱{item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-semibold w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 rounded-lg bg-red-900/40 hover:bg-red-800/60 transition-all ml-2"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
              <div className="font-semibold text-yellow-300 w-24 text-right">
                ₱{(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-neutral-900 rounded-xl shadow-lg p-6 border border-yellow-500/30">
          <div className="flex justify-between mb-2">
            <span className="text-gray-200">Subtotal:</span>
            <span className="font-semibold text-yellow-300">₱{cartTotal.toFixed(2)}</span>
          </div>
          {discountPercent > 0 && (
            <div className="flex justify-between mb-2 text-green-400">
              <span>Game Discount ({discountPercent.toFixed(0)}%):</span>
              <span className="font-semibold">-₱{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-yellow-300 pt-4 border-t border-yellow-500/30">
            <span>Total:</span>
            <span className="text-white">₱{finalTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full mt-6 bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
