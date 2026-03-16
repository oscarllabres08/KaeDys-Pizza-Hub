import { useState } from 'react';
import { Menu, X, ShoppingCart, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

type NavigationProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export default function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { cartCount } = useCart();

  const publicPages = [
    { name: 'Home', id: 'home' },
    { name: 'Menu', id: 'menu' },
    { name: 'Game', id: 'game' },
    { name: 'Gallery', id: 'gallery' },
    { name: 'About', id: 'about' },
    { name: 'Contact', id: 'contact' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      onNavigate('home');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigation = (page: string) => {
    onNavigate(page);
    setIsOpen(false);
  };

  return (
    <nav className="bg-black text-yellow-400 shadow-lg fixed w-full top-0 z-50 border-b border-yellow-500/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div
            className="flex items-center cursor-pointer transition-transform hover:scale-105"
            onClick={() => handleNavigation('home')}
          >
            <img
              src="/kaedypizza.jpg"
              alt="KaeDy's Pizza Hub"
              className="h-12 w-12 rounded-full border-2 border-yellow-400 shadow-md object-cover"
            />
            <span className="ml-3 text-xl font-bold text-yellow-300">KaeDy's Pizza Hub</span>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {publicPages.map(page => (
              <button
                key={page.id}
                onClick={() => handleNavigation(page.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  currentPage === page.id
                    ? 'bg-yellow-400 text-black shadow-md'
                    : 'hover:bg-yellow-500 hover:text-black'
                }`}
              >
                {page.name}
              </button>
            ))}

            {user && (
              <>
                <button
                  onClick={() => handleNavigation('cart')}
                  className="relative px-3 py-2 rounded-md hover:bg-yellow-500 hover:text-black transition-all"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {cartCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleNavigation('profile')}
                  className="px-3 py-2 rounded-md hover:bg-yellow-500 hover:text-black transition-all"
                >
                  <User className="w-5 h-5" />
                </button>

                <button
                  onClick={handleSignOut}
                  className="px-3 py-2 rounded-md hover:bg-yellow-500 hover:text-black transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}

            {!user && (
              <button
                onClick={() => handleNavigation('auth')}
                className="bg-yellow-400 text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-300 transition-all shadow-md"
              >
                Sign In
              </button>
            )}
          </div>

          <div className="md:hidden flex items-center space-x-3">
            {user && (
              <button
                onClick={() => handleNavigation('cart')}
                className="relative"
              >
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md hover:bg-yellow-500 hover:text-black transition-all"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-black shadow-lg animate-slideDown border-t border-yellow-500/40">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {publicPages.map(page => (
              <button
                key={page.id}
                onClick={() => handleNavigation(page.id)}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-all ${
                  currentPage === page.id
                    ? 'bg-yellow-400 text-black'
                    : 'hover:bg-yellow-500 hover:text-black'
                }`}
              >
                {page.name}
              </button>
            ))}

            {user && (
              <>
                <button
                  onClick={() => handleNavigation('profile')}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-yellow-500 hover:text-black transition-all"
                >
                  My Profile
                </button>

                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-yellow-500 hover:text-black transition-all"
                >
                  Sign Out
                </button>
              </>
            )}

            {!user && (
              <button
                onClick={() => handleNavigation('auth')}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-yellow-400 text-black"
              >
                Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
