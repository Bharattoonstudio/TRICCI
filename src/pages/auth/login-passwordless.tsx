import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './auth.module.css';

type Step = 'email' | 'otp';

export default function LoginPasswordlessPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login-send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send OTP');
      }

      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid OTP');
      }

      const data = await response.json();

      // Redirect based on role
      if (data.role === 'employer') {
        navigate('/employer/dashboard');
      } else if (data.role === 'consultant') {
        navigate('/consultant/dashboard');
      } else if (data.role === 'candidate') {
        navigate('/candidate/profile');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          {step === 'email' ? (
            <>
              <h1>Login to TRICCI</h1>
              <p>Enter your email to continue</p>
              {error && <div className={styles.error}>{error}</div>}
              <form onSubmit={handleSendOtp}>
                <div className={styles.formGroup}>
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
              <div className={styles.switchAuth}>
                Don't have an account? <a href="/signup">Sign up</a>
              </div>
            </>
          ) : (
            <>
              <h1>Verify OTP</h1>
              <p>Enter the 6-digit code sent to {email}</p>
              {error && <div className={styles.error}>{error}</div>}
              <form onSubmit={handleVerifyOtp}>
                <div className={styles.formGroup}>
                  <label htmlFor="otp">OTP Code</label>
                  <input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                  />
                  <small>Valid for 10 minutes</small>
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError('');
                }}
              >
                Back to Email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
