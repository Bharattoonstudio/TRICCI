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

const dashboardRoutes: Record<string, string> = {
  employer: '/employer/dashboard',
  consultant: '/consultant/dashboard',
  candidate: '/candidate/profile',
  admin: '/admin',
};

export default function LoginFreshPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const goToDashboard = (role: string | undefined) => {
    navigate(dashboardRoutes[(role as string) || ''] || '/', { replace: true });
  };

  const switchMode = (next: 'password' | 'otp') => {
    setMode(next);
    setError('');
    setInfo('');
    setOtp('');
    setOtpSent(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Valid email is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      // BetterAuth email sign-in endpoint
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
        credentials: 'include',
      });
      const { data, error: apiError } = await readResponse(response);
      if (apiError) throw new Error(apiError);

      if (data.token) localStorage.setItem('sessionToken', data.token);
      if (data.user?.id) localStorage.setItem('userId', data.user.id);
      if (data.user?.role) localStorage.setItem('userRole', data.user.role);

      goToDashboard(data.user?.role || localStorage.getItem('userRole') || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email.trim() || !email.includes('@')) {
      setError('Valid email is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/otp/login/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
        credentials: 'include',
      });
      const { error: apiError } = await readResponse(response);
      if (apiError) throw new Error(apiError);

      setOtpSent(true);
      setInfo('We sent a 6-digit code to your email. It expires in 10 minutes.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit code from your email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/otp/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), otp: otp.trim() }),
        credentials: 'include',
      });
      const { data, error: apiError } = await readResponse(response);
      if (apiError) throw new Error(apiError);

      if (data.user?.id) localStorage.setItem('userId', data.user.id);
      if (data.user?.role) localStorage.setItem('userRole', data.user.role);

      goToDashboard(data.role || data.user?.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      New to TRICCI?{' '}
      <a href="/signup" className={linkClass}>
        Create an account
      </a>
    </>
  );

  if (mode === 'otp') {
    return (
      <AuthShell title="Sign in with a code" subtitle="We'll email you a 6-digit code" footer={footer}>
        {!otpSent ? (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            {error && <ErrorBox message={error} />}

            <button type="submit" disabled={loading || !email.trim()} className={primaryButtonClass}>
              {loading ? 'Sending code...' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            {info && <p className="text-sm text-white/70">{info}</p>}

            <div>
              <label className={labelClass} htmlFor="otp">6-digit code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className={`${inputClass} tracking-[0.5em] text-center text-lg`}
              />
            </div>

            {error && <ErrorBox message={error} />}

            <button type="submit" disabled={loading || otp.length !== 6} className={primaryButtonClass}>
              {loading ? 'Verifying...' : 'Verify and sign in'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={handleSendCode} disabled={loading} className={linkClass}>
                Resend code
              </button>
              <button type="button" onClick={() => switchMode('password')} className={linkClass}>
                Use password instead
              </button>
            </div>
          </form>
        )}

        {!otpSent && (
          <div className="mt-5 text-center text-sm">
            <button type="button" onClick={() => switchMode('password')} className={linkClass}>
              Back to password sign in
            </button>
          </div>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your TRICCI account" footer={footer}>
      <form onSubmit={handlePasswordSubmit} className="space-y-5">
        <div>
          <label className={labelClass} htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-white/80" htmlFor="password">Password</label>
            <a href="/forgot-password" className="text-xs font-medium text-[#E8470A] hover:text-[#ff6a3d]">
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        {error && <ErrorBox message={error} />}

        <button type="submit" disabled={loading || !email.trim() || password.length < 8} className={primaryButtonClass}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-5 text-center text-sm">
        <button type="button" onClick={() => switchMode('otp')} className={linkClass}>
          Sign in with a code instead
        </button>
      </div>
    </AuthShell>
  );
}
