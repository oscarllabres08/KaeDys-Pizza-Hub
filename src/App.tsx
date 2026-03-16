import { useState } from 'react';
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

type PageId =
  | 'home'
  | 'menu'
  | 'game'
  | 'gallery'
  | 'about'
  | 'contact'
  | 'cart'
  | 'profile'
  | 'auth';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const { loading } = useAuth();

  const handleNavigate = (page: PageId | string) => {
    setCurrentPage(page as PageId);
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
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
