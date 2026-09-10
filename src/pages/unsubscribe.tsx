import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { BellOff, XCircle, Loader2 } from 'lucide-react';

type Status = 'loading' | 'success' | 'already' | 'error' | 'no-token';

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'no-token');

  useEffect(() => {
    if (!token) return;

    fetch(`/api/alerts/unsubscribe?token=${encodeURIComponent(token)}`, {
      method: 'DELETE',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus(data.alreadyUnsubscribed ? 'already' : 'success');
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <>
      <Helmet>
        <title>Unsubscribe from Job Alerts — TRICCI</title>
        <meta name="description" content="Unsubscribe from TRICCI job alert emails. You can re-subscribe at any time from your candidate profile." />
        <link rel="canonical" href="https://tricci.in/unsubscribe" />
        <meta property="og:title" content="Unsubscribe from Job Alerts — TRICCI" />
        <meta property="og:description" content="Manage your TRICCI job alert email preferences." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tricci.in/unsubscribe" />
        <meta property="og:image" content="https://tricci.in/og-image.svg" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Unsubscribe from Job Alerts — TRICCI" />
        <meta name="twitter:image" content="https://tricci.in/og-image.svg" />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' as const }}
          className="w-full max-w-md text-center"
        >
          {/* Icon */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              background: status === 'success' ? 'rgba(255,107,53,0.12)' :
                status === 'already' ? 'rgba(53,201,255,0.12)' :
                status === 'error' ? 'rgba(239,68,68,0.12)' :
                'rgba(255,255,255,0.06)',
            }}
          >
            {status === 'loading' && <Loader2 size={36} className="text-muted-foreground animate-spin" />}
            {(status === 'success' || status === 'already') && <BellOff size={36} className="text-primary" />}
            {status === 'error' && <XCircle size={36} className="text-destructive" />}
            {status === 'no-token' && <BellOff size={36} className="text-muted-foreground" />}
          </div>

          {/* TRICCI wordmark */}
          <p className="text-sm font-black text-primary tracking-[3px] mb-6">TRICCI</p>

          {status === 'loading' && (
            <>
              <h1 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Unsubscribing…
              </h1>
              <p className="text-muted-foreground text-sm">Just a moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <h1 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                You're unsubscribed
              </h1>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                You won't receive any more job alert emails from TRICCI.
                You can re-subscribe at any time from your candidate profile.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/jobs"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Browse open roles
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground font-semibold text-sm px-6 py-3 rounded-xl hover:border-primary/40 transition-colors"
                >
                  Back to TRICCI
                </Link>
              </div>
            </>
          )}

          {status === 'already' && (
            <>
              <h1 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Already unsubscribed
              </h1>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                This email address is already unsubscribed from TRICCI job alerts.
              </p>
              <Link
                to="/jobs"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
              >
                Browse open roles
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Something went wrong
              </h1>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                We couldn't process your unsubscribe request. The link may have expired.
                Please try again or contact us at{' '}
                <a href="mailto:hello@tricci.in" className="text-primary hover:underline">hello@tricci.in</a>.
              </p>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground font-semibold text-sm px-6 py-3 rounded-xl hover:border-primary/40 transition-colors"
              >
                Back to TRICCI
              </Link>
            </>
          )}

          {status === 'no-token' && (
            <>
              <h1 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Invalid unsubscribe link
              </h1>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                This link is missing a valid token. Please use the unsubscribe link from one of your TRICCI alert emails.
              </p>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground font-semibold text-sm px-6 py-3 rounded-xl hover:border-primary/40 transition-colors"
              >
                Back to TRICCI
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}
