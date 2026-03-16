import { useEffect, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { MenuItem } from '../lib/supabase';

type MenuPageProps = {
  onNavigate: (page: string) => void;
};

export const MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    name: 'Classic Pepperoni Pizza',
    description: '12-inch hand-tossed pizza with mozzarella and loaded pepperoni.',
    price: 349,
    image_url: '/menu/pizza-pepperoni.jpg',
    category: 'Pizza',
    available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'All-Day Silog Plate',
    description: 'Tapsilog / Tosilog style breakfast plate with egg and garlic rice.',
    price: 95,
    image_url: '/menu/topsilogMeal.jpg',
    category: 'Silog Meals',
    available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Sisig Rice Topps',
    description: 'Savory sisig served over rice in a handy cup – perfect budget meal.',
    price: 39,
    image_url: '/menu/budgetmealsisig.jpg',
    category: 'Budget Meals',
    available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Nasi Goreng Bowl',
    description: 'Indonesian-style fried rice in Merah or Kuning with your choice of toppings.',
    price: 85,
    image_url: '/menu/nasi-goreng.jpg',
    category: 'Budget Meals',
    available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Budget Chicken Meal',
    description: 'Crispy chicken with rice – sulit ulam for everyday cravings.',
    price: 79,
    image_url: '/menu/budget-chicken.jpg',
    category: 'Budget Meals',
    available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '6',
    name: 'Brown Sugar Milktea',
    description: 'Creamy brown sugar milk tea with pearls, served ice-cold.',
    price: 69,
    image_url: '/menu/milktea.jpg',
    category: 'Drinks',
    available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '7',
    name: 'Matcha Strawberry Drink',
    description: 'Refreshing matcha-based drink with strawberry swirls and cream.',
    price: 79,
    image_url: '/menu/matcha-strawberry.jpg',
    category: 'Drinks',
    available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '8',
    name: 'Mais Con Yelo Overload',
    description: 'Corn, milk, ice, and toppings stacked in a tall cup for sharing.',
    price: 89,
    image_url: '/menu/maisconyelo.jpg',
    category: 'Drinks',
    available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '9',
    name: 'Spamsilog',
    description: 'Spam, Egg and Fried Rice',
    price: 89,
    image_url: '/menu/spamsilogMeal.jpg',
    category: 'Budget Meals',
    available: true,
    created_at: new Date().toISOString(),
  },
];

export default function MenuPage({ onNavigate }: MenuPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<MenuItem | null>(null);
  const [search, setSearch] = useState('');
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('menuAvailability');
      if (stored) {
        setAvailability(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading menu availability from localStorage', error);
    }
  }, []);

  const isItemAvailable = (item: MenuItem) => {
    const value = availability[item.id];
    if (typeof value === 'boolean') return value;
    return true;
  };

  const categories = ['All', 'Pizza', 'Budget Meals', 'Silog Meals', 'Drinks'];

  const filteredItems = MENU_ITEMS.filter((item) => {
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

    addToCart(item);
    setAddedItems((prev) => new Set(prev).add(item.id));
    setTimeout(() => {
      setAddedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 animate-fadeIn text-yellow-300">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Our Menu
          </h1>
          <p className="text-xl text-gray-300 mb-4">
            Enjoy our pizzas, budget meals, fried chicken, milk tea, and more
          </p>
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

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-neutral-900 rounded-lg shadow-md overflow-hidden border border-yellow-500/20 flex flex-col aspect-[3/4]"
            >
              <button
                type="button"
                className="relative h-24 overflow-hidden w-full"
                onClick={() => setPreviewItem(item)}
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform hover:scale-110"
                />
                <div className="absolute top-2 right-2 bg-yellow-400 text-black px-3 py-1 rounded-full font-bold">
                  ₱{item.price}
                </div>
              </button>
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="text-sm font-bold text-yellow-300 mb-1 line-clamp-2">
                  {item.name}
                </h3>
                <p className="text-gray-300 text-xs mb-3 line-clamp-2">
                  {item.description}
                </p>
                {isItemAvailable(item) ? (
                  <button
                    onClick={() => handleAddToCart(item)}
                    className={`mt-auto w-full py-2 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      addedItems.has(item.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-yellow-400 text-black hover:bg-yellow-300'
                    }`}
                  >
                    {addedItems.has(item.id) ? (
                      <>
                        <Check className="w-5 h-5" />
                        Added to Cart
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Add to Cart
                      </>
                    )}
                  </button>
                ) : (
                  <div className="mt-auto w-full py-2 rounded-md text-xs font-semibold text-center bg-gray-300 text-gray-700">
                    Currently Unavailable
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <div className="bg-neutral-900 rounded-2xl max-w-md w-full overflow-hidden border border-yellow-500/40">
              <div className="relative h-56">
                <img
                  src={previewItem.image_url}
                  alt={previewItem.name}
                  className="w-full h-full object-cover"
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
