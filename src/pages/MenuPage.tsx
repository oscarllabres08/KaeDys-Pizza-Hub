import { useEffect, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useBuyNow } from '../contexts/BuyNowContext';
import { MenuItem, supabase } from '../lib/supabase';

type MenuPageProps = {
  onNavigate: (page: string) => void;
};

export default function MenuPage({ onNavigate }: MenuPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<MenuItem | null>(null);
  const [search, setSearch] = useState('');
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { startBuyNow } = useBuyNow();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadMenu = async () => {
      setLoading(true);
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
        setMenuItems([]);
      } finally {
        setLoading(false);
      }
    };
    loadMenu();
  }, []);

  const isItemAvailable = (item: MenuItem) => {
    return item.is_available;
  };

  const categories = ['All', 'Pizza', 'Budget Meals', 'Silog Meals', 'Drinks'];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' ? true : item.category === selectedCategory;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q.length === 0 ||
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (item: MenuItem) => {
    if (!user) {
      onNavigate('auth');
      return;
    }

    const qty = quantities[item.id] && quantities[item.id] > 0 ? quantities[item.id] : 1;
    for (let i = 0; i < qty; i++) {
      addToCart(item);
    }
    setAddedItems((prev) => new Set(prev).add(item.id));
    // reset quantity back to 1 for this item
    setQuantities((prev) => ({ ...prev, [item.id]: 1 }));
    setTimeout(() => {
      setAddedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }, 2000);
  };

  const handleBuyNow = (item: MenuItem) => {
    if (!user) {
      onNavigate('auth');
      return;
    }

    const qty = quantities[item.id] && quantities[item.id] > 0 ? quantities[item.id] : 1;
    startBuyNow(item, qty);
    // reset quantity back to 1 for this item
    setQuantities((prev) => ({ ...prev, [item.id]: 1 }));
    // Show Buy Now item in the cart-style view first, then let user proceed to checkout
    onNavigate('cart');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 animate-fadeIn text-yellow-300">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Our Menu
          </h1>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for pizza, meals, or drinks..."
            className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-yellow-500/40 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-3 pb-2 min-w-max">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2 rounded-lg font-semibold text-sm flex-none ${
                  selectedCategory === category
                    ? 'bg-yellow-400 text-black shadow-md'
                    : 'bg-neutral-800 text-gray-200 hover:bg-neutral-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-300">Loading menu...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredItems.map((item) => {
              const available = isItemAvailable(item);
              const quantity = quantities[item.id] ?? 1;
              return (
                <div
                  key={item.id}
                  className="bg-neutral-900 rounded-lg shadow-md overflow-hidden border border-yellow-500/20 flex flex-col"
                >
                  <button
                    type="button"
                    className="w-full px-3 pt-3"
                    onClick={() => setPreviewItem(item)}
                  >
                    <div className="relative mx-auto aspect-square w-36 sm:w-40 md:w-44 overflow-hidden rounded-lg">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      />
                      <div className="absolute top-2 right-2 bg-yellow-400 text-black px-3 py-1 rounded-full font-bold">
                        ₱{item.price}
                      </div>
                      {!available && (
                        <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-gray-200 text-gray-800">
                            Not available today
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="text-sm font-bold text-yellow-300 mb-0.5 leading-snug line-clamp-2">
                      {item.name}
                    </h3>
                    <p className="text-gray-300 text-xs mb-2 leading-snug line-clamp-2">
                      {item.description}
                    </p>
                    {available ? (
                      <>
                        <div className="mb-2 flex items-center justify-between gap-0">
                          <span className="text-xs text-gray-300">Quantity</span>
                          <div className="flex items-center gap-1.5 bg-black/40 rounded-full px-1 py-0.1 border border-yellow-500/40">
                            <button
                              type="button"
                              onClick={() =>
                                setQuantities((prev) => ({
                                  ...prev,
                                  [item.id]: Math.max(1, (prev[item.id] ?? 1) - 1),
                                }))
                              }
                              className="w-5 h-5 flex items-center justify-center rounded-full bg-neutral-900 text-yellow-300 hover:bg-neutral-800 text-[10px]"
                            >
                              -
                            </button>
                            <span className="min-w-[1.4rem] text-center text-xs font-semibold text-white">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setQuantities((prev) => ({
                                  ...prev,
                                  [item.id]: Math.min(99, (prev[item.id] ?? 1) + 1),
                                }))
                              }
                              className="w-5 h-5 flex items-center justify-center rounded-full bg-neutral-900 text-yellow-300 hover:bg-neutral-800 text-[10px]"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(item)}
                            className={`flex-1 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all px-2 py-1.4  leading-tight text-center whitespace-normal line-clamp-2 ${
                              addedItems.has(item.id)
                                ? 'bg-green-500 text-white'
                                : 'bg-yellow-400 text-black hover:bg-yellow-300'
                            }`}
                          >
                            {addedItems.has(item.id) ? 'Added' : 'Add to Order'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBuyNow(item)}
                            className="flex-1 rounded-md text-[10px] sm:text-[11px] font-semibold border border-yellow-400 text-yellow-300 hover:bg-yellow-400/10 transition-all px-2 py-1.5 leading-tight text-center whitespace-normal line-clamp-2"
                          >
                            Buy Now
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="mt-auto w-full py-2 rounded-md text-xs font-semibold text-center bg-gray-300 text-gray-700">
                        Currently Unavailable
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <div className="bg-neutral-900 rounded-2xl max-w-md w-full overflow-hidden border border-yellow-500/40">
              <div className="relative w-full bg-black/60" style={{ paddingTop: '100%' }}>
                <img
                  src={previewItem.image_url}
                  alt={previewItem.name}
                  className="absolute inset-0 w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs"
                >
                  Close
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-yellow-300">
                    {previewItem.name}
                  </h3>
                  <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-semibold">
                    ₱{previewItem.price}
                  </span>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  {previewItem.description}
                </p>
                {isItemAvailable(previewItem) ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCart(previewItem);
                      setPreviewItem(null);
                    }}
                    className="w-full py-2 rounded-md text-sm font-semibold bg-yellow-400 text-black hover:bg-yellow-300 transition-all"
                  >
                    Add to Cart
                  </button>
                ) : (
                  <div className="w-full py-2 rounded-md text-xs font-semibold text-center bg-gray-300 text-gray-700">
                    This item is currently unavailable
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
