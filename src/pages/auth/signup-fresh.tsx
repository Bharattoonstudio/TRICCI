import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Role = 'employer' | 'consultant' | 'candidate';
type Step = 'role' | 'details' | 'success';

const roleRoutes: Record<Role, string> = {
  employer: '/employer/dashboard',
  consultant: '/consultant/dashboard',
  candidate: '/candidate/profile',
};

export default function SignupFreshPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Valid email is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // ✅ CORRECTED: Use 'signup' instead of 'sign-up' (BetterAuth camelCase format)
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password: password,
          name: name.trim(),
          role: selectedRole,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Signup failed');
      }

      if (data.session?.token) {
        localStorage.setItem('sessionToken', data.session.token);
      }
      if (data.user?.id) {
        localStorage.setItem('userId', data.user.id);
      }
      localStorage.setItem('userRole', selectedRole);

      setStep('success');
      setTimeout(() => {
        navigate(roleRoutes[selectedRole], { replace: true });
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'role') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Join TRICCI</h1>
            <p className="text-gray-400">Get started in minutes</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handleRoleSelect('employer')}
              className="w-full p-4 border border-slate-600 rounded-lg hover:border-blue-400 hover:bg-slate-800/50 transition text-left"
            >
              <p className="font-semibold text-white">I'm a Hiring Company</p>
              <p className="text-sm text-gray-400">Post roles and find talent</p>
            </button>

            <button
              onClick={() => handleRoleSelect('consultant')}
              className="w-full p-4 border border-slate-600 rounded-lg hover:border-blue-400 hover:bg-slate-800/50 transition text-left"
            >
              <p className="font-semibold text-white">I'm a Recruitment Consultant</p>
              <p className="text-sm text-gray-400">Access mandates and earn commissions</p>
            </button>

            <button
              onClick={() => handleRoleSelect('candidate')}
              className="w-full p-4 border border-slate-600 rounded-lg hover:border-blue-400 hover:bg-slate-800/50 transition text-left"
            >
              <p className="font-semibold text-white">I'm a Job Seeker</p>
              <p className="text-sm text-gray-400">Upload CV and find opportunities</p>
            </button>

            <p className="text-center text-gray-400 mt-6">
              Already have an account? <a href="/login-fresh" className="text-orange-500 hover:text-orange-400">Sign In</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'details' && selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Join TRICCI</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={handleBackToRole}
              className="text-orange-500 hover:text-orange-400 text-sm mb-4"
            >
              ← Back to role selection
            </button>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <p className="text-sm text-gray-400">
                Selected: <span className="text-orange-500 font-semibold">{selectedRole === 'employer' ? 'Hiring Company' : selectedRole === 'consultant' ? 'Recruitment Consultant' : 'Job Seeker'}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
              />
              <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                  confirmPassword && password === confirmPassword
                    ? 'border-green-500 focus:border-green-400'
                    : 'border-slate-600 focus:border-blue-400'
                }`}
              />
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-500 mt-1">✓ Passwords match</p>
              )}
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-600 rounded-lg p-3">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || !email.trim() || password.length < 8 || password !== confirmPassword}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <p className="text-center text-gray-400 text-sm">
              Already have an account? <a href="/login-fresh" className="text-orange-500 hover:text-orange-400">Sign In</a>
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="text-6xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-white">Account Created!</h2>
        <p className="text-gray-400">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
