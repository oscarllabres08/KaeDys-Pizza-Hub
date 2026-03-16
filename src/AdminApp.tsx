import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminPage from './pages/AdminPage';
import AuthForm from './components/AuthForm';

function AdminContent() {
  const { user, profile, loading } = useAuth();

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
          // After successful login, AdminPage will render if the account is an admin
        }}
        requireAddress={false}
        adminSignUp
      />
    );
  }

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-neutral-900 rounded-2xl shadow-2xl p-8 border border-yellow-500/30 text-center">
          <h1 className="text-2xl font-bold text-yellow-300 mb-4">Not Authorized</h1>
          <p className="text-gray-300 mb-4">
            This area is for KaeDy&apos;s Pizza Hub administrators only.
          </p>
          <p className="text-xs text-gray-500">
            If you think this is a mistake, please contact the owner.
          </p>
        </div>
      </div>
    );
  }

  if (profile.is_admin && !profile.admin_approved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-neutral-900 rounded-2xl shadow-2xl p-8 border border-yellow-500/30 text-center">
          <h1 className="text-2xl font-bold text-yellow-300 mb-4">Awaiting Approval</h1>
          <p className="text-gray-300 mb-4">
            Your admin account is pending approval from the Master Admin.
          </p>
          <p className="text-xs text-gray-500">
            You&apos;ll be able to access the dashboard once your account is approved.
          </p>
        </div>
      </div>
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

