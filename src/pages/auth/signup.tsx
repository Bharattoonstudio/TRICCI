import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, AlertCircle, Loader2, Building2, Star, User, Shield, CheckCircle } from 'lucide-react';
import { signIn, signUp } from '@/lib/auth/auth-client';
import { trackSignup } from '@/lib/analytics';
import { validateEmail, validatePassword, validatePhoneNumber, sanitizeInput, validateSignupForm } from '@/lib/validation';

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

// Google SVG icon
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// LinkedIn SVG icon
function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'linkedin' | null>(null);
  const [error, setError] = useState('');

  function handleRoleSelect(role: Role) {
    setSelectedRole(role);
    setStep('details');
  }

  async function handleSocialLogin(provider: 'google' | 'linkedin') {
    setError('');
    setSocialLoading(provider);
    try {
      trackSignup(selectedRole ?? 'unknown', provider);
      await signIn.social({ provider, callbackURL: '/' });
    } catch {
      setError(`Could not sign up with ${provider === 'google' ? 'Google' : 'LinkedIn'}. Please try again.`);
      setSocialLoading(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole) return;

    setError('');

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPhone = sanitizeInput(phone).replace(/\s/g, '').replace(/^(\+91)?/, '');

    // Validate all fields
    const validation = validateSignupForm({
      email: sanitizedEmail,
      phone: sanitizedPhone,
      password,
      name: sanitizedName,
    });

    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      setError(firstError || 'Please fix the errors above');
      return;
    }

    setLoading(true);
    try {
      // Use Better Auth's signUp.email() to create account
      const result = await signUp.email({
        name: sanitizedName,
        email: sanitizedEmail,
        password: password,
      });

      if (result.error) {
        const errorMsg = result.error.message ?? 'Could not create account. Please try again.';
        setError(errorMsg);
        // Enhanced logging for debugging
        console.error('❌ Signup error details:', {
          message: result.error.message,
          code: (result.error as any).code,
          status: (result.error as any).status,
          fullError: result.error,
        });
        return;
      }

      console.log('Account created successfully, setting role...');

      // Set the role and phone after signup
      try {
        const roleResponse = await fetch('/api/auth/set-role-after-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: sanitizedEmail,
            role: selectedRole,
            phone: sanitizedPhone
          }),
          credentials: 'include',
        });

        if (!roleResponse.ok) {
          const errorData = await roleResponse.json().catch(() => ({})) as { error?: string };
          const errorMsg = errorData.error || 'Failed to set role. Please try again.';
          setError(errorMsg);
          console.error('Failed to set role:', errorMsg);
          return;
        }
      } catch (roleError) {
        const errorMsg = roleError instanceof Error ? roleError.message : 'Error setting role';
        setError(errorMsg);
        console.error('Error setting role:', roleError);
        return;
      }

      trackSignup(selectedRole, 'email');

      // Redirect straight to the role dashboard
      const dest = selectedRole === 'employer'
        ? '/employer/dashboard'
        : selectedRole === 'consultant'
          ? '/consultant/dashboard'
          : '/candidate/profile';

      navigate(dest, { replace: true });
    } catch (error) {
      console.error('Signup exception:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const roleInfo = selectedRole ? ROLES.find(r => r.id === selectedRole) : null;

  return (
    <>
      <Helmet>
        <title>Create Account — TRICCI</title>
        <meta name="description" content="Join TRICCI free — post jobs as an employer, earn % placement fees as a consultant, or get discovered by top recruiters as a candidate." />
        <link rel="canonical" href="https://tricci.in/signup" />
        <meta property="og:title" content="Create Your Free TRICCI Account" />
        <meta property="og:description" content="Join India's recruitment aggregator. Employers, consultants, and candidates all on one transparent platform." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tricci.in/signup" />
        <meta property="og:image" content="https://tricci.in/api/og?title=Join+TRICCI+Free&subtitle=Employers+%C2%B7+Consultants+%C2%B7+Candidates&tag=signup&type=platform" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="TRICCI" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Create Your Free TRICCI Account" />
        <meta name="twitter:description" content="Join India's recruitment aggregator. Employers, consultants, and candidates — all on one platform." />
        <meta name="twitter:image" content="https://tricci.in/api/og?title=Join+TRICCI+Free&subtitle=Employers+%C2%B7+Consultants+%C2%B7+Candidates&tag=signup&type=platform" />
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse, #FF6B35 0%, transparent 70%)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <span className="text-4xl font-black tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: '#FF6B35' }}>
                TRICCI
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mt-2">India's recruitment aggregator</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/30">
            <AnimatePresence mode="wait">
              {step === 'role' && (
                <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <h1 className="text-2xl font-black text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                    Join TRICCI
                  </h1>
                  <p className="text-sm text-muted-foreground mb-5">Choose how you'll use the platform</p>

                  {/* Social signup buttons */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => handleSocialLogin('google')}
                      disabled={!!socialLoading}
                      className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-foreground disabled:opacity-60"
                    >
                      {socialLoading === 'google'
                        ? <Loader2 size={16} className="animate-spin text-muted-foreground" />
                        : <GoogleIcon />}
                      Google
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSocialLogin('linkedin')}
                      disabled={!!socialLoading}
                      className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-foreground disabled:opacity-60"
                    >
                      {socialLoading === 'linkedin'
                        ? <Loader2 size={16} className="animate-spin text-muted-foreground" />
                        : <LinkedInIcon />}
                      LinkedIn
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium">or sign up with email</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm mb-4">
                      <AlertCircle size={15} className="shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    {ROLES.map(role => (
                      <button
                        key={role.id}
                        onClick={() => handleRoleSelect(role.id)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                          style={{ backgroundColor: role.color + '20', border: `1.5px solid ${role.color}40` }}>
                          <role.icon size={18} style={{ color: role.color }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-foreground text-sm">{role.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 border-border group-hover:border-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Account Details ── */}
              {step === 'details' && roleInfo && (
                <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <button onClick={() => setStep('role')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5">
                    ← Back
                  </button>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: roleInfo.color + '20', border: `1.5px solid ${roleInfo.color}40` }}>
                      <roleInfo.icon size={16} style={{ color: roleInfo.color }} />
                    </div>
                    <div>
                      <h1 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                        Create {roleInfo.label} account
                      </h1>
                      <p className="text-xs text-muted-foreground">{roleInfo.description}</p>
                    </div>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                      <AlertCircle size={15} className="shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1.5 block">
                        {selectedRole === 'employer' ? 'Company / Your Name' : 'Full Name'}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder={selectedRole === 'employer' ? 'Acme Technologies' : 'Rajesh Kumar'}
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1.5 block">Work Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder="you@company.com"
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1.5 block">Mobile Number</label>
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 bg-muted border border-border rounded-xl text-sm text-muted-foreground font-semibold shrink-0">
                          +91
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          required
                          placeholder="9876543210"
                          maxLength={10}
                          className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">You can update this later in your profile</p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1.5 block">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                          minLength={8}
                          placeholder="Min. 8 characters"
                          className="w-full bg-muted border border-border rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Password strength hint */}
                    {password.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {[8, 12, 16].map(len => (
                          <div key={len} className={`h-1 flex-1 rounded-full transition-colors ${password.length >= len ? 'bg-primary' : 'bg-muted'}`} />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">
                          {password.length < 8 ? 'Too short' : password.length < 12 ? 'Good' : 'Strong'}
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || password.length < 8}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                    >
                      {loading
                        ? <><Loader2 size={16} className="animate-spin" /> Creating account…</>
                        : <><CheckCircle size={16} /> Create Account</>}
                    </button>

                    <p className="text-xs text-muted-foreground text-center">
                      By signing up you agree to TRICCI&apos;s Terms of Service and Privacy Policy.
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
