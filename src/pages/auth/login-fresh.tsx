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

export default function LoginFreshPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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

      const role = data.user?.role || localStorage.getItem('userRole');
      const dashboardRoutes: Record<string, string> = {
        employer: '/employer/dashboard',
        consultant: '/consultant/dashboard',
        candidate: '/candidate/profile',
        admin: '/admin',
      };
      navigate(dashboardRoutes[role as string] || '/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      // Accounts created before the security upgrade must set a new password once.
      // Say so clearly, and reassure the user that their profile is kept.
      setError(
        /invalid|incorrect|password/i.test(message)
          ? `${message} If you signed up before our security upgrade, use "Forgot password" below to set a new password. Your profile and details are saved.`
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your TRICCI account"
      footer={
        <>
          New to TRICCI?{' '}
          <a href="/signup" className={linkClass}>
            Create an account
          </a>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
    </AuthShell>
  );
}
