import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminPage from './pages/AdminPage';
import AuthForm from './components/AuthForm';

function AdminContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black to-neutral-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <AuthForm
        onSuccess={() => {
          // After successful login, always show admin dashboard
        }}
        requireAddress={false}
        adminSignUp
      />
    );
  }

  return <AdminPage />;
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <AdminContent />
    </AuthProvider>
  );
}

