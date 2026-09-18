import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './auth.module.css';

type SignupStep = 'role' | 'details' | 'otp';

interface SignupData {
  role: 'Employer' | 'Consultant' | 'Candidate';
  name: string;
  email: string;
}

export function SignupPasswordlessPage() {
  const [step, setStep] = useState<SignupStep>('role');
  const [data, setData] = useState<SignupData>({
    role: 'Candidate',
    name: '',
    email: '',
  });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRoleSelect = (role: SignupData['role']) => {
    setData({ ...data, role });
    setStep('details');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup-send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          role: data.role,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        setError(responseData.error || 'Failed to send OTP');
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
      const response = await fetch('/api/auth/signup-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          otp,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        setError(responseData.error || 'Failed to verify OTP');
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
          {step === 'role' && (
            <>
              <h1>Join TRICCI</h1>
              <p>Select your role to get started</p>
              <div className={styles.roleGrid}>
                <button
                  className={styles.roleCard}
                  onClick={() => handleRoleSelect('Employer')}
                >
                  <h3>Employer</h3>
                  <p>Hire talent for your business</p>
                </button>
                <button
                  className={styles.roleCard}
                  onClick={() => handleRoleSelect('Consultant')}
                >
                  <h3>Consultant</h3>
                  <p>Source and place candidates</p>
                </button>
                <button
                  className={styles.roleCard}
                  onClick={() => handleRoleSelect('Candidate')}
                >
                  <h3>Candidate</h3>
                  <p>Find your next opportunity</p>
                </button>
              </div>
              <p className={styles.switchAuth}>
                Already have an account? <a href="/login">Login here</a>
              </p>
            </>
          )}

          {step === 'details' && (
            <>
              <h1>Create Account</h1>
              <p>As {data.role}</p>

              {error && <div className={styles.error}>{error}</div>}

              <form onSubmit={handleSendOtp}>
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => setData({ ...data, email: e.target.value })}
                    required
                    placeholder="Enter your email"
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => setStep('role')}
                >
                  Back
                </button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <h1>Verify Email</h1>
              <p>Enter the 6-digit code sent to {data.email}</p>

              {error && <div className={styles.error}>{error}</div>}

              <form onSubmit={handleVerifyOtp}>
                <div className={styles.formGroup}>
                  <label>OTP Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                    maxLength={6}
                    placeholder="000000"
                    required
                  />
                  <small>Expires in 10 minutes</small>
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => {
                    setStep('details');
                    setOtp('');
                    setError('');
                  }}
                >
                  Back
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
