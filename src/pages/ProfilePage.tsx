import { useEffect, useState } from 'react';
import { User, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Order, OrderItem } from '../lib/supabase';

type OrderWithItems = Order & {
  order_items: OrderItem[];
};

export default function ProfilePage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    if (!profile) return;

    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(ordersData as OrderWithItems[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
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
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-16 px-4 flex items-center justify-center">
        <p className="text-xl text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 animate-fadeIn">
          <h1 className="text-4xl font-bold text-yellow-300 mb-2">My Profile</h1>
        </div>

        <div className="bg-neutral-900 rounded-xl shadow-lg p-6 mb-8 border border-yellow-500/30">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-yellow-500/10 w-16 h-16 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-yellow-300">{profile.full_name}</h2>
              {profile.is_admin && (
                <span className="inline-block bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-semibold">
                  Admin
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <p className="text-gray-900">{profile.phone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <p className="text-gray-900">{profile.address}</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-xl shadow-lg p-6 border border-yellow-500/30">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-6 h-6 text-yellow-400" />
            <h2 className="text-2xl font-bold text-yellow-300">My Orders</h2>
          </div>

          {loading ? (
            <p className="text-center text-gray-300">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-center text-gray-300">No orders yet</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border border-yellow-500/20 rounded-lg p-4 hover:shadow-md transition-all bg-black/40"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-gray-300">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()} at{' '}
                        {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusText(order.status)}
                    </span>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
