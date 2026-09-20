import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, AlertCircle, Loader2, Building2, Star, User } from 'lucide-react';
import { signUp } from '@/lib/auth/auth-client';
import { trackSignup } from '@/lib/analytics';
import { validateEmail, validatePassword, validatePhoneNumber, sanitizeInput } from '@/lib/validation';

type Role = 'employer' | 'consultant' | 'candidate';
type Step = 'role' | 'details';

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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole) return;

    setError('');

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const sanitizedPassword = password;

    // Validate
    if (!sanitizedName.trim()) {
      setError('Name is required');
      return;
    }

    if (!validateEmail(sanitizedEmail)) {
      setError('Valid email is required');
      return;
    }

    if (!validatePassword(sanitizedPassword)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, number, and symbol');
      return;
    }

    if (sanitizedPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      trackSignup(selectedRole, 'email');
      await signUp.email(
        {
          email: sanitizedEmail,
          password: sanitizedPassword,
          name: sanitizedName,
          role: selectedRole,
        },
        {
          onSuccess: () => {
            navigate('/employer/dashboard', { replace: true });
          },
          onError: (error) => {
            setError(error.message || 'Signup failed. Please try again.');
            setLoading(false);
          },
        }
      );
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
          <AnimatePresence mode="wait">
            {step === 'role' && (
              <motion.div
                key="role-selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-[#FF6B35] mb-2">Join TRICCI</h1>
                  <p className="text-gray-300">Select your role to get started</p>
                </div>

                <div className="space-y-3">
                  {ROLES.map((role) => (
                    <motion.button
                      key={role.id}
                      onClick={() => handleRoleSelect(role.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full p-4 bg-[#2D1810] border-2 border-[#FF6B35]/30 rounded-lg hover:border-[#FF6B35] hover:bg-[#3D2810] transition-all text-left group"
                    >
                      <div className="flex items-start gap-3">
                        <role.icon
                          size={24}
                          className="text-[#FF6B35] group-hover:text-[#FF8A5B] transition-colors mt-1"
                        />
                        <div>
                          <h3 className="font-semibold text-white">{role.label}</h3>
                          <p className="text-sm text-gray-400">{role.description}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="text-center text-sm">
                  <span className="text-gray-400">Already have an account? </span>
                  <Link to="/login" className="text-[#FF6B35] hover:text-[#FF8A5B] font-semibold">
                    Sign in
                  </Link>
                </div>
              </motion.div>
            )}

            {step === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div>
                  <button
                    onClick={handleBackToRole}
                    className="text-gray-400 hover:text-gray-200 text-sm mb-4 transition-colors"
                  >
                    ← Back
                  </button>

                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-[#FF6B35]">Create Account</h2>
                    <p className="text-gray-400 text-sm mt-1">
                      As {selectedRole && ROLES.find((r) => r.id === selectedRole)?.label}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-2 bg-[#2D1810] border border-[#FF6B35]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B35] transition-colors"
                      disabled={loading}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-4 py-2 bg-[#2D1810] border border-[#FF6B35]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B35] transition-colors"
                      disabled={loading}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password (min 8 chars)"
                        className="w-full px-4 py-2 bg-[#2D1810] border border-[#FF6B35]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B35] transition-colors pr-10"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">At least 8 characters with uppercase, lowercase, number, and symbol</p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full px-4 py-2 bg-[#2D1810] border border-[#FF6B35]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B35] transition-colors pr-10"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-[#FF6B35] hover:bg-[#FF8A5B] disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 mt-6"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </motion.button>

                  {/* Sign In Link */}
                  <div className="text-center text-sm mt-4">
                    <span className="text-gray-400">Already have an account? </span>
                    <Link to="/login" className="text-[#FF6B35] hover:text-[#FF8A5B] font-semibold">
                      Sign in
                    </Link>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
