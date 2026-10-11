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

type Role = 'employer' | 'consultant' | 'candidate';
type Step = 'role' | 'details' | 'success';

const roleRoutes: Record<Role, string> = {
  employer: '/employer/dashboard',
  consultant: '/consultant/dashboard',
  candidate: '/candidate/profile',
};

const roleOptions: { role: Role; title: string; description: string }[] = [
  { role: 'employer', title: 'Hiring company', description: 'Post roles and find talent' },
  { role: 'consultant', title: 'Recruitment consultant', description: 'Access mandates and earn commissions' },
  { role: 'candidate', title: 'Job seeker', description: 'Upload your CV and find opportunities' },
];

export default function SignupFreshPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setStep('details');
  };

  const handleBackToRole = () => {
    setStep('role');
    setSelectedRole(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setError('');

    if (!name.trim()) return setError('Name is required');
    if (!email.trim() || !email.includes('@')) return setError('Valid email is required');
    if (!/^\d{10}$/.test(mobile.replace(/\s/g, '').replace(/^\+91/, ''))) {
      return setError('Enter a valid 10-digit mobile number');
    }
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    try {
      // BetterAuth email sign-up endpoint
      const response = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password,
          name: name.trim(),
          role: selectedRole,
        }),
        credentials: 'include',
      });
      const { data, error: apiError } = await readResponse(response);
      if (apiError) throw new Error(apiError);

      if (data.token) localStorage.setItem('sessionToken', data.token);
      if (data.user?.id) localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', selectedRole);

      // Save the mobile number on the new account's role profile (session cookie is set above).
      const mobileRes = await fetch('/api/account/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mobile }),
        credentials: 'include',
      });
      const mobileResult = await readResponse(mobileRes);
      if (mobileResult.error) {
        throw new Error(
          'Your account was created, but we could not save your mobile number. Please sign in and try again from your profile.',
        );
      }

      setStep('success');
      navigate(roleRoutes[selectedRole], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <AuthShell title="Account created" subtitle="Taking you to your dashboard...">
        <div className="text-center text-5xl">✓</div>
      </AuthShell>
    );
  }

  if (step === 'role') {
    return (
      <AuthShell
        title="Join TRICCI"
        subtitle="Get started in minutes"
        footer={
          <>
            Already have an account?{' '}
            <a href="/login" className={linkClass}>Sign in</a>
          </>
        }
      >
        <div className="space-y-3">
          {roleOptions.map((opt) => (
            <button
              key={opt.role}
              type="button"
              onClick={() => handleRoleSelect(opt.role)}
              className="w-full rounded-xl border border-white/10 bg-[#141414] p-4 text-left transition hover:border-[#E8470A] hover:bg-[#1a1a1a]"
            >
              <p className="font-semibold">{opt.title}</p>
              <p className="mt-0.5 text-sm text-white/60">{opt.description}</p>
            </button>
          ))}
        </div>
      </AuthShell>
    );
  }

  const roleLabel = roleOptions.find((o) => o.role === selectedRole)?.title ?? '';
  const formReady = !!name.trim() && !!email.trim() && !!mobile.trim() && password.length >= 8 && password === confirmPassword;

  return (
    <AuthShell
      title="Create your account"
      subtitle={`Signing up as ${roleLabel}`}
      footer={
        <>
          Already have an account?{' '}
          <a href="/login" className={linkClass}>Sign in</a>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <button type="button" onClick={handleBackToRole} className="text-sm font-medium text-[#E8470A] hover:text-[#ff6a3d]">
          ← Change account type
        </button>

        <div>
          <label className={labelClass} htmlFor="name">Full name</label>
          <input id="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="mobile">Mobile number</label>
          <input id="mobile" type="tel" inputMode="numeric" autoComplete="tel-national" required value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile number" maxLength={13} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="confirm">Confirm password</label>
          <input id="confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className={inputClass} />
          {confirmPassword && password === confirmPassword && (
            <p className="mt-2 text-xs text-[#22c55e]">✓ Passwords match</p>
          )}
        </div>

        {error && <ErrorBox message={error} />}

        <button type="submit" disabled={loading || !formReady} className={primaryButtonClass}>
          {loading ? 'Creating your account...' : 'Sign up'}
        </button>
      </form>
    </AuthShell>
  );
}
