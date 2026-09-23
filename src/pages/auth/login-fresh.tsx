import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { validateEmail } from '@/lib/validation';

export default function LoginFreshPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Valid email is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    try {
      // FIXED: Call BetterAuth sign-in endpoint
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || 'Invalid email or password');
        setLoading(false);
        return;
      }

      // BetterAuth returns session in response
      if (data.user && data.session) {
        // Store session data
        localStorage.setItem('sessionToken', data.session.token || '');
        localStorage.setItem('userId', data.user.id);

        // Redirect based on role
        const dashboardRoutes: Record<string, string> = {
          employer: '/employer/dashboard',
          consultant: '/consultant/dashboard',
          candidate: '/candidate/profile',
        };

        const redirectPath = dashboardRoutes[data.user.role] || '/employer/dashboard';
        navigate(redirectPath, { replace: true });
      } else {
        setError('Sign in successful but user data missing');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotMessage('');

    if (!validateEmail(forgotEmail)) {
      setForgotMessage('Valid email is required');
      return;
    }

    setForgotLoading(true);
    try {
      // FIXED: Call BetterAuth forget-password endpoint
      const response = await fetch('/api/auth/forget-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.toLowerCase() }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to send password reset email');
      }

      const data = await response.json();

      setForgotMessage('✅ Password reset email sent! Check your email for a reset link.');
      setForgotEmail('');

      // Clear form after 2 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
      }, 2000);
    } catch (err) {
      setForgotMessage('❌ ' + (err instanceof Error ? err.message : 'An error occurred'));
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign In - TRICCI</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-[#1A0A00] to-[#2D1810] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#FF6B35] mb-2">Welcome Back</h1>
              <p className="text-gray-300">Sign in to your TRICCI account</p>
            </div>

            {!showForgotPassword ? (
              <>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2 items-start"
                  >
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-200 text-sm">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-[#FF6B35] hover:bg-[#ff5a1a] disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition"
                  >
                    {loading && <Loader2 size={18} className="animate-spin" />}
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>

                  {/* Forgot Password Link */}
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="w-full text-center text-[#FF6B35] hover:text-[#ff5a1a] text-sm font-medium"
                  >
                    Forgot Password?
                  </button>
                </form>

                {/* Sign Up Link */}
                <p className="text-center text-gray-400 text-sm">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-[#FF6B35] hover:text-[#ff5a1a] font-semibold">
                    Sign Up
                  </Link>
                </p>
              </>
            ) : (
              <>
                {forgotMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-lg p-3 ${
                      forgotMessage.startsWith('✅')
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <p className={forgotMessage.startsWith('✅') ? 'text-green-200' : 'text-red-200'} >
                      {forgotMessage}
                    </p>
                  </motion.div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-2 bg-[#FF6B35] hover:bg-[#ff5a1a] disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition"
                  >
                    {forgotLoading && <Loader2 size={18} className="animate-spin" />}
                    {forgotLoading ? 'Sending...' : 'Send Reset Email'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full text-center text-[#FF6B35] hover:text-[#ff5a1a] text-sm font-medium"
                  >
                    Back to Sign In
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
