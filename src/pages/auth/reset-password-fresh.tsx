import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
import {
  AuthShell,
  ErrorBox,
  inputClass,
  labelClass,
  linkClass,
  primaryButtonClass,
  readResponse,
} from '../../components/auth/authShared';

export default function ResetPasswordFresh() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get('error');
    const tokenFromUrl = searchParams.get('token');
    if (urlError || !tokenFromUrl) {
      setError('This reset link is invalid or has expired. Please request a new one.');
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) return setError('This reset link is invalid or has expired. Please request a new one.');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    try {
      // BetterAuth 1.6 reset endpoint (body field is newPassword)
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const { error: apiError } = await readResponse(response);
      if (apiError) throw new Error(apiError);

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset Password - TRICCI</title>
        <meta name="description" content="Reset your TRICCI account password" />
      </Helmet>

      {success ? (
        <AuthShell title="Password updated" subtitle="You'll be taken to sign in shortly.">
          <div className="space-y-4 text-center">
            <div className="text-5xl">✓</div>
            <a href="/login" className={linkClass}>Go to sign in →</a>
          </div>
        </AuthShell>
      ) : (
        <AuthShell
          title="Choose a new password"
          subtitle="Enter a new password for your TRICCI account"
          footer={<a href="/login" className={linkClass}>Back to sign in</a>}
        >
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="password">New password</label>
              <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" disabled={!token} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="confirm">Confirm new password</label>
              <input id="confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your new password" disabled={!token} className={inputClass} />
              {confirmPassword && password === confirmPassword && (
                <p className="mt-2 text-xs text-[#22c55e]">✓ Passwords match</p>
              )}
            </div>
            {error && <ErrorBox message={error} />}
            <button type="submit" disabled={loading || !token || password.length < 8 || password !== confirmPassword} className={primaryButtonClass}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </AuthShell>
      )}
    </>
  );
}
