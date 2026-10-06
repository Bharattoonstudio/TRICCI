import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginFreshPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Valid email is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      // ✅ CORRECTED: Use 'signin' instead of 'login' (BetterAuth camelCase format)
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password: password,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Sign in failed');
      }

      if (data.session?.token) {
        localStorage.setItem('sessionToken', data.session.token);
      }
      if (data.user?.id) {
        localStorage.setItem('userId', data.user.id);
      }
      if (data.user?.role) {
        localStorage.setItem('userRole', data.user.role);
      }

      // Redirect based on role
      const role = data.user?.role || localStorage.getItem('userRole');
      const dashboardRoutes: Record<string, string> = {
        employer: '/employer/dashboard',
        consultant: '/consultant/dashboard',
        candidate: '/candidate/profile',
      };
      const redirectTo = dashboardRoutes[role as string] || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to your TRICCI account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="text-right">
            <a href="/forgot-password-fresh" className="text-orange-500 hover:text-orange-400 text-sm">
              Forgot password?
            </a>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || password.length < 8}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <p className="text-center text-gray-400 text-sm">
            Don't have an account? <a href="/signup-fresh" className="text-orange-500 hover:text-orange-400">Sign Up</a>
          </p>
        </form>
      </div>
    </div>
  );
}
