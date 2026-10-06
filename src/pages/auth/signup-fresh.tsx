import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function SignupFresh() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [role, setRole] = useState<'employer' | 'consultant' | 'candidate' | ''>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (selectedRole: 'employer' | 'consultant' | 'candidate') => {
    setRole(selectedRole);
    setStep('details');
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // ✅ CORRECT BetterAuth endpoint: /api/auth/sign-up
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || 'Signup failed. Please try again.');
        return;
      }

      // Store session token
      if (data.token) {
        localStorage.setItem('sessionToken', data.token);
      }
      if (data.userId) {
        localStorage.setItem('userId', data.userId);
      }
      if (data.user) {
        localStorage.setItem('userRole', role);
      }

      // Redirect based on role
      if (role === 'employer') {
        navigate('/employer/dashboard');
      } else if (role === 'consultant') {
        navigate('/consultant/dashboard');
      } else if (role === 'candidate') {
        navigate('/candidate/profile');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    {
      value: 'employer' as const,
      label: 'I\'m a Hiring Company',
      description: 'Post roles and find talent',
    },
    {
      value: 'consultant' as const,
      label: 'I\'m a Recruitment Consultant',
      description: 'Access mandates and earn commissions',
    },
    {
      value: 'candidate' as const,
      label: 'I\'m a Job Seeker',
      description: 'Upload CV and find opportunities',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Sign Up - TRICCI</title>
        <meta name="description" content="Create your TRICCI account" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Join TRICCI</h1>
            <p className="text-gray-400">Get started in minutes</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Role Selection */}
          {step === 'role' ? (
            <div className="space-y-3">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleRoleSelect(option.value)}
                  className="w-full p-4 text-left border border-slate-600 hover:border-orange-500 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                >
                  <p className="font-semibold text-white">{option.label}</p>
                  <p className="text-sm text-gray-400">{option.description}</p>
                </button>
              ))}
            </div>
          ) : (
            // Signup Form
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Back Button */}
              <button
                type="button"
                onClick={() => setStep('role')}
                className="text-orange-400 hover:text-orange-300 text-sm font-medium mb-4"
              >
                ← Back to role selection
              </button>

              {/* Selected Role */}
              <div className="p-3 bg-slate-700 rounded-lg">
                <p className="text-sm text-gray-300">
                  Selected: <span className="font-semibold text-orange-400 capitalize">{role}</span>
                </p>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formData.password === formData.confirmPassword && formData.password && (
                  <div className="flex items-center gap-1 mt-1 text-green-400 text-xs">
                    <CheckCircle size={14} /> Passwords match
                  </div>
                )}
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-2.5 rounded-lg transition-all duration-200"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* Sign In Link */}
          {step === 'role' && (
            <div className="mt-8 text-center">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">
                  Sign In
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
