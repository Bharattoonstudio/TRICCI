import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (!token) throw new Error('No reset token found');

      const result = await authClient.resetPassword({
        token,
        newPassword: password,
      });

      if (result.error) {
        setError(result.error.message || 'Failed to reset password. Link may have expired.');
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Reset Password — TRICCI</title>
        <meta name="description" content="Reset your TRICCI password." />
        <link rel="canonical" href="https://tricci.in/reset-password" />
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center border border-primary/30">
                <Lock size={24} className="text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-foreground">Create New Password</h1>
            <p className="text-sm text-muted-foreground mt-2">Enter a new password for your TRICCI account</p>
          </div>

          {!success && !error.includes('Invalid') ? (
            <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="••••••••"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20"
                  >
                    <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Resetting…</>
                  ) : (
                    <><Lock size={16} /> Reset Password</>
                  )}
                </button>
              </form>
            </div>
          ) : success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-8 shadow-xl text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                <Lock size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Password Reset!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your password has been successfully reset. Redirecting to login...
              </p>
            </motion.div>
          ) : (
            <div className="bg-card border border-red-500/20 rounded-2xl p-8 shadow-xl text-center">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Invalid Reset Link</h2>
              <p className="text-sm text-muted-foreground mb-6">{error}</p>
              <Link
                to="/forgot-password"
                className="inline-block py-3 px-6 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Request New Link
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
