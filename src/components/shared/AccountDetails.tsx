/**
 * AccountDetails — shared account settings panel used across all three dashboards.
 * Shows profile info, password change, notification preferences, and PAN verification for consultants.
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, CheckCircle,
  Loader2, AlertCircle, Bell, Shield, LogOut, Camera,
  CreditCard, MessageSquare
} from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';
import { useNavigate } from 'react-router-dom';

interface AccountUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  image?: string | null;
}

export default function AccountDetails({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);

  // PAN verification (consultant only)
  const [panNumber, setPanNumber] = useState('');
  const [panPhone, setPanPhone] = useState('');
  const [panOtp, setPanOtp] = useState('');
  const [panStep, setPanStep] = useState<'idle' | 'otp_sent' | 'verified'>('idle');
  const [panLoading, setPanLoading] = useState(false);
  const [panError, setPanError] = useState('');

  async function handleSendPanOtp() {
    setPanError('');
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panNumber.toUpperCase())) {
      setPanError('Enter a valid PAN number (e.g. ABCDE1234F).');
      return;
    }
    if (!panPhone.match(/^[6-9]\d{9}$/)) {
      setPanError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setPanLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: panPhone, purpose: 'pan_verification' }),
      });
      if (!res.ok) throw new Error('Failed to send OTP');
      setPanStep('otp_sent');
    } catch {
      setPanError('Could not send OTP. Please try again.');
    } finally {
      setPanLoading(false);
    }
  }

  async function handleVerifyPanOtp() {
    setPanError('');
    if (panOtp.length !== 6) { setPanError('Enter the 6-digit OTP.'); return; }
    setPanLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: panPhone, otp: panOtp, purpose: 'pan_verification' }),
      });
      if (!res.ok) throw new Error('Invalid OTP');
      setPanStep('verified');
    } catch {
      setPanError('Invalid or expired OTP. Please try again.');
    } finally {
      setPanLoading(false);
    }
  }

  useEffect(() => {
    authClient.getSession()
      .then((result: { data?: { user?: AccountUser } | null }) => {
        const u = result?.data?.user;
        if (u) {
          setUser(u);
          setName(u.name ?? '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileSaved(false);
    if (!name.trim()) { setProfileError('Name is required.'); return; }
    setSavingProfile(true);
    try {
      await (authClient as unknown as {
        updateUser: (opts: { name: string }) => Promise<{ error?: { message?: string } }>;
      }).updateUser({ name: name.trim() });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      setProfileError('Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSaved(false);
    if (!currentPassword) { setPasswordError('Current password is required.'); return; }
    if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    setSavingPassword(true);
    try {
      const result = await (authClient as unknown as {
        changePassword: (opts: { currentPassword: string; newPassword: string; revokeOtherSessions: boolean }) => Promise<{ error?: { message?: string } }>;
      }).changePassword({ currentPassword, newPassword, revokeOtherSessions: false });
      if (result?.error) throw new Error(result.error.message ?? 'Failed');
      setPasswordSaved(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
    navigate('/login', { replace: true });
  }

  const isDark = theme === 'dark';
  const card = isDark
    ? 'bg-[#0d0d0d] border-white/8 text-white'
    : 'bg-card border-border text-foreground';
  const input = isDark
    ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary'
    : 'bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary';
  const label = isDark ? 'text-white/60' : 'text-muted-foreground';
  const heading = isDark ? 'text-white' : 'text-foreground';
  const sub = isDark ? 'text-white/40' : 'text-muted-foreground';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const roleLabel = user?.role === 'employer' ? 'Employer' : user?.role === 'consultant' ? 'Consultant' : user?.role === 'candidate' ? 'Candidate' : 'User';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-6 ${card}`}>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
              style={{ background: 'linear-gradient(135deg, #E8470A, #6B4FBB)', color: 'white' }}>
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Camera size={11} className="text-white" />
            </button>
          </div>
          <div>
            <p className={`font-black text-lg ${heading}`} style={{ fontFamily: 'var(--font-heading)' }}>{user?.name}</p>
            <p className={`text-sm ${sub}`}>{user?.email}</p>
            <span className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
              {roleLabel}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className={`text-sm font-semibold mb-1.5 block ${label}`}>Full Name</label>
            <div className="relative">
              <User size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-muted-foreground'}`} />
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                className={`w-full rounded-xl pl-10 pr-4 py-3 text-sm border focus:outline-none transition-colors ${input}`}
              />
            </div>
          </div>
          <div>
            <label className={`text-sm font-semibold mb-1.5 block ${label}`}>Email Address</label>
            <div className="relative">
              <Mail size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-muted-foreground'}`} />
              <input
                value={user?.email ?? ''}
                disabled
                className={`w-full rounded-xl pl-10 pr-4 py-3 text-sm border opacity-50 cursor-not-allowed ${input}`}
              />
            </div>
            <p className={`text-xs mt-1 ${sub}`}>Email cannot be changed. Contact support if needed.</p>
          </div>
          <div>
            <label className={`text-sm font-semibold mb-1.5 block ${label}`}>Phone Number</label>
            <div className="relative">
              <Phone size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-muted-foreground'}`} />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className={`w-full rounded-xl pl-10 pr-4 py-3 text-sm border focus:outline-none transition-colors ${input}`}
              />
            </div>
          </div>

          {profileError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} /> {profileError}
            </div>
          )}
          {profileSaved && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <CheckCircle size={14} /> Profile updated successfully.
            </div>
          )}

          <button type="submit" disabled={savingProfile}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60">
            {savingProfile ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Profile'}
          </button>
        </form>
      </motion.div>

      {/* Change password */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className={`rounded-2xl border p-6 ${card}`}>
        <div className="flex items-center gap-2 mb-5">
          <Lock size={16} className="text-primary" />
          <h3 className={`font-black text-sm ${heading}`} style={{ fontFamily: 'var(--font-heading)' }}>Change Password</h3>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            { label: 'Current Password', value: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
            { label: 'New Password', value: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v) },
            { label: 'Confirm New Password', value: confirmPassword, set: setConfirmPassword, show: showNew, toggle: () => {} },
          ].map(({ label: lbl, value, set, show, toggle }) => (
            <div key={lbl}>
              <label className={`text-sm font-semibold mb-1.5 block ${label}`}>{lbl}</label>
              <div className="relative">
                <Lock size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-muted-foreground'}`} />
                <input
                  type={show ? 'text' : 'password'}
                  value={value}
                  onChange={e => set(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-xl pl-10 pr-10 py-3 text-sm border focus:outline-none transition-colors ${input}`}
                />
                <button type="button" onClick={toggle}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30 hover:text-white/60' : 'text-muted-foreground hover:text-foreground'} transition-colors`}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}

          {passwordError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} /> {passwordError}
            </div>
          )}
          {passwordSaved && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <CheckCircle size={14} /> Password changed successfully.
            </div>
          )}

          <button type="submit" disabled={savingPassword}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60">
            {savingPassword ? <><Loader2 size={14} className="animate-spin" /> Updating…</> : 'Update Password'}
          </button>
        </form>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={`rounded-2xl border p-6 ${card}`}>
        <div className="flex items-center gap-2 mb-5">
          <Bell size={16} className="text-primary" />
          <h3 className={`font-black text-sm ${heading}`} style={{ fontFamily: 'var(--font-heading)' }}>Notification Preferences</h3>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Email Notifications', desc: 'Receive updates about submissions, shortlists, and payouts via email.', value: emailNotifs, set: setEmailNotifs },
            { label: 'SMS Notifications', desc: 'Get instant SMS alerts for important activity on your account.', value: smsNotifs, set: setSmsNotifs },
          ].map(({ label: lbl, desc, value, set }) => (
            <div key={lbl} className={`flex items-start justify-between gap-4 p-4 rounded-xl border ${isDark ? 'border-white/8 bg-white/3' : 'border-border bg-muted/30'}`}>
              <div>
                <p className={`text-sm font-semibold ${heading}`}>{lbl}</p>
                <p className={`text-xs mt-0.5 ${sub}`}>{desc}</p>
              </div>
              <button
                onClick={() => set(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-primary' : isDark ? 'bg-white/10' : 'bg-muted'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* PAN Verification — consultant only */}
      {user?.role === 'consultant' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className={`rounded-2xl border p-6 ${card}`}>
          <div className="flex items-center gap-2 mb-5">
            <CreditCard size={16} className="text-primary" />
            <h3 className={`font-black text-sm ${heading}`} style={{ fontFamily: 'var(--font-heading)' }}>PAN Verification</h3>
            {panStep === 'verified' && (
              <span className="ml-auto flex items-center gap-1 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1">
                <CheckCircle size={11} /> Verified
              </span>
            )}
          </div>

          {panStep === 'verified' ? (
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDark ? 'border-green-500/20 bg-green-500/8' : 'border-green-500/20 bg-green-500/5'}`}>
              <CheckCircle size={20} className="text-green-400 shrink-0" />
              <div>
                <p className={`text-sm font-bold ${heading}`}>PAN Verified Successfully</p>
                <p className={`text-xs mt-0.5 ${sub}`}>Your PAN {panNumber.toUpperCase()} has been verified via OTP.</p>
              </div>
            </div>
          ) : panStep === 'otp_sent' ? (
            <div className="space-y-4">
              <p className={`text-sm ${sub}`}>Enter the 6-digit OTP sent to <strong className={heading}>+91 {panPhone}</strong></p>
              <div>
                <label className={`text-sm font-semibold mb-1.5 block ${label}`}>OTP</label>
                <div className="relative">
                  <MessageSquare size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-muted-foreground'}`} />
                  <input
                    value={panOtp}
                    onChange={e => setPanOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className={`w-full rounded-xl pl-10 pr-4 py-3 text-sm border focus:outline-none transition-colors tracking-widest ${input}`}
                  />
                </div>
              </div>
              {panError && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle size={14} /> {panError}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={handleVerifyPanOtp} disabled={panLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60">
                  {panLoading ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : 'Verify OTP'}
                </button>
                <button onClick={() => { setPanStep('idle'); setPanOtp(''); setPanError(''); }}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${isDark ? 'border-white/10 text-white/50 hover:text-white' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className={`text-sm ${sub}`}>Verify your PAN number using your registered mobile OTP. Required for payout processing.</p>
              <div>
                <label className={`text-sm font-semibold mb-1.5 block ${label}`}>PAN Number</label>
                <div className="relative">
                  <CreditCard size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-muted-foreground'}`} />
                  <input
                    value={panNumber}
                    onChange={e => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className={`w-full rounded-xl pl-10 pr-4 py-3 text-sm border focus:outline-none transition-colors tracking-widest uppercase ${input}`}
                  />
                </div>
              </div>
              <div>
                <label className={`text-sm font-semibold mb-1.5 block ${label}`}>Mobile Number (for OTP)</label>
                <div className="relative">
                  <Phone size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-muted-foreground'}`} />
                  <input
                    value={panPhone}
                    onChange={e => setPanPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    maxLength={10}
                    className={`w-full rounded-xl pl-10 pr-4 py-3 text-sm border focus:outline-none transition-colors ${input}`}
                  />
                </div>
              </div>
              {panError && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle size={14} /> {panError}
                </div>
              )}
              <button onClick={handleSendPanOtp} disabled={panLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60">
                {panLoading ? <><Loader2 size={14} className="animate-spin" /> Sending OTP…</> : 'Send OTP to Verify PAN'}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className={`rounded-2xl border p-6 ${card}`}>
        <div className="flex items-center gap-2 mb-5">
          <Shield size={16} className="text-primary" />
          <h3 className={`font-black text-sm ${heading}`} style={{ fontFamily: 'var(--font-heading)' }}>Account Security</h3>
        </div>
        <div className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'border-white/8 bg-white/3' : 'border-border bg-muted/30'}`}>
          <div>
            <p className={`text-sm font-semibold ${heading}`}>Sign Out</p>
            <p className={`text-xs mt-0.5 ${sub}`}>Sign out of your TRICCI account on this device.</p>
          </div>
          <button onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
