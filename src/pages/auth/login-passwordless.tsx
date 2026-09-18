import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './auth.module.css';

export default function LoginPasswordlessPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
                const response = await fetch('/api/auth/login-send-otp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email }),
                });

          if (!response.ok) {
                    const data = await response.json();
                    setError(data.error || 'Failed to send OTP');
                    return;
          }

          setStep('otp');
        } catch (err) {
                setError('Network error. Please try again.');
        } finally {
                setLoading(false);
        }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
                const response = await fetch('/api/auth/login-verify-otp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email, otp }),
                          credentials: 'include',
                });

          if (!response.ok) {
                    const data = await response.json();
                    setError(data.error || 'Invalid OTP');
                    return;
          }

          const data = await response.json();
                // Redirect based on role
          if (data.role === 'employer') {
                    navigate('/employer/dashboard');
          } else if (data.role === 'consultant') {
                    navigate('/consultant/dashboard');
          } else if (data.role === 'candidate') {
                    navigate('/candidate/profile');
          }
        } catch (err) {
                setError('Network error. Please try again.');
        } finally {
                setLoading(false);
        }
  };

  return (
        <div className={styles.authContainer}>
                <div className={styles.authCard}>
                          <h1>Login to TRICCI</h1>h1>
                        
                  {error && <div className={styles.error}>{error}</div>div>}
                
                  {step === 'email' ? (
                    <form onSubmit={handleSendOtp}>
                                <div className={styles.formGroup}>
                                              <label htmlFor="email">Email Address</label>label>
                                              <input
                                                                id="email"
                                                                type="email"
                                                                value={email}
                                                                onChange={(e) => setEmail(e.target.value)}
                                                                placeholder="you@example.com"
                                                                required
                                                                disabled={loading}
                                                              />
                                </div>div>
                                <button type="submit" disabled={loading}>
                                  {loading ? 'Sending...' : 'Send Login Code'}
                                </button>button>
                    </form>form>
                  ) : (
                    <form onSubmit={handleVerifyOtp}>
                                <p className={styles.subtitle}>
                                              Enter the 6-digit code sent to {email}
                                </p>p>
                                <div className={styles.formGroup}>
                                              <label htmlFor="otp">Verification Code</label>label>
                                              <input
                                                                id="otp"
                                                                type="text"
                                                                value={otp}
                                                                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                                                                placeholder="000000"
                                                                maxLength={6}
                                                                required
                                                                disabled={loading}
                                                              />
                                </div>div>
                                <button type="submit" disabled={loading}>
                                  {loading ? 'Verifying...' : 'Login'}
                                </button>button>
                                <button
                                                type="button"
                                                onClick={() => setStep('email')}
                                                disabled={loading}
                                                className={styles.backButton}
                                              >
                                              Back
                                </button>button>
                    </form>form>
                        )}
                
                        <p className={styles.footer}>
                                  Don't have an account? <a href="/signup">Sign up</a>a>
                        </p>p>
                </div>div>
        </div>div>
      );
}</h1>
