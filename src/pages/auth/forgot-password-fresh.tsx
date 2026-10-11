import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AuthShell,
  ErrorBox,
  inputClass,
  labelClass,
  linkClass,
  primaryButtonClass,
  readResponse,
} from '../../components/auth/authShared';

type Step = 'email' | 'sent' | 'reset' | 'success';

export default function ForgotPasswordFreshPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !email.includes('@')) return setError('Valid email is required');

    setLoading(true);
    try {
      // BetterAuth 1.6 password reset endpoint
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          redirectTo: `${window.location.origin}/reset-password`,
        }),
        credentials: 'include',
      });
      const { error: apiError } = await readResponse(response);
      if (apiError) throw new Error(apiError);

      setStep('sent');
      setTimeout(() => setStep('reset'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    try {
      // BetterAuth 1.6 reset endpoint (body field is newPassword)
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
        credentials: 'include',
      });
      const { error: apiError } = await readResponse(response);
      if (apiError) throw new Error(apiError);

      setStep('success');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = (
    <>
      Remember your password?{' '}
      <a href="/login" className={linkClass}>Sign in</a>
    </>
  );

  if (step === 'success') {
    return (
      <AuthShell title="Password updated" subtitle="Redirecting you to sign in...">
        <div className="text-center text-5xl">✓</div>
      </AuthShell>
    );
  }

  if (step === 'sent') {
    return (
      <AuthShell title="Check your email" subtitle={`We've sent a reset link to ${email}`} footer={backToLogin}>
        <p className="text-center text-sm text-white/50">The reset link expires in 1 hour. Check your spam folder if it doesn't arrive.</p>
      </AuthShell>
    );
  }

  if (step === 'reset') {
    return (
      <AuthShell title="Create a new password" subtitle="Paste the token from your reset email" footer={backToLogin}>
        <form onSubmit={handleResetSubmit} className="space-y-5">
          <div>
            <label className={labelClass} htmlFor="token">Reset token</label>
            <input id="token" type="text" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the token from the email link" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="new-password">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your new password" className={inputClass} />
            {confirmPassword && password === confirmPassword && (
              <p className="mt-2 text-xs text-[#22c55e]">✓ Passwords match</p>
            )}
          </div>
          {error && <ErrorBox message={error} />}
          <button type="submit" disabled={loading || !token.trim() || password.length < 8 || password !== confirmPassword} className={primaryButtonClass}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to set a new password" footer={backToLogin}>
      <form onSubmit={handleEmailSubmit} className="space-y-5">
        <div>
          <label className={labelClass} htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
        </div>
        {error && <ErrorBox message={error} />}
        <button type="submit" disabled={loading || !email.trim()} className={primaryButtonClass}>
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  );
}
