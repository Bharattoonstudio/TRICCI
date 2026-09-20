import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { signIn } from '@/lib/auth/auth-client';
import { validateEmail } from '@/lib/validation';

export default function LoginFreshPage() {
  const navigate = useNavigate();
  const location = useLocation();

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
      await signIn.email(
        { email: email.toLowerCase(), password },
        {
          onSuccess: () => {
            const from = (location.state as any)?.from?.pathname || '/employer/dashboard';
            navigate(from, { replace: true });
          },
          onError: (error) => {
            setError(error.message || 'Invalid email or password');
            setLoading(false);
          },
        }
      );
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
      // Call forgot password endpoint
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.toLowerCase() }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to send reset email');
      }

      setForgotMessage('✅ Password reset to FirstName@1234. You can now login.');
      setForgotEmail('');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotMessage('');
      }, 3000);
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
                      placeholder="Enter your email"
                      className="w-full px-4 py-2 bg-[#2D1810] border border-[#FF6B35]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B35] transition-colors"
                      disabled={loading}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-300">Password</label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-[#FF6B35] hover:text-[#FF8A5B] transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full px-4 py-2 bg-[#2D1810] border border-[#FF6B35]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B35] transition-colors pr-10"
                        disabled={loading}
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

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-[#FF6B35] hover:bg-[#FF8A5B] disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 mt-6"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </motion.button>

                  {/* Sign Up Link */}
                  <div className="text-center text-sm mt-4">
                    <span className="text-gray-400">Don't have an account? </span>
                    <Link to="/signup" className="text-[#FF6B35] hover:text-[#FF8A5B] font-semibold">
                      Sign up
                    </Link>
                  </div>
                </form>
              </>
            ) : (
              <>
                {/* Forgot Password Form */}
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-gray-400 hover:text-gray-200 text-sm mb-4 transition-colors"
                >
                  ← Back to login
                </button>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <p className="text-gray-300 text-sm mb-4">
                      Enter your email address to reset your password to FirstName@1234.
                    </p>
                  </div>

                  {forgotMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-lg p-3 text-sm ${
                        forgotMessage.startsWith('✅')
                          ? 'bg-green-500/10 border border-green-500/30 text-green-200'
                          : 'bg-red-500/10 border border-red-500/30 text-red-200'
                      }`}
                    >
                      {forgotMessage}
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-4 py-2 bg-[#2D1810] border border-[#FF6B35]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B35] transition-colors"
                      disabled={forgotLoading}
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={forgotLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-[#FF6B35] hover:bg-[#FF8A5B] disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 mt-6"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </motion.button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
