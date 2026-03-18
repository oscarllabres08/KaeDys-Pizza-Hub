import { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import GamePage from './pages/GamePage';
import GalleryPage from './pages/GalleryPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import CartPage from './pages/CartPage';
import ProfilePage from './pages/ProfilePage';
import AuthForm from './components/AuthForm';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { BuyNowProvider } from './contexts/BuyNowContext';

type PageId =
  | 'home'
  | 'menu'
  | 'game'
  | 'gallery'
  | 'about'
  | 'contact'
  | 'cart'
  | 'checkout'
  | 'profile'
  | 'auth';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const { loading } = useAuth();

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as PageId | '';
    if (hash && ['home', 'menu', 'game', 'gallery', 'about', 'contact', 'cart', 'checkout', 'profile', 'auth'].includes(hash)) {
      setCurrentPage(hash as PageId);
    }

    const onHashChange = () => {
      const newHash = window.location.hash.replace('#', '') as PageId | '';
      if (newHash && ['home', 'menu', 'game', 'gallery', 'about', 'contact', 'cart', 'checkout', 'profile', 'auth'].includes(newHash)) {
        setCurrentPage(newHash as PageId);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigate = (page: PageId | string) => {
    const target = page as PageId;
    setCurrentPage(target);
    window.location.hash = `#${target}`;
  };

  let content: JSX.Element;
  switch (currentPage) {
    case 'home':
      content = <HomePage onNavigate={handleNavigate} />;
      break;
    case 'menu':
      content = <MenuPage onNavigate={handleNavigate} />;
      break;
    case 'game':
      content = <GamePage onNavigate={handleNavigate} />;
      break;
    case 'gallery':
      content = <GalleryPage />;
      break;
    case 'about':
      content = <AboutPage />;
      break;
    case 'contact':
      content = <ContactPage />;
      break;
    case 'cart':
      content = <CartPage onNavigate={handleNavigate} />;
      break;
    case 'checkout':
      content = <CartPage onNavigate={handleNavigate} startInCheckout />;
      break;
    case 'profile':
      content = <ProfilePage />;
      break;
    case 'auth':
      content = (
        <AuthForm
          onSuccess={() => {
            setCurrentPage('home');
          }}
        />
      );
      break;
    default:
      content = <HomePage onNavigate={handleNavigate} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black to-neutral-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-gradient-to-br from-black to-neutral-900">
      <Navigation currentPage={currentPage} onNavigate={handleNavigate} />
      <main className="flex-1">
        {content}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BuyNowProvider>
          <AppContent />
        </BuyNowProvider>
      </CartProvider>
    </AuthProvider>
  );
}
