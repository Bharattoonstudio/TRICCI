import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, AlertCircle, Loader2, Building2, Star, User, Shield, CheckCircle } from 'lucide-react';
import { signIn, authClient } from '@/lib/auth/auth-client';
import { trackLogin } from '@/lib/analytics';

const ROLE_CARDS = [
  {
    role: 'employer',
    label: 'Employer',
    description: 'Post jobs & hire',
    icon: Building2,
    color: '#E8470A',
    dashboard: '/employer/dashboard',
  },
  {
    role: 'consultant',
    label: 'Consultant',
    description: 'Submit & earn',
    icon: Star,
    color: '#6B4FBB',
    dashboard: '/consultant/dashboard',
  },
  {
    role: 'candidate',
    label: 'Candidate',
    description: 'Find your next role',
    icon: User,
    color: '#22c55e',
    dashboard: '/candidate/profile',
  },
] as const;

function getRoleDestination(role: string): string {
  if (role === 'admin') return '/admin';
  return ROLE_CARDS.find(r => r.role === role)?.dashboard ?? '/';
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'linkedin' | null>(null);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);
  const [loggedInDest, setLoggedInDest] = useState('/');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    authClient.getSession()
      .then((result) => {
        const r = result as { data?: { user?: { role?: string } } | null } | null;
        const role = r?.data?.user?.role;
        if (role) {
          setLoggedInDest(from ?? getRoleDestination(role));
          setAlreadyLoggedIn(true);
        }
        setSessionChecked(true);
      })
      .catch(() => setSessionChecked(true));
  }, [from]);

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (alreadyLoggedIn) {
    return <Navigate to={loggedInDest} replace />;
  }

  async function handleResendVerification() {
    setResending(true);
    try {
      await (authClient as unknown as { sendVerificationEmail: (opts: { email: string; callbackURL: string }) => Promise<unknown> })
        .sendVerificationEmail({ email, callbackURL: '/verify-email' });
      setResent(true);
    } catch {
      // silent — user can try again
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        const msg = result.error.message ?? '';
        // BetterAuth returns "Email not verified" when requireEmailVerification is true
        if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('verif')) {
          setNeedsVerification(true);
        } else {
          setError(msg || 'Invalid email or password.');
        }
        return;
      }
      const role = (result.data?.user as { role?: string })?.role ?? 'candidate';
      trackLogin('email');
      const dest = from ?? getRoleDestination(role);
      navigate(dest, { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider: 'google' | 'linkedin') {
    setError('');
    setSocialLoading(provider);
    try {
      trackLogin(provider);
      await signIn.social({ provider, callbackURL: from ?? '/' });
    } catch {
      setError(`Could not sign in with ${provider === 'google' ? 'Google' : 'LinkedIn'}. Please try again.`);
      setSocialLoading(null);
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign In — TRICCI</title>
        <meta name="description" content="Sign in to your TRICCI account. Employers post jobs, consultants submit candidates, and job seekers track applications — all in one place." />
        <link rel="canonical" href="https://tricci.in/login" />
        <meta property="og:title" content="Sign In — TRICCI" />
        <meta property="og:description" content="Sign in to your TRICCI account. India's recruitment aggregator for employers, consultants, and candidates." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tricci.in/login" />
        <meta property="og:image" content="https://tricci.in/api/og?title=Sign+In+to+TRICCI&subtitle=India%27s+Recruitment+Aggregator&tag=login&type=platform" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="TRICCI" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Sign In — TRICCI" />
        <meta name="twitter:description" content="Sign in to your TRICCI account. India's recruitment aggregator." />
        <meta name="twitter:image" content="https://tricci.in/api/og?title=Sign+In+to+TRICCI&subtitle=India%27s+Recruitment+Aggregator&tag=login&type=platform" />
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse, #E8470A 0%, transparent 70%)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <span className="text-4xl font-black tracking-tight text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                TRICCI
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mt-2">India's recruitment aggregator</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
            <h1 className="text-2xl font-black text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground mb-5">Sign in — one account works for all roles</p>

            {/* Role cards — tap to sign up as that role */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {ROLE_CARDS.map(({ role, label, description, icon: Icon, color }) => (
                <Link
                  key={role}
                  to={`/signup?role=${role}`}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-opacity-60 transition-all text-center"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: color + '15', border: `1.5px solid ${color}30` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span className="text-xs font-bold text-foreground">{label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{description}</span>
                </Link>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground text-center -mt-3 mb-5">
              New here? Click your role above to sign up, or sign in below.
            </p>

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm mb-5">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </motion.div>
            )}

            {needsVerification && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 mb-5">
                <p className="text-sm font-semibold text-secondary mb-1">Email not verified</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Please check your inbox and click the verification link before signing in.
                  {email && ' Didn\'t get it? Resend below.'}
                </p>
                {resent ? (
                  <p className="text-xs text-green-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle size={13} /> Verification email sent — check your inbox.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending || !email}
                    className="text-xs font-semibold text-secondary hover:underline disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {resending ? <><Loader2 size={12} className="animate-spin" /> Sending…</> : 'Resend verification email →'}
                  </button>
                )}
              </motion.div>
            )}

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button type="button" onClick={() => handleSocialLogin('google')}
                disabled={!!socialLoading || loading}
                className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700 disabled:opacity-60">
                {socialLoading === 'google' ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <GoogleIcon />}
                Google
              </button>
              <button type="button" onClick={() => handleSocialLogin('linkedin')}
                disabled={!!socialLoading || loading}
                className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700 disabled:opacity-60">
                {socialLoading === 'linkedin' ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <LinkedInIcon />}
                LinkedIn
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">or continue with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-foreground">Password</label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading || !!socialLoading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Don&rsquo;t have an account?{' '}
                <Link to="/signup" className="text-primary font-semibold hover:underline">Create one</Link>
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                <Link to="/admin/login" className="inline-flex items-center gap-1 text-muted-foreground hover:text-secondary transition-colors">
                  <Shield size={11} /> Admin login
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
