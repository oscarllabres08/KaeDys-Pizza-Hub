import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type AuthFormProps = {
  onSuccess: () => void;
  requireAddress?: boolean;
  adminSignUp?: boolean;
};

export default function AuthForm({ onSuccess, requireAddress = true, adminSignUp = false }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          setError('Password and Confirm Password do not match.');
          return;
        }
        await signUp(formData.email, formData.password, {
          full_name: formData.full_name,
          phone: formData.phone,
          address: formData.address,
        }, adminSignUp);
      } else {
        await signIn(formData.email, formData.password);
      }
      onSuccess();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-neutral-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-neutral-900 rounded-2xl shadow-2xl p-8 transform transition-all border border-yellow-500/40">
        <div className="text-center mb-8">
          <img
            src="/kaedypizza.jpg"
            alt="KaeDy's Pizza Hub"
            className="h-20 w-20 mx-auto rounded-full border-4 border-yellow-400 shadow-lg object-cover"
          />
          <h2 className="mt-6 text-3xl font-bold text-white">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {isSignUp
              ? 'Sign up to start ordering delicious pizza'
              : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                  placeholder="Enter your phone number"
                />
              </div>

              {requireAddress && (
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Address
                  </label>
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                    placeholder="Enter your delivery address"
                    rows={3}
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
              placeholder="Enter your password"
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-black text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                placeholder="Re-enter your password"
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
          >
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
