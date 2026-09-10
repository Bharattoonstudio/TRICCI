import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authClient.forgetPassword({
        email,
        redirectURL: `${window.location.origin}/reset-password`,
      });
      setSent(true);
    } catch (err) {
      setError('Failed to send reset email. Please check the email address and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Forgot Password — TRICCI</title>
        <meta name="description" content="Reset your TRICCI password." />
        <link rel="canonical" href="https://tricci.in/forgot-password" />
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
            <h1 className="text-3xl font-black text-foreground">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-2">Enter your email and we'll send you a reset link</p>
          </div>

          {!sent ? (
            <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 pl-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
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
                    <><Loader2 size={16} className="animate-spin" /> Sending…</>
                  ) : (
                    <><Mail size={16} /> Send Reset Link</>
                  )}
                </button>

                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </form>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-8 shadow-xl text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                <Mail size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
              <p className="text-sm text-muted-foreground mb-6">
                We've sent a password reset link to <span className="font-semibold text-foreground">{email}</span>
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Click the link in the email to reset your password. The link expires in 1 hour.
              </p>
              <Link
                to="/login"
                className="w-full inline-block py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Back to Login
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  );
}
