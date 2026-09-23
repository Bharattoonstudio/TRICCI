import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2, Building2, Star, User, CheckCircle } from 'lucide-react';
import { trackSignup } from '@/lib/analytics';
import { validateEmail, sanitizeInput } from '@/lib/validation';

type Role = 'employer' | 'consultant' | 'candidate';
type Step = 'role' | 'details' | 'success';

const ROLES: { id: Role; label: string; description: string; icon: React.ElementType; color: string }[] = [
  {
    id: 'employer',
    label: 'Employer',
    description: 'Post jobs and hire through our consultant network',
    icon: Building2,
    color: '#35c9ff',
  },
  {
    id: 'consultant',
    label: 'Consultant',
    description: 'Submit candidates and earn % of placement fees',
    icon: Star,
    color: '#FF6B35',
  },
  {
    id: 'candidate',
    label: 'Candidate',
    description: 'Get discovered by top consultants for your next role',
    icon: User,
    color: '#ffd035',
  },
];

export default function SignupFreshPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleRoleSelect(role: Role) {
    setSelectedRole(role);
    setStep('details');
  }

  function handleBackToRole() {
    setStep('role');
    setSelectedRole(null);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole) return;

    setError('');

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const sanitizedPassword = sanitizeInput(password);

    // Validate
    if (!sanitizedName.trim()) {
      setError('Name is required');
      return;
    }

    if (!validateEmail(sanitizedEmail)) {
      setError('Valid email is required');
      return;
    }

    if (sanitizedPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      trackSignup(selectedRole, 'email');

      // FIXED: Call BetterAuth sign-up endpoint with password
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sanitizedEmail,
          password: sanitizedPassword,
          name: sanitizedName,
          role: selectedRole,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Signup failed');
      }

      // BetterAuth returns user and session
      if (data.user && data.session) {
        // Store session data
        localStorage.setItem('sessionToken', data.session.token || '');
        localStorage.setItem('userId', data.user.id);

        setStep('success');

        // Redirect after 2 seconds
        setTimeout(() => {
          const dashboardRoutes: Record<Role, string> = {
            employer: '/employer/dashboard',
            consultant: '/consultant/dashboard',
            candidate: '/candidate/profile',
          };
          navigate(dashboardRoutes[selectedRole], { replace: true });
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign Up - TRICCI</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-[#1A0A00] to-[#2D1810] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#FF6B35] mb-2">
                {step === 'success' ? 'Welcome to TRICCI!' : 'Join TRICCI'}
              </h1>
              <p className="text-gray-300">
                {step === 'role' && 'Choose your role to get started'}
                {step === 'details' && 'Create your account'}
                {step === 'success' && 'Your account is ready'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {step === 'role' && (
                <motion.div key="role" initial={{ opacity: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                  {ROLES.map((role) => (
                    <motion.button
                      key={role.id}
                      onClick={() => handleRoleSelect(role.id)}
                      whileHover={{ scale: 1.02 }}
                      className="w-full p-4 border border-white/10 rounded-lg hover:border-[#FF6B35]/50 bg-white/5 hover:bg-white/10 transition text-left"
                    >
                      <div className="flex items-start gap-3">
                        <role.icon size={24} style={{ color: role.color }} className="flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-semibold text-white">{role.label}</h3>
                          <p className="text-sm text-gray-400">{role.description}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {step === 'details' && (
                <motion.form key="details" onSubmit={handleSubmit} className="space-y-4" initial={{ opacity: 0 }} exit={{ opacity: 0 }}>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2 items-start"
                    >
                      <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-red-200 text-sm">{error}</p>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-[#FF6B35] hover:bg-[#ff5a1a] disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition"
                  >
                    {loading && <Loader2 size={18} className="animate-spin" />}
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToRole}
                    className="w-full text-center text-[#FF6B35] hover:text-[#ff5a1a] text-sm font-medium"
                  >
                    Back
                  </button>
                </motion.form>
              )}

              {step === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-6">Your account has been created successfully!</p>
                  <p className="text-gray-400 text-sm">Redirecting to dashboard...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {step === 'role' && (
              <p className="text-center text-gray-400 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-[#FF6B35] hover:text-[#ff5a1a] font-semibold">
                  Sign In
                </Link>
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
