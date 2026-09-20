import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './auth.module.css';

type Step = 'role' | 'details' | 'otp';
type Role = 'employer' | 'consultant' | 'candidate';

export default function SignupPasswordlessPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep('details');
    setError('');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !phone) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/otp/send-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          phone,
          role,
<<<<<<< HEAD
=======
          type: 'signup'
>>>>>>> d8512beb0fbf7338117a4266d514256bdc053a90
        })
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

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/otp/verify-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp,
          name,
          phone,
          role,
<<<<<<< HEAD
=======
          type: 'signup'
>>>>>>> d8512beb0fbf7338117a4266d514256bdc053a90
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to verify OTP');
      }

      const data = await response.json();

<<<<<<< HEAD
      // Backend sets session cookie — no localStorage needed
      // Redirect based on role
      const roleRoutes: Record<Role, string> = {
        employer: '/employer/dashboard',
        consultant: '/consultant/dashboard',
        candidate: '/candidate/profile'
      };

      navigate(roleRoutes[role as Role] || '/');
=======
      // Store session and redirect based on role
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));

        const roleRoutes: Record<Role, string> = {
          employer: '/employer/dashboard',
          consultant: '/consultant/dashboard',
          candidate: '/candidate/dashboard'
        };

        navigate(roleRoutes[role as Role] || '/');
      }
>>>>>>> d8512beb0fbf7338117a4266d514256bdc053a90
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'role') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <h1>Create Account on TRICCI</h1>
            <p>Choose your role to get started</p>

            <div className={styles.roleGrid}>
              <div
                className={styles.roleCard}
                onClick={() => handleRoleSelect('employer')}
              >
                <h3>Employer</h3>
                <p>Post jobs and hire talent</p>
              </div>

              <div
                className={styles.roleCard}
                onClick={() => handleRoleSelect('consultant')}
              >
                <h3>Consultant</h3>
                <p>Submit candidates and earn</p>
              </div>

              <div
                className={styles.roleCard}
                onClick={() => handleRoleSelect('candidate')}
              >
                <h3>Candidate</h3>
                <p>Apply for jobs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <h1>Create Account</h1>
<<<<<<< HEAD
            <p>Tell us about yourself</p>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleSendOtp}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
=======
            <p>Enter your details</p>

            {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSendOtp}>
              <div className={styles.formGroup}>
                <label>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
>>>>>>> d8512beb0fbf7338117a4266d514256bdc053a90
                  required
                />
              </div>

              <div className={styles.formGroup}>
<<<<<<< HEAD
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
=======
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
>>>>>>> d8512beb0fbf7338117a4266d514256bdc053a90
                  required
                />
              </div>

              <div className={styles.formGroup}>
<<<<<<< HEAD
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="10-digit phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
=======
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
>>>>>>> d8512beb0fbf7338117a4266d514256bdc053a90
                  required
                />
              </div>

<<<<<<< HEAD
              <button type="submit" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Continue'}
=======
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginTop: '1rem',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Sending...' : 'Send OTP'}
>>>>>>> d8512beb0fbf7338117a4266d514256bdc053a90
              </button>
            </form>

            <button
<<<<<<< HEAD
              type="button"
              className={styles.backButton}
              onClick={() => setStep('role')}
            >
              Back to Role Selection
=======
              onClick={() => setStep('role')}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginTop: '0.5rem',
                backgroundColor: 'transparent',
                color: '#667eea',
                border: '1px solid #667eea',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Back
>>>>>>> d8512beb0fbf7338117a4266d514256bdc053a90
            </button>
          </div>
        </div>
      </div>
    );
  }

<<<<<<< HEAD
  if (step === 'otp') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <h1>Verify Your Email</h1>
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
              onClick={() => setStep('details')}
            >
              Back to Details
            </button>
          </div>
        </div>
      </div>
    );
  }
}
=======
  return (
    <div className={styles.pageContainer}>
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1>Verify Email</h1>
          <p>Enter the 6-digit OTP sent to {email}</p>

          {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleVerifyOtp}>
            <div className={styles.formGroup}>
              <label>OTP Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginTop: '1rem',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>
          </form>

          <button
            onClick={() => setStep('details')}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginTop: '0.5rem',
              backgroundColor: 'transparent',
              color: '#667eea',
              border: '1px solid #667eea',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
>>>>>>> d8512beb0fbf7338117a4266d514256bdc053a90
