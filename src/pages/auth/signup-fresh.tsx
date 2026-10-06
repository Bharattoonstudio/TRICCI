import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2, Building2, Star, User, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { trackSignup } from '@/lib/analytics';
import { validateEmail, sanitizeInput } from '@/lib/validation';

type Role = 'employer' | 'consultant' | 'candidate';
type Step = 'role' | 'details' | 'success';

const ROLES: { id: Role; label: string; description: string; icon: React.ElementType; color: string }[] = [
  {
    id: 'employer',
    label: 'I\'m a Hiring Company',
    description: 'Post roles and find talent',
    icon: Building2,
    color: '#35c9ff',
  },
  {
    id: 'consultant',
    label: 'I\'m a Recruitment Consultant',
    description: 'Access mandates and earn commissions',
    icon: Star,
    color: '#FF6B35',
  },
  {
    id: 'candidate',
    label: 'I\'m a Job Seeker',
    description: 'Upload CV and find opportunities',
    icon: User,
    color: '#ffd035',
  },
];

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    // Validate
    if (!sanitizedName.trim()) {
      setError('Name is required');
      return;
    }

    if (!validateEmail(sanitizedEmail)) {
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
      trackSignup(selectedRole, 'email');

      // Call BetterAuth sign-up endpoint
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sanitizedEmail,
          password: password,
          name: sanitizedName,
          role: selectedRole,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Signup failed');
      }

      // Store session token and user role
      if (data.session?.token) {
        localStorage.setItem('sessionToken', data.session.token);
      }
      if (data.user?.id) {
        localStorage.setItem('userId', data.user.id);
      }
      localStorage.setItem('userRole', selectedRole);

      // Show success and redirect
      setStep('success');
      setLoading(false);

      // Redirect to role-specific dashboard after 2 seconds
      setTimeout(() => {
        navigate(roleRoutes[selectedRole], { replace: true });
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign Up - TRICCI</title>
        <meta name="description" content="Create your TRICCI account" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Join TRICCI</h1>
            <p className="text-gray-400">Get started in minutes</p>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {step === 'role' && (
              <motion.div
                key="role"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {ROLES.map((role) => (
                  <motion.button
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    className="w-full p-4 border border-slate-600 rounded-lg hover:border-blue-400 hover:bg-slate-800/50 transition text-left"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start gap-3">
                      <role.icon className="w-6 h-6 mt-1" style={{ color: role.color }} />
                      <div>
                        <p className="font-semibold text-white">{role.label}</p>
                        <p className="text-sm text-gray-400">{role.description}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}

                <p className="text-center text-gray-400 mt-6">
                  Already have an account?{' '}
                  <Link to="/login" className="text-orange-500 hover:text-orange-400">
                    Sign In
                  </Link>
                </p>
              </motion.div>
            )}

            {step === 'details' && selectedRole && (
              <motion.form
                key="details"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Back Button */}
                <button
                  type="button"
                  onClick={handleBackToRole}
                  className="text-orange-500 hover:text-orange-400 text-sm mb-4"
                >
                  ← Back to role selection
                </button>

                {/* Role Indicator */}
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                  <p className="text-sm text-gray-400">
                    Selected: <span className="text-orange-500 font-semibold">{ROLES.find(r => r.id === selectedRole)?.label}</span>
                  </p>
                </div>

                {/* Full Name */}
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

                {/* Email */}
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

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none pr-10 ${
                        confirmPassword && password === confirmPassword
                          ? 'border-green-500 focus:border-green-400'
                          : 'border-slate-600 focus:border-blue-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-200"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                      <CheckCircle size={14} /> Passwords match
                    </p>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-900/30 border border-red-600 rounded-lg p-3 flex gap-3"
                  >
                    <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                    <p className="text-red-200 text-sm">{error}</p>
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !name.trim() || !email.trim() || password.length < 8 || password !== confirmPassword}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                {/* Sign In Link */}
                <p className="text-center text-gray-400 text-sm">
                  Already have an account?{' '}
                  <Link to="/login-fresh" className="text-orange-500 hover:text-orange-400">
                    Sign In
                  </Link>
                </p>
              </motion.form>
            )}

            {step === 'success' && selectedRole && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-4"
              >
                <div className="flex justify-center mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    <CheckCircle className="w-16 h-16 text-green-500" />
                  </motion.div>
                </div>
                <h2 className="text-2xl font-bold text-white">Account Created!</h2>
                <p className="text-gray-400">Redirecting to your dashboard...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
