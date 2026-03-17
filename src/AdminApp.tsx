import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminPage from './pages/AdminPage';
import AuthForm from './components/AuthForm';
import { LogOut, Home } from 'lucide-react';
import { useEffect, useState } from 'react';

function AdminContent() {
  const { user, adminProfile, loading, profilesLoaded, refreshProfiles, signOut } = useAuth();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      if (!user) return;
      // If user just signed in/up, adminProfile can be null for a short time.
      // Wait a moment and retry fetching before showing the "Administrators only" screen.
      if (adminProfile) return;

      setSyncing(true);
      try {
        for (let i = 0; i < 6; i++) {
          if (cancelled) return;
          await refreshProfiles();
          if (cancelled) return;
          if (adminProfile) break;
          // small delay before retry
          await new Promise((r) => setTimeout(r, 350));
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };

    sync();
    return () => {
      cancelled = true;
    };
    // We intentionally do NOT depend on adminProfile to avoid restarting the loop mid-sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading || (user && (!profilesLoaded || syncing))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black to-neutral-900 px-4">
        <div className="w-full max-w-md bg-neutral-900/70 backdrop-blur rounded-2xl shadow-2xl p-8 border border-yellow-500/25 text-center">
          <div className="mx-auto h-20 w-20 rounded-full border-4 border-yellow-400 overflow-hidden bg-black shadow-lg">
            <img src="/kaedypizza.jpg" alt="KaeDy's Pizza Hub Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-yellow-300">Loading admin dashboard</h1>
          <p className="mt-2 text-sm text-gray-300">Please wait while we verify your account…</p>
          <div className="mt-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500/25 border-t-yellow-400" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthForm
        onSuccess={() => {}}
        requireAddress={false}
        adminSignUp
      />
    );
  }

  const isAdminProfile = !!adminProfile;
  const isApprovedAdmin = !!adminProfile?.is_active;

  // Logged in but not an approved admin
  if (!isApprovedAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-neutral-900 rounded-2xl shadow-2xl p-8 border border-yellow-500/30 text-center">
          <h1 className="text-2xl font-bold text-yellow-300 mb-4">
            {isAdminProfile ? 'Account pending approval' : 'Administrators only'}
          </h1>
          <p className="text-gray-300 mb-6">
            {isAdminProfile
              ? 'Your admin account is not yet approved by the Master Admin. Please wait for approval, then log in again.'
              : "This page is for KaeDy's Pizza Hub administrators. Your account is a customer account."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-300 transition-all"
            >
              <Home className="w-4 h-4" />
              Go to main site
            </a>
            <button
              onClick={async () => {
                await signOut();
                window.location.reload();
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-neutral-700 text-gray-200 font-semibold hover:bg-neutral-600 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
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

