import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './auth.module.css';

export function LoginPasswordlessPage() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

      const data = await response.json();

      if (!response.ok) {
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
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid OTP');
        return;
      }

      // Redirect based on role
      const dashboardMap: Record<string, string> = {
        Employer: '/employer/dashboard',
        Consultant: '/consultant/dashboard',
        Candidate: '/candidate/profile',
      };

      navigate(dashboardMap[data.role] || '/dashboard');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1>Login to TRICCI</h1>

          {error && <div className={styles.error}>{error}</div>}

          {step === 'email' ? (
            <form onSubmit={handleSendOtp}>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
              <p className={styles.switchAuth}>
                Want to sign up? <a href="/signup">Create account</a>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className={styles.formGroup}>
                <label>Enter 6-Digit OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  maxLength={6}
                  placeholder="000000"
                  required
                />
                <small>Check your email for the code (expires in 10 minutes)</small>
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError('');
                }}
              >
                Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
