/**
 * /admin/setup — First-run admin account creation page.
 * Only useful when zero admin accounts exist.
 * After first admin is created, this page redirects to /admin/login.
 */
import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, AlertCircle, Loader2, Shield, CheckCircle, Key } from 'lucide-react';

export default function AdminSetupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, setupKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create admin account.');
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate('/admin/login', { replace: true }), 3000);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Admin Setup — TRICCI</title>
        <meta name="description" content="First-run admin account setup for TRICCI. Restricted access." />
        <link rel="canonical" href="https://tricci.in/admin/setup" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full opacity-8"
            style={{ background: 'radial-gradient(ellipse, #6B4FBB 0%, transparent 70%)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/15 border border-secondary/30 mb-4">
              <Shield size={24} className="text-secondary" />
            </div>
            <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              Create Admin Account
            </h1>
            <p className="text-sm text-muted-foreground mt-1">First-run setup for TRICCI Super Admin</p>
          </div>

          {success ? (
            <div className="bg-card border border-green-500/30 rounded-2xl p-8 text-center">
              <CheckCircle size={40} className="text-green-400 mx-auto mb-4" />
              <h2 className="text-lg font-black text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                Admin account created!
              </h2>
              <p className="text-sm text-muted-foreground mb-4">Redirecting you to the admin login page…</p>
              <Link to="/admin/login" className="text-secondary font-semibold text-sm hover:underline">
                Go to Admin Login →
              </Link>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
              {/* Setup key info */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/10 border border-secondary/20 mb-6">
                <Key size={15} className="text-secondary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-secondary mb-1">Setup Key Required</p>
                  <p className="text-xs text-muted-foreground">
                    Add <code className="bg-muted px-1 py-0.5 rounded text-foreground">ADMIN_SETUP_KEY</code> in your
                    project secrets, then enter it below. This prevents unauthorised admin creation.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Rahul Bhatia"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admin Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="admin@tricci.in"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Min. 8 characters"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary transition-colors"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat password"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Setup Key</label>
                  <input
                    type="password"
                    value={setupKey}
                    onChange={e => setSetupKey(e.target.value)}
                    required
                    placeholder="Value of ADMIN_SETUP_KEY secret"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary transition-colors"
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
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Creating account…</>
                  ) : (
                    <><Shield size={16} /> Create Admin Account</>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-5">
                Already have an admin account?{' '}
                <Link to="/admin/login" className="text-secondary hover:underline font-semibold">Sign in</Link>
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
