// ═══════════════════════════════════════════════════════════════════
// NEW FILE: src/pages/accept-invite.tsx
// Public page — teammate lands here from the invite email link
// (URL: /accept-invite?token=xxxxx)
// ═══════════════════════════════════════════════════════════════════
import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2, UserPlus } from 'lucide-react';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ organizationName: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('This invite link is invalid or missing a token.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/organization/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess({ organizationName: data.organizationName });
      } else {
        setError(data.error || 'Failed to accept invite');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center">
          <CheckCircle2 size={40} className="text-green-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">You're all set!</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Your account has been created for <b className="text-foreground">{success.organizationName}</b>.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Helmet><title>Accept Invite | TRICCI</title></Helmet>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
            <UserPlus size={22} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold">Join Your Team on TRICCI</h1>
          <p className="text-muted-foreground text-sm mt-1">Set up your account to get started.</p>
        </div>

        {!token && (
          <p className="text-sm text-red-400 text-center mb-4">
            This link looks invalid. Please check the invite email again or ask your admin to resend it.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Your Name</label>
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Password</label>
            <input
              type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Confirm Password</label>
            <input
              type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit" disabled={loading || !token}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
