import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';

type Status = 'verifying' | 'success' | 'error' | 'pending';

function getRoleDestination(role?: string): string {
  switch (role) {
    case 'employer': return '/employer/dashboard';
    case 'consultant': return '/consultant/dashboard';
    case 'admin': return '/admin';
    default: return '/candidate/profile';
  }
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email') ?? '';

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'pending');
  const [errorMsg, setErrorMsg] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Auto-verify when token is present
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function verify() {
      try {
        const result = await authClient.verifyEmail({ query: { token: token! } });
        if (cancelled) return;
        if (result.error) {
          setErrorMsg(result.error.message ?? 'Verification failed. The link may have expired.');
          setStatus('error');
          return;
        }
        setStatus('success');
        // Fire welcome email (non-blocking)
        fetch('/api/auth/welcome', { method: 'POST', credentials: 'include' }).catch(() => {});
        // Redirect to dashboard after 2.5s
        setTimeout(() => {
          const role = (result.data as { user?: { role?: string } } | null | undefined)?.user?.role;
          navigate(getRoleDestination(role), { replace: true });
        }, 2500);
      } catch {
        if (!cancelled) {
          setErrorMsg('Something went wrong. Please try again.');
          setStatus('error');
        }
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [token, navigate]);

  async function handleResend() {
    if (!email || resending || resent) return;
    setResending(true);
    try {
      await authClient.sendVerificationEmail({ email, callbackURL: '/verify-email' });
      setResent(true);
    } catch {
      // silent — user can try again
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Verify Email — TRICCI</title>
        <meta name="description" content="Verify your email address to complete your TRICCI account setup." />
        <link rel="canonical" href="https://tricci.in/verify-email" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse, #FF6B35 0%, transparent 70%)' }} />
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
              <span className="text-4xl font-black tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: '#FF6B35' }}>
                TRICCI
              </span>
            </Link>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/30 text-center">

            {/* ── Verifying ── */}
            {status === 'verifying' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Loader2 size={28} className="text-primary animate-spin" />
                </div>
                <h1 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  Verifying your email…
                </h1>
                <p className="text-sm text-muted-foreground">Just a moment while we confirm your address.</p>
              </motion.div>
            )}

            {/* ── Success ── */}
            {status === 'success' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <CheckCircle size={28} className="text-green-400" />
                </div>
                <h1 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  Email verified!
                </h1>
                <p className="text-sm text-muted-foreground">Your account is active. Redirecting you to your dashboard…</p>
                <div className="flex gap-1 mt-1">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-2 h-2 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Error ── */}
            {status === 'error' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <XCircle size={28} className="text-red-400" />
                </div>
                <h1 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  Verification failed
                </h1>
                <p className="text-sm text-muted-foreground">{errorMsg}</p>

                {email && (
                  <button onClick={handleResend} disabled={resending || resent}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60 mt-2">
                    {resending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {resent ? 'Email sent!' : 'Resend verification email'}
                  </button>
                )}

                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-1">
                  Back to sign in
                </Link>
              </motion.div>
            )}

            {/* ── Pending (no token — just signed up) ── */}
            {status === 'pending' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <Mail size={28} style={{ color: '#35c9ff' }} />
                </div>
                <h1 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  Check your inbox
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We've sent a verification link to{' '}
                  {email ? <strong className="text-foreground">{email}</strong> : 'your email address'}.
                  {' '}Click the link to activate your account.
                </p>

                <div className="w-full p-4 rounded-xl bg-muted/40 border border-border text-left space-y-2 mt-2">
                  <p className="text-xs font-semibold text-foreground">Didn't receive it?</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure you entered the right email</li>
                    <li>Allow a few minutes for delivery</li>
                  </ul>
                </div>

                {email && (
                  <button onClick={handleResend} disabled={resending || resent}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-60 mt-1">
                    {resending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {resent ? 'Sent! Check your inbox' : 'Resend verification email'}
                  </button>
                )}

                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Back to sign in
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
