import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Briefcase, IndianRupee, TrendingUp, Shield,
  Search, CheckCircle, Clock,
  MoreHorizontal, Eye, Settings, Bell,
  Building2, UserCheck, Sliders, BarChart3, ArrowUpRight, ArrowDownRight,
  Lock, Unlock,
  ChevronRight, Star, Zap, Loader2, RefreshCw,
  UserPlus, ExternalLink, AlertCircle, LogOut,
  X, Percent, Info, Save, FileText, Download, Edit2, Check,
  ClipboardList,
} from 'lucide-react';
import { signOut } from '@/lib/auth/auth-client';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'users' | 'jobs' | 'submissions' | 'placements' | 'approvals' | 'commission' | 'analytics' | 'assessments' | 'settings';
type UserStatus = 'active' | 'pending' | 'suspended';
type UserType = 'employer' | 'consultant' | 'candidate';

interface LiveUser {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface LiveStats {
  totalUsers: number;
  employers: number;
  consultants: number;
  candidates: number;
  activeJobs: number;
  alertSubscriptions: number;
  totalPlacements: number;
  totalRevenue: number;
  pendingApprovals: number;
  mrr: number;
}

interface AdminJob {
  id: string;
  title: string;
  company: string;
  location: string;
  locationType: string;
  ctcLabel: string;
  ctcMin: number;
  ctcMax: number;
  experience: string;
  category: string;
  feePercent: number;
  status: string;
  applicants: number;
  postedDays: number;
  createdAt: string;
  postedByUserId: string | null;
  employerName: string | null;
  employerEmail: string | null;
}

interface AdminSubmission {
  id: number;
  status: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  cvUrl: string | null;
  coverNote: string | null;
  createdAt: string;
  jobId: string | null;
  jobTitle: string | null;
  jobCompany: string | null;
  jobLocation: string | null;
  jobFeePercent: number | null;
  jobCtcLabel: string | null;
  consultantId: string | null;
  consultantName: string | null;
  consultantEmail: string | null;
}

interface AdminPlacement {
  id: number;
  submissionId: number;
  jobId: string | null;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  candidateEmail: string;
  consultantUserId: string | null;
  consultantName: string | null;
  employerUserId: string | null;
  ctcLpa: number | null;
  feePercent: number | null;
  feeAmountLpa: number | null;
  paymentStatus: string;
  placedAt: string;
  createdAt: string;
}



// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: UserStatus }) {
  const map: Record<UserStatus, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
    pending: { label: 'Unverified', className: 'bg-secondary/15 text-secondary border-secondary/30' },
    suspended: { label: 'Suspended', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  };
  const s = map[status];
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.className}`}>{s.label}</span>;
}

function getLiveUserStatus(u: LiveUser): UserStatus {
  if (u.isAdmin) return 'active'; // admins are always active
  if (!u.emailVerified) return 'suspended';
  return 'active';
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; className: string }> = {
    employer: { label: 'Employer', className: 'bg-accent/15 text-accent border-accent/30' },
    consultant: { label: 'Consultant', className: 'bg-primary/15 text-primary border-primary/30' },
    candidate: { label: 'Candidate', className: 'bg-muted text-muted-foreground border-border' },
    admin: { label: 'Admin', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  };
  const s = map[type] ?? { label: type, className: 'bg-muted text-muted-foreground border-border' };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.className}`}>{s.label}</span>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  color,
  alert,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down';
  color: string;
  alert?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`bg-card border rounded-2xl p-5 ${alert ? 'border-red-500/40' : 'border-border'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20', border: `1.5px solid ${color}40` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {trend === 'up' ? '+12%' : '-3%'}
          </span>
        )}
        {alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      </div>
      <div className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5 opacity-70">{sub}</div>}
    </motion.div>
  );
}

// ─── Commission Config Panel ──────────────────────────────────────────────────
interface CommissionCfg {
  minFeePercent: number;
  maxFeePercent: number;
  defaultFeePercent: number;
  platformFeePct: number;
  consultantFeePct: number;
  payoutDays: number;
}

function CommissionConfig() {
  const [cfg, setCfg] = useState<CommissionCfg>({
    minFeePercent: 5, maxFeePercent: 15, defaultFeePercent: 8,
    platformFeePct: 2, consultantFeePct: 6, payoutDays: 3,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/commission/config')
      .then(r => r.json())
      .then(data => { setCfg(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function update(field: keyof CommissionCfg, val: number) {
    setCfg(prev => {
      const next = { ...prev, [field]: val };
      // Auto-recalculate consultant fee whenever employer fee or platform margin changes
      next.consultantFeePct = Math.max(0, next.defaultFeePercent - next.platformFeePct);
      return next;
    });
  }

  async function handleSave() {
    setError(''); setSaving(true);
    try {
      const res = await fetch('/api/commission/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minFeePercent: cfg.minFeePercent,
          maxFeePercent: cfg.maxFeePercent,
          defaultFeePercent: cfg.defaultFeePercent,
          platformFeePct: cfg.platformFeePct,
          payoutDays: cfg.payoutDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Save failed'); return; }
      setCfg(data.config);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { setError('Network error. Try again.'); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm py-12">
      <Loader2 size={16} className="animate-spin" /> Loading commission config…
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Live Preview Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Fee Preview</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Employer Pays</p>
            <p className="text-3xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              {cfg.defaultFeePercent}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">of candidate CTC</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-xs text-muted-foreground mb-1">TRICCI Keeps</p>
            <p className="text-3xl font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
              {cfg.platformFeePct}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">platform margin</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Consultant Earns</p>
            <p className="text-3xl font-black text-secondary" style={{ fontFamily: 'var(--font-heading)' }}>
              {cfg.consultantFeePct}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">shown on portal</p>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden flex">
          <div className="h-full bg-secondary transition-all duration-300"
            style={{ width: `${(cfg.consultantFeePct / cfg.defaultFeePercent) * 100}%` }} />
          <div className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(cfg.platformFeePct / cfg.defaultFeePercent) * 100}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Consultant {cfg.consultantFeePct}%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> TRICCI {cfg.platformFeePct}%</span>
        </div>
      </div>

      {/* Employer Fee Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div>
          <h3 className="font-black text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
            <Percent size={16} className="text-primary" /> Employer Placement Fee
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            The fee % charged to employers on successful placement. Consultants see their share automatically.
          </p>
        </div>

        {/* Default fee slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-foreground">Default Fee % (per job)</label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={cfg.minFeePercent} max={cfg.maxFeePercent} step={0.5}
                value={cfg.defaultFeePercent}
                onChange={e => update('defaultFeePercent', Number(e.target.value))}
                className="w-20 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-center font-black text-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <input type="range" min={cfg.minFeePercent} max={cfg.maxFeePercent} step={0.5}
            value={cfg.defaultFeePercent}
            onChange={e => update('defaultFeePercent', Number(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{cfg.minFeePercent}% (min)</span>
            <span>{cfg.maxFeePercent}% (max)</span>
          </div>
        </div>

        {/* Platform margin slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-foreground">
              TRICCI Platform Margin
              <span className="ml-2 text-xs text-muted-foreground font-normal">(hidden from consultants)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={cfg.defaultFeePercent - 0.5} step={0.5}
                value={cfg.platformFeePct}
                onChange={e => update('platformFeePct', Number(e.target.value))}
                className="w-20 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-center font-black text-primary focus:outline-none focus:border-primary transition-colors"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <input type="range" min={0} max={Math.max(0, cfg.defaultFeePercent - 0.5)} step={0.5}
            value={cfg.platformFeePct}
            onChange={e => update('platformFeePct', Number(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0%</span>
            <span>{(cfg.defaultFeePercent - 0.5).toFixed(1)}%</span>
          </div>
        </div>

        {/* Consultant share — read-only derived */}
        <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Consultant Earns (auto-calculated)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This is what consultants see on the job portal. = Employer fee − TRICCI margin.
              </p>
            </div>
            <p className="text-3xl font-black text-secondary" style={{ fontFamily: 'var(--font-heading)' }}>
              {cfg.consultantFeePct}%
            </p>
          </div>
          <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-secondary/10">
            <Info size={13} className="text-secondary shrink-0 mt-0.5" />
            <p className="text-xs text-secondary/80">
              Consultants only ever see <strong>{cfg.consultantFeePct}%</strong> — the platform margin is never disclosed.
              Changing the employer fee or platform margin above will update this value instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Fee Range Bounds */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Allowed Fee Range</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Employers can only set fees within this range when posting jobs.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Minimum Fee %</label>
            <input type="number" min={1} max={10} step={0.5} value={cfg.minFeePercent}
              onChange={e => update('minFeePercent', Number(e.target.value))}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Maximum Fee %</label>
            <input type="number" min={10} max={25} step={0.5} value={cfg.maxFeePercent}
              onChange={e => update('maxFeePercent', Number(e.target.value))}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Payout SLA */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Consultant Payout SLA</h3>
          <p className="text-sm text-muted-foreground mt-1">Maximum business days to process consultant payouts after candidate joining.</p>
        </div>
        <div className="max-w-xs">
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Business Days</label>
          <input type="number" min={1} max={14} value={cfg.payoutDays}
            onChange={e => update('payoutDays', Number(e.target.value))}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
        </div>
      </div>

      {/* Save */}
      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save Configuration</>}
        </button>
        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-sm text-green-400 font-semibold">
              <CheckCircle size={15} /> Saved! Consultant portal updated instantly.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── User Profile Drawer ──────────────────────────────────────────────────────
interface UserDetail {
  user: LiveUser & { role: string };
  profile: Record<string, unknown> | null;
}

function UserProfileDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then(r => r.json())
      .then(data => { setDetail(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-md bg-card border-l border-border overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>User Profile</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm p-8">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground p-8">Could not load user details.</p>
        ) : (
          <div className="p-5 space-y-5">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white shrink-0"
                style={{ background: detail.user.role === 'employer' ? '#35c9ff30' : detail.user.role === 'consultant' ? '#FF6B3530' : detail.user.role === 'admin' ? '#ef444430' : '#22c55e30', color: detail.user.role === 'employer' ? '#35c9ff' : detail.user.role === 'consultant' ? '#FF6B35' : detail.user.role === 'admin' ? '#ef4444' : '#22c55e' }}>
                {detail.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-black text-foreground">{detail.user.name}</p>
                <p className="text-sm text-muted-foreground">{detail.user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <TypeBadge type={detail.user.role} />
                  <StatusBadge status={getLiveUserStatus(detail.user)} />
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Account Details</h4>
              {[
                { label: 'User ID', value: detail.user.id },
                { label: 'Role', value: detail.user.role },
                { label: 'Email Verified', value: detail.user.emailVerified ? 'Yes' : 'No' },
                { label: 'Joined', value: new Date(detail.user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold text-foreground text-right max-w-[60%] truncate">{value}</span>
                </div>
              ))}
            </div>

            {/* Role-specific profile */}
            {detail.profile && (
              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {detail.user.role === 'candidate' ? 'Candidate Profile' : detail.user.role === 'employer' ? 'Employer Profile' : 'Consultant Profile'}
                </h4>
                {detail.user.role === 'candidate' && (() => {
                  const p = detail.profile as Record<string, unknown>;
                  return (
                    <>
                      {[
                        { label: 'Job Title', value: String(p.currentTitle ?? '—') },
                        { label: 'Location', value: String(p.location ?? '—') },
                        { label: 'Phone', value: String(p.phone ?? '—') },
                        { label: 'Mobile Verified', value: p.mobileVerified ? 'Yes ✓' : 'No' },
                        { label: 'Current CTC', value: p.currentCTC ? `₹${(Number(p.currentCTC) / 100000).toFixed(1)} LPA` : '—' },
                        { label: 'Expected CTC', value: p.expectedCTC ? `₹${(Number(p.expectedCTC) / 100000).toFixed(1)} LPA` : '—' },
                        { label: 'Experience', value: p.totalExperience ? `${p.totalExperience} yrs` : '—' },
                        { label: 'Notice Period', value: p.noticePeriod ? `${p.noticePeriod} days` : '—' },
                        { label: 'Profile Complete', value: `${p.profileComplete ?? 0}%` },
                        { label: 'CV Uploaded', value: p.cvUrl ? 'Yes' : 'No' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-semibold text-foreground">{value}</span>
                        </div>
                      ))}
                      {p.cvUrl && (
                        <a href={String(p.cvUrl)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors w-fit">
                          <Download size={12} /> Download CV
                        </a>
                      )}
                    </>
                  );
                })()}
                {detail.user.role === 'employer' && (() => {
                  const p = detail.profile as Record<string, unknown>;
                  return [
                    { label: 'Company', value: String(p.companyName ?? '—') },
                    { label: 'Industry', value: String(p.industry ?? '—') },
                    { label: 'Website', value: String(p.website ?? '—') },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold text-foreground">{value}</span>
                    </div>
                  ));
                })()}
                {detail.user.role === 'consultant' && (() => {
                  const p = detail.profile as Record<string, unknown>;
                  return [
                    { label: 'Specialisation', value: String(p.specialisation ?? '—') },
                    { label: 'Experience', value: p.yearsExperience ? `${p.yearsExperience} yrs` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold text-foreground">{value}</span>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* Quick actions */}
            <div className="flex gap-3">
              <Link to={
                detail.user.role === 'employer' ? '/employer/dashboard' :
                detail.user.role === 'consultant' ? '/consultant/dashboard' :
                detail.user.role === 'candidate' ? '/candidate/profile' : '#'
              } target="_blank"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted border border-border text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors">
                <ExternalLink size={14} /> View Portal
              </Link>
              <button onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                <X size={14} /> Close
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────
function AnalyticsPanel({ stats }: { stats: LiveStats | null }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const revenue = [420000, 680000, 950000, 1100000, 1380000, 1890000];
  const placements = [3, 5, 7, 8, 7, 8];
  const maxRevenue = Math.max(...revenue);
  const total = stats?.totalUsers || 1;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: String(stats?.totalUsers ?? '—'), change: 'live', up: true },
          { label: 'Active Jobs', value: String(stats?.activeJobs ?? '—'), change: 'live', up: true },
          { label: 'Job Alert Subs', value: String(stats?.alertSubscriptions ?? '—'), change: 'live', up: true },
          { label: 'Consultant Activation', value: stats ? `${Math.round((stats.consultants / total) * 100)}%` : '—', change: 'live', up: true },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
            <p className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{kpi.value}</p>
            <p className="text-xs font-semibold mt-1 flex items-center gap-0.5 text-green-400">
              <ArrowUpRight size={12} /> live data
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Platform Revenue (2026)</h3>
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">TRICCI share only · sample data</span>
        </div>
        <div className="flex items-end gap-3 h-40">
          {revenue.map((r, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">
                ₹{(r / 100000).toFixed(1)}L
              </span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(r / maxRevenue) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
                className={`w-full rounded-t-lg ${i === months.length - 1 ? 'bg-primary' : 'bg-primary/40'}`}
              />
              <span className="text-xs text-muted-foreground">{months[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Placements + User Growth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Placements per month */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Placements per Month</h3>
          <div className="flex items-end gap-3 h-28">
            {placements.map((p, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{p}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(p / Math.max(...placements)) * 100}%` }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className={`w-full rounded-t-lg ${i === placements.length - 1 ? 'bg-secondary' : 'bg-secondary/40'}`}
                />
                <span className="text-xs text-muted-foreground">{months[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User breakdown — live */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>User Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Employers', count: stats?.employers ?? 0, color: '#35c9ff' },
              { label: 'Consultants', count: stats?.consultants ?? 0, color: '#FF6B35' },
              { label: 'Candidates', count: stats?.candidates ?? 0, color: '#ffd035' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold text-foreground">{item.count} ({total > 0 ? Math.round(item.count / total * 100) : 0}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Consultants */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Top Performing Consultants</h3>
        </div>
        <div className="p-8 text-center text-muted-foreground text-sm">
          No placement data yet. Consultant rankings will appear here once placements are recorded.
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Demo seed state
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<{ email: string; status: string }[] | null>(null);
  const [seedError, setSeedError] = useState('');

  async function handleSeedDemo() {
    setSeedLoading(true); setSeedError(''); setSeedResult(null);
    try {
      const res = await fetch('/api/admin/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setSeedError(data.error ?? 'Failed to seed demo accounts.'); return; }
      setSeedResult(data.accounts);
    } catch {
      setSeedError('Something went wrong. Please try again.');
    } finally {
      setSeedLoading(false);
    }
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create admin.'); return; }
      setSuccess(`Admin account created for ${email}.`);
      setName(''); setEmail(''); setPassword('');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const ROLE_LINKS = [
    { label: 'Employer Dashboard', href: '/employer/dashboard', icon: Building2, color: '#35c9ff' },
    { label: 'Consultant Dashboard', href: '/consultant/dashboard', icon: Star, color: '#FF6B35' },
    { label: 'Candidate Profile', href: '/candidate/profile', icon: UserCheck, color: '#22c55e' },
    { label: 'Job Listings', href: '/jobs', icon: Briefcase, color: '#ffd035' },
    { label: 'Blog', href: '/blog', icon: TrendingUp, color: '#6B4FBB' },
    { label: 'Let\'s Refresh', href: '/refresh', icon: Zap, color: '#FF6B35' },
  ];

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Quick Navigation */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-black text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
          View as User
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          Jump to any role&rsquo;s dashboard to see exactly what they see. You have admin access to all pages.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ROLE_LINKS.map(({ label, href, icon: Icon, color }) => (
            <Link
              key={href}
              to={href}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-border hover:border-opacity-60 bg-muted/30 hover:bg-muted/60 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: color + '20', border: `1.5px solid ${color}40` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <span className="text-xs font-semibold text-foreground leading-tight">{label}</span>
              <ExternalLink size={11} className="text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Create Admin Account */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <UserPlus size={18} className="text-secondary" />
          <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Create Admin Account
          </h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Add another super-admin. Admin accounts bypass email verification and have full platform access.
        </p>

        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="Rahul Bhatia"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admin Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="admin@tricci.in"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Password (min. 8 chars)</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle size={14} className="text-green-400 shrink-0 mt-0.5" />
              <p className="text-sm text-green-400">{success}</p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : <><UserPlus size={15} /> Create Admin</>}
          </button>
        </form>
      </div>

      {/* UAT Demo Accounts */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <Zap size={18} className="text-primary" />
          <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            UAT Demo Accounts
          </h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Creates one demo account for each role — Employer, Consultant, and Candidate — all with the same password. Safe to run multiple times (idempotent).
        </p>

        {/* Credentials table */}
        <div className="bg-muted/40 border border-border rounded-xl overflow-hidden mb-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Role</th>
                <th className="text-left font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Email</th>
                <th className="text-left font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Password</th>
                <th className="text-left font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Login URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { role: 'Employer', email: 'demo.employer@tricci.in', url: '/signup' },
                { role: 'Consultant', email: 'demo.consultant@tricci.in', url: '/signup' },
                { role: 'Candidate', email: 'demo.candidate@tricci.in', url: '/signup' },
              ].map(row => (
                <tr key={row.role}>
                  <td className="px-4 py-2.5 font-semibold text-foreground">{row.role}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono">{row.email}</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-primary">Demo@1234</td>
                  <td className="px-4 py-2.5">
                    <Link to="/login" className="text-secondary hover:underline flex items-center gap-1">
                      /login <ExternalLink size={10} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {seedError && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{seedError}</p>
          </div>
        )}
        {seedResult && (
          <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 mb-4 space-y-1">
            {seedResult.map(r => (
              <p key={r.email} className="text-xs text-green-400 font-mono">
                {r.status === 'created' ? '✓ Created' : '— Already exists'}: {r.email}
              </p>
            ))}
          </div>
        )}

        <button
          onClick={handleSeedDemo} disabled={seedLoading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {seedLoading ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : <><Zap size={15} /> Create Demo Accounts</>}
        </button>
      </div>

      {/* Audit Log */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-black text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Audit Log</h3>
        <p className="text-sm text-muted-foreground mb-4">Review who did what — job creation, status changes, and notes across the platform.</p>
        <Link to="/admin/audit-log"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm font-semibold hover:bg-muted/70 transition-colors">
          <ClipboardList size={14} /> View Audit Log
        </Link>
      </div>

      {/* Danger Zone */}
      <div className="bg-card border border-red-500/20 rounded-2xl p-6">
        <h3 className="font-black text-red-400 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Sign Out</h3>
        <p className="text-sm text-muted-foreground mb-4">End your current admin session.</p>
        <button
          onClick={async () => { await signOut(); window.location.href = '/admin/login'; }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      {/* Purge Mock Jobs */}
      <PurgeMockJobsCard />
    </div>
  );
}

function PurgeMockJobsCard({ inline = false }: { inline?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function purge() {
    if (!confirm('This will permanently delete all 6 seeded mock jobs from the database. Continue?')) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/purge-mock-jobs', { method: 'POST' });
      const data = await res.json();
      if (res.ok) { setStatus('done'); setMsg(data.message ?? 'Mock jobs removed.'); }
      else { setStatus('error'); setMsg(data.error ?? 'Failed.'); }
    } catch { setStatus('error'); setMsg('Network error.'); }
  }

  // Once done, hide the banner entirely
  if (status === 'done' && inline) return null;

  if (inline) {
    return (
      <div className="flex items-center justify-between gap-4 bg-orange-500/10 border border-orange-500/30 rounded-xl px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shrink-0" />
          <p className="text-sm text-orange-300 font-semibold">
            Mock jobs detected — remove the 6 seeded demo jobs before going live.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {status === 'error' && <p className="text-xs text-red-400">{msg}</p>}
          <button
            onClick={purge}
            disabled={status === 'loading'}
            className="px-4 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold hover:bg-orange-500/30 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {status === 'loading' ? 'Removing…' : 'Remove Now'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-orange-500/20 rounded-2xl p-6">
      <h3 className="font-black text-orange-400 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Remove Mock Jobs</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Delete the 6 seeded demo jobs (Senior PM, Engineering Manager, Data Scientist, VP Sales, Head of Marketing, Finance Controller) from the live database. Run this once before launch.
      </p>
      {status === 'done' ? (
        <p className="text-sm text-green-400 font-semibold">✓ {msg}</p>
      ) : (
        <button
          onClick={purge}
          disabled={status === 'loading'}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-semibold hover:bg-orange-500/20 transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? 'Removing…' : 'Remove Mock Jobs'}
        </button>
      )}
      {status === 'error' && <p className="text-xs text-red-400 mt-2">{msg}</p>}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | UserType>('all');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  // Live data state
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [users, setUsers] = useState<LiveUser[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Jobs state
  const [adminJobs, setAdminJobs] = useState<AdminJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [editingJobFee, setEditingJobFee] = useState<{ id: string; value: string } | null>(null);
  const [savingJobFee, setSavingJobFee] = useState(false);

  // Submissions state
  const [adminSubmissions, setAdminSubmissions] = useState<AdminSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState('all');
  const [updatingSubmissionId, setUpdatingSubmissionId] = useState<number | null>(null);

  // Assessments & Scorecards state
  const [adminAssessments, setAdminAssessments] = useState<{
    id: number; candidateName: string; candidateEmail: string; jobTitle: string;
    type: string; score: number; maxScore: number; status: string; createdAt: string;
  }[]>([]);
  const [adminScorecards, setAdminScorecards] = useState<{
    id: number; candidateName: string; candidateEmail: string; jobTitle: string;
    technicalScore: number; communicationScore: number; cultureFitScore: number;
    leadershipScore: number; overallScore: number; recommendation: string;
    submittedBy: string | null; createdAt: string;
  }[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [assessmentSubTab, setAssessmentSubTab] = useState<'assessments' | 'scorecards'>('assessments');
  const [assessmentSearch, setAssessmentSearch] = useState('');

  // ── Placements state ──────────────────────────────────────────────────────
  const [adminPlacements, setAdminPlacements] = useState<AdminPlacement[]>([]);
  const [placementStats, setPlacementStats] = useState({ totalPlacements: 0, totalRevenueLpa: 0, avgCtcLpa: 0, activeConsultants: 0 });
  const [loadingPlacements, setLoadingPlacements] = useState(false);
  const [placementSearch, setPlacementSearch] = useState('');
  const [placementPage, setPlacementPage] = useState(1);
  const [placementPages, setPlacementPages] = useState(1);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) setStats(await res.json());
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('roleFilter', typeFilter);
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } finally {
      setLoadingUsers(false);
    }
  }, [typeFilter, searchQuery]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const params = new URLSearchParams();
      if (jobSearch) params.set('search', jobSearch);
      if (jobStatusFilter !== 'all') params.set('status', jobStatusFilter);
      const res = await fetch(`/api/admin/jobs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAdminJobs(data.jobs);
      }
    } finally {
      setLoadingJobs(false);
    }
  }, [jobSearch, jobStatusFilter]);

  const fetchSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const params = new URLSearchParams();
      if (submissionSearch) params.set('search', submissionSearch);
      if (submissionStatusFilter !== 'all') params.set('status', submissionStatusFilter);
      const res = await fetch(`/api/admin/submissions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAdminSubmissions(data.submissions);
      }
    } finally {
      setLoadingSubmissions(false);
    }
  }, [submissionSearch, submissionStatusFilter]);

  useEffect(() => {
    if (activeTab === 'jobs') fetchJobs();
  }, [activeTab, fetchJobs]);

  useEffect(() => {
    if (activeTab === 'submissions') fetchSubmissions();
  }, [activeTab, fetchSubmissions]);

  const fetchAssessments = useCallback(async () => {
    setLoadingAssessments(true);
    try {
      const [aRes, sRes] = await Promise.all([
        fetch(`/api/admin/assessments${assessmentSearch ? `?search=${encodeURIComponent(assessmentSearch)}` : ''}`),
        fetch(`/api/admin/scorecards${assessmentSearch ? `?search=${encodeURIComponent(assessmentSearch)}` : ''}`),
      ]);
      if (aRes.ok) { const d = await aRes.json(); setAdminAssessments(d.assessments ?? []); }
      if (sRes.ok) { const d = await sRes.json(); setAdminScorecards(d.scorecards ?? []); }
    } finally {
      setLoadingAssessments(false);
    }
  }, [assessmentSearch]);

  useEffect(() => {
    if (activeTab === 'assessments') fetchAssessments();
  }, [activeTab, fetchAssessments]);

  const fetchPlacements = useCallback(async (page = 1) => {
    setLoadingPlacements(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (placementSearch) params.set('search', placementSearch);
      const res = await fetch(`/api/admin/placements?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAdminPlacements(data.placements ?? []);
        setPlacementStats(data.stats ?? { totalPlacements: 0, totalRevenueLpa: 0, avgCtcLpa: 0, activeConsultants: 0 });
        setPlacementPages(data.pages ?? 1);
        setPlacementPage(page);
      }
    } finally {
      setLoadingPlacements(false);
    }
  }, [placementSearch]);

  useEffect(() => {
    if (activeTab === 'placements') fetchPlacements(1);
  }, [activeTab, fetchPlacements]);

  async function handleSaveJobFee(jobId: string, feePercent: number) {
    setSavingJobFee(true);
    try {
      await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feePercent }),
      });
      setEditingJobFee(null);
      await fetchJobs();
    } finally {
      setSavingJobFee(false);
    }
  }

  async function handleToggleJobStatus(jobId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    await fetch(`/api/admin/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchJobs();
  }

  async function handleUpdateSubmissionStatus(submissionId: number, status: string) {
    setUpdatingSubmissionId(submissionId);
    try {
      await fetch(`/api/admin/submissions/${submissionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await fetchSubmissions();
    } finally {
      setUpdatingSubmissionId(null);
    }
  }

  async function handleSuspend(userId: string) {
    setActionLoading(userId + '-suspend');
    try {
      await fetch(`/api/admin/users/${userId}/suspend`, { method: 'POST' });
      await fetchUsers();
      await fetchStats();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnsuspend(userId: string) {
    setActionLoading(userId + '-unsuspend');
    try {
      await fetch(`/api/admin/users/${userId}/unsuspend`, { method: 'POST' });
      await fetchUsers();
      await fetchStats();
    } finally {
      setActionLoading(null);
    }
  }

  const tabs: { id: TabId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'submissions', label: 'Submissions', icon: FileText },
    { id: 'assessments', label: 'Assessments', icon: ClipboardList },
    { id: 'placements', label: 'Placements', icon: IndianRupee },
    { id: 'approvals', label: 'Approvals', icon: UserCheck },
    { id: 'commission', label: 'Commission', icon: Sliders },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <Helmet>
        <title>Admin Panel — TRICCI</title>
        <meta name="description" content="TRICCI platform administration — user management, commission config, analytics." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://tricci.in/admin" />
        <meta property="og:title" content="Admin Panel — TRICCI" />
        <meta property="og:description" content="TRICCI platform administration." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tricci.in/admin" />
        <meta property="og:image" content="https://tricci.in/api/og?title=Admin+Panel&description=TRICCI+Administration" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://tricci.in/api/og?title=Admin+Panel&description=TRICCI+Administration" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Admin Panel — TRICCI',
          url: 'https://tricci.in/admin',
          description: 'TRICCI platform administration.',
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <h1 className="sr-only">Admin Panel — TRICCI</h1>
        {/* ── User Profile Drawer ── */}
        <AnimatePresence>
          {viewingUserId && (
            <UserProfileDrawer userId={viewingUserId} onClose={() => setViewingUserId(null)} />
          )}
        </AnimatePresence>

        {/* ── Top Bar ── */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-[80px] z-30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Admin Panel</span>
                <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full font-semibold">Super Admin</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { fetchStats(); fetchUsers(); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-muted">
                  <RefreshCw size={12} /> Refresh
                </button>
                <button className="relative w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Bell size={16} />
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'settings' ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                  title="Settings"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={async () => { await signOut(); window.location.href = '/admin/login'; }}
                  className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <h1 className="sr-only">TRICCI Admin Panel</h1>
          {/* ── Tab Nav ── */}
          <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit mb-8 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                <tab.icon size={15} />
                {tab.label}
                {tab.badge && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-8">

                {/* ── Console Quick Access ── */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="font-black text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                    Manage Portals
                  </h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    Jump into any user console to see exactly what they see — or manage their data directly.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        href: '/employer/dashboard', icon: Building2, color: '#35c9ff',
                        label: 'Employer Console', desc: 'View job postings, applicants, fee settings',
                        badge: String(stats?.employers ?? 0) + ' employers',
                      },
                      {
                        href: '/consultant/dashboard', icon: Star, color: '#FF6B35',
                        label: 'Consultant Console', desc: 'Browse mandates, submissions, earnings',
                        badge: String(stats?.consultants ?? 0) + ' consultants',
                      },
                      {
                        href: '/candidate/profile', icon: UserCheck, color: '#22c55e',
                        label: 'Candidate Console', desc: 'Profile, CV upload, job alerts, AI tools',
                        badge: String(stats?.candidates ?? 0) + ' candidates',
                      },
                    ].map(({ href, icon: Icon, color, label, desc, badge }) => (
                      <Link key={href} to={href} target="_blank"
                        className="group flex flex-col gap-3 p-5 rounded-2xl border border-border hover:border-opacity-60 bg-muted/20 hover:bg-muted/40 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: color + '20', border: `1.5px solid ${color}40` }}>
                            <Icon size={18} style={{ color }} />
                          </div>
                          <ExternalLink size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                          <p className="font-black text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>{label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit"
                          style={{ backgroundColor: color + '15', color }}>
                          {badge}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-3">
                    <button onClick={() => setActiveTab('commission')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                      <Sliders size={13} /> Set Commission Fees
                    </button>
                    <button onClick={() => setActiveTab('users')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors">
                      <Users size={13} /> Manage Users
                    </button>
                    <button onClick={() => setActiveTab('placements')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors">
                      <Briefcase size={13} /> View Placements
                    </button>
                  </div>
                </div>
                {loadingStats ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
                    <Loader2 size={16} className="animate-spin" /> Loading live stats…
                  </div>
                ) : (
                  <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard icon={Users} label="Total Users" value={String(stats?.totalUsers ?? 0)} trend="up" color="#35c9ff" />
                      <StatCard icon={Building2} label="Employers" value={String(stats?.employers ?? 0)} color="#35c9ff" />
                      <StatCard icon={Star} label="Consultants" value={String(stats?.consultants ?? 0)} color="#FF6B35" />
                      <StatCard icon={UserCheck} label="Candidates" value={String(stats?.candidates ?? 0)} color="#22c55e" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard icon={Briefcase} label="Active Jobs" value={String(stats?.activeJobs ?? 0)} color="#ffd035" />
                      <StatCard icon={Bell} label="Job Alert Subs" value={String(stats?.alertSubscriptions ?? 0)} color="#6B4FBB" />
                      <StatCard icon={IndianRupee} label="Total Revenue" value="—" sub="No placements yet" color="#FF6B35" />
                      <StatCard icon={Zap} label="MRR" value="—" sub="No placements yet" color="#22c55e" />
                    </div>
                  </>
                )}

                {/* Recent Signups */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Recent Signups</h3>
                    <button onClick={() => setActiveTab('users')} className="text-xs text-primary font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                      View all <ChevronRight size={13} />
                    </button>
                  </div>
                  {loadingUsers ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm p-6">
                      <Loader2 size={14} className="animate-spin" /> Loading…
                    </div>
                  ) : users.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6">No users yet. Share the signup link to get started.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {users.slice(0, 6).map(u => (
                        <div key={u.id} className="flex items-center gap-3 px-6 py-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black text-white"
                            style={{ background: u.role === 'employer' ? '#35c9ff30' : u.role === 'consultant' ? '#FF6B3530' : '#22c55e30', color: u.role === 'employer' ? '#35c9ff' : u.role === 'consultant' ? '#FF6B35' : '#22c55e' }}>
                            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                          <TypeBadge type={u.role} />
                          <StatusBadge status={getLiveUserStatus(u)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── USERS ── */}
            {activeTab === 'users' && (
              <motion.div key="users" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div className="flex gap-2">
                    {(['all', 'employer', 'consultant', 'candidate'] as const).map(t => (
                      <button key={t} onClick={() => setTypeFilter(t)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${
                          typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        }`}>
                        {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  {loadingUsers ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm p-8">
                      <Loader2 size={16} className="animate-spin" /> Loading users…
                    </div>
                  ) : users.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-muted-foreground">No users found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-4">User</th>
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden sm:table-cell">Role</th>
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden md:table-cell">Joined</th>
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4">Status</th>
                            <th className="px-4 py-4" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {users.map(u => {
                            const status = getLiveUserStatus(u);
                            const isBusy = actionLoading === u.id + '-suspend' || actionLoading === u.id + '-unsuspend';
                            return (
                              <tr key={u.id} className="hover:bg-muted/20 transition-colors group">
                                <td className="px-6 py-4">
                                  <p className="text-sm font-semibold text-foreground">{u.name}</p>
                                  <p className="text-xs text-muted-foreground">{u.email}</p>
                                </td>
                                <td className="px-4 py-4 hidden sm:table-cell"><TypeBadge type={u.role} /></td>
                                <td className="px-4 py-4 text-xs text-muted-foreground hidden md:table-cell">
                                  {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-4"><StatusBadge status={status} /></td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => setViewingUserId(u.id)}
                                      className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                      title="View profile"
                                    >
                                      <Eye size={12} />
                                    </button>
                                    {!u.isAdmin && (
                                      status === 'active' ? (
                                        <button onClick={() => handleSuspend(u.id)} disabled={isBusy}
                                          className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                                          {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
                                        </button>
                                      ) : (
                                        <button onClick={() => handleUnsuspend(u.id)} disabled={isBusy}
                                          className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50">
                                          {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
                                        </button>
                                      )
                                    )}
                                    <button className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                                      <MoreHorizontal size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── JOBS ── */}
            {activeTab === 'jobs' && (
              <motion.div key="jobs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">

                {/* Remove Mock Jobs banner */}
                <PurgeMockJobsCard inline />

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={jobSearch} onChange={e => setJobSearch(e.target.value)}
                      placeholder="Search by title, company, location..."
                      className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div className="flex gap-2">
                    {(['all', 'active', 'closed'] as const).map(s => (
                      <button key={s} onClick={() => setJobStatusFilter(s)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${
                          jobStatusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        }`}>
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  {loadingJobs ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm p-8">
                      <Loader2 size={16} className="animate-spin" /> Loading jobs…
                    </div>
                  ) : adminJobs.length === 0 ? (
                    <div className="p-8 text-center">
                      <Briefcase size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-muted-foreground">No jobs found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-4">Role / Company</th>
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden md:table-cell">Posted By</th>
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden sm:table-cell">CTC</th>
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4">Fee %</th>
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden sm:table-cell">Status</th>
                            <th className="px-4 py-4" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {adminJobs.map(j => (
                            <tr key={j.id} className="hover:bg-muted/20 transition-colors group">
                              <td className="px-6 py-4">
                                <p className="text-sm font-semibold text-foreground">{j.title}</p>
                                <p className="text-xs text-muted-foreground">{j.company} · {j.location}</p>
                              </td>
                              <td className="px-4 py-4 hidden md:table-cell">
                                {j.employerName ? (
                                  <div>
                                    <p className="text-xs font-semibold text-foreground">{j.employerName}</p>
                                    <p className="text-xs text-muted-foreground">{j.employerEmail}</p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Legacy / unknown</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-xs text-muted-foreground hidden sm:table-cell">{j.ctcLabel}</td>
                              <td className="px-4 py-4">
                                {editingJobFee?.id === j.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number" min={1} max={25} step={0.5}
                                      value={editingJobFee.value}
                                      onChange={e => setEditingJobFee({ id: j.id, value: e.target.value })}
                                      className="w-16 bg-background border border-primary rounded-lg px-2 py-1 text-xs text-foreground text-center focus:outline-none"
                                      autoFocus
                                    />
                                    <span className="text-xs text-muted-foreground">%</span>
                                    <button
                                      onClick={() => handleSaveJobFee(j.id, Number(editingJobFee.value))}
                                      disabled={savingJobFee}
                                      className="w-6 h-6 rounded-md bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/30 transition-colors"
                                    >
                                      {savingJobFee ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                    </button>
                                    <button
                                      onClick={() => setEditingJobFee(null)}
                                      className="w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                                      {j.feePercent}%
                                    </span>
                                    <button
                                      onClick={() => setEditingJobFee({ id: j.id, value: String(j.feePercent) })}
                                      className="w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground flex items-center justify-center"
                                      title="Edit fee %"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 hidden sm:table-cell">
                                <button
                                  onClick={() => handleToggleJobStatus(j.id, j.status)}
                                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                                    j.status === 'active'
                                      ? 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30'
                                      : 'bg-muted text-muted-foreground border-border hover:bg-green-500/15 hover:text-green-400 hover:border-green-500/30'
                                  }`}
                                  title={j.status === 'active' ? 'Click to close' : 'Click to reopen'}
                                >
                                  {j.status === 'active' ? 'Active' : 'Closed'}
                                </button>
                              </td>
                              <td className="px-4 py-4">
                                <Link to={`/jobs/${j.id}`} target="_blank"
                                  className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
                                  <ExternalLink size={12} />
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── SUBMISSIONS ── */}
            {activeTab === 'submissions' && (
              <motion.div key="submissions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={submissionSearch} onChange={e => setSubmissionSearch(e.target.value)}
                      placeholder="Search by candidate, job, or consultant..."
                      className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(['all', 'pending', 'shortlisted', 'rejected', 'placed'] as const).map(s => (
                      <button key={s} onClick={() => setSubmissionStatusFilter(s)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${
                          submissionStatusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        }`}>
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  {loadingSubmissions ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm p-8">
                      <Loader2 size={16} className="animate-spin" /> Loading submissions…
                    </div>
                  ) : adminSubmissions.length === 0 ? (
                    <div className="p-8 text-center">
                      <FileText size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-semibold text-foreground mb-1">No submissions yet</p>
                      <p className="text-xs text-muted-foreground">Consultant submissions will appear here once they start submitting candidates.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-4">Candidate</th>
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden md:table-cell">Job / Company</th>
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden lg:table-cell">Consultant</th>
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4">CV</th>
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4">Status</th>
                            <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden sm:table-cell">Submitted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {adminSubmissions.map(s => (
                            <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-sm font-semibold text-foreground">{s.candidateName}</p>
                                <p className="text-xs text-muted-foreground">{s.candidateEmail}</p>
                                {s.candidatePhone && <p className="text-xs text-muted-foreground">{s.candidatePhone}</p>}
                              </td>
                              <td className="px-4 py-4 hidden md:table-cell">
                                <p className="text-sm font-semibold text-foreground">{s.jobTitle ?? '—'}</p>
                                <p className="text-xs text-muted-foreground">{s.jobCompany ?? ''}{s.jobCtcLabel ? ` · ${s.jobCtcLabel}` : ''}</p>
                                {s.jobFeePercent && <p className="text-xs text-primary font-semibold">Fee: {s.jobFeePercent}%</p>}
                              </td>
                              <td className="px-4 py-4 hidden lg:table-cell">
                                <p className="text-xs font-semibold text-foreground">{s.consultantName ?? '—'}</p>
                                <p className="text-xs text-muted-foreground">{s.consultantEmail ?? ''}</p>
                              </td>
                              <td className="px-4 py-4">
                                {s.cvUrl ? (
                                  <a href={s.cvUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                                    <Download size={12} /> CV
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <select
                                  value={s.status}
                                  disabled={updatingSubmissionId === s.id}
                                  onChange={e => handleUpdateSubmissionStatus(s.id, e.target.value)}
                                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border bg-card text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer ${
                                    s.status === 'placed' ? 'border-green-500/40 text-green-400' :
                                    s.status === 'shortlisted' ? 'border-secondary/40 text-secondary' :
                                    s.status === 'rejected' ? 'border-red-500/40 text-red-400' :
                                    'border-border text-muted-foreground'
                                  }`}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="shortlisted">Shortlisted</option>
                                  <option value="rejected">Rejected</option>
                                  <option value="placed">Placed ✓</option>
                                </select>
                              </td>
                              <td className="px-4 py-4 text-xs text-muted-foreground hidden sm:table-cell">
                                {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── PLACEMENTS ── */}
            {activeTab === 'placements' && (
              <motion.div key="placements" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Placements</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">All confirmed placements — auto-recorded when a submission reaches Payment Done</p>
                  </div>
                  <button onClick={() => fetchPlacements(placementPage)} className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw size={14} className={loadingPlacements ? 'animate-spin' : ''} />
                  </button>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Placements', value: placementStats.totalPlacements, fmt: (v: number) => String(v), color: '#E8470A' },
                    { label: 'Total Revenue', value: placementStats.totalRevenueLpa, fmt: (v: number) => `₹${v.toFixed(1)}L`, color: '#22c55e' },
                    { label: 'Avg Candidate CTC', value: placementStats.avgCtcLpa, fmt: (v: number) => v ? `${v.toFixed(1)} LPA` : '—', color: '#6B4FBB' },
                    { label: 'Active Consultants', value: placementStats.activeConsultants, fmt: (v: number) => String(v), color: '#3b82f6' },
                  ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                      <p className="text-2xl font-black" style={{ fontFamily: 'var(--font-heading)', color: s.color }}>{s.fmt(s.value)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={placementSearch}
                    onChange={e => { setPlacementSearch(e.target.value); }}
                    onKeyDown={e => e.key === 'Enter' && fetchPlacements(1)}
                    placeholder="Search by candidate, company, job title, consultant…"
                    className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Table */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  {loadingPlacements ? (
                    <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>
                  ) : adminPlacements.length === 0 ? (
                    <div className="py-16 text-center">
                      <ClipboardList size={36} className="mx-auto text-muted-foreground mb-3 opacity-40" />
                      <p className="text-muted-foreground text-sm font-medium">No placements recorded yet</p>
                      <p className="text-muted-foreground text-xs mt-1">Placements are auto-recorded when a submission reaches <strong>Payment Done</strong> status</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Candidate</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role / Company</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Consultant</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">CTC</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Placed On</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {adminPlacements.map(p => (
                            <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-foreground">{p.candidateName}</p>
                                <p className="text-xs text-muted-foreground">{p.candidateEmail}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-foreground">{p.jobTitle}</p>
                                <p className="text-xs text-muted-foreground">{p.companyName}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-foreground">{p.consultantName ?? <span className="text-muted-foreground italic">—</span>}</p>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-foreground font-medium">{p.ctcLpa ? `${p.ctcLpa.toFixed(1)} LPA` : '—'}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {p.feeAmountLpa ? (
                                  <div>
                                    <p className="text-foreground font-semibold">₹{p.feeAmountLpa.toFixed(2)}L</p>
                                    <p className="text-xs text-muted-foreground">{p.feePercent}%</p>
                                  </div>
                                ) : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${p.paymentStatus === 'paid' ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'}`}>
                                  {p.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(p.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {placementPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button disabled={placementPage <= 1} onClick={() => fetchPlacements(placementPage - 1)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
                      Previous
                    </button>
                    <span className="text-xs text-muted-foreground">Page {placementPage} of {placementPages}</span>
                    <button disabled={placementPage >= placementPages} onClick={() => fetchPlacements(placementPage + 1)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
                      Next
                    </button>
                  </div>
                )}

              </motion.div>
            )}

            {/* ── ASSESSMENTS ── */}
            {activeTab === 'assessments' && (
              <motion.div key="assessments" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Assessments & Scorecards</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">All assessments and panel scorecards across every employer</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-muted border border-border rounded-xl p-1">
                      {(['assessments', 'scorecards'] as const).map(t => (
                        <button key={t} onClick={() => setAssessmentSubTab(t)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${assessmentSubTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                          {t} <span className="ml-1 opacity-60">{t === 'assessments' ? adminAssessments.length : adminScorecards.length}</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => fetchAssessments()} className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors">
                      <RefreshCw size={14} className={loadingAssessments ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={assessmentSearch} onChange={e => setAssessmentSearch(e.target.value)}
                    placeholder="Search by candidate name, email, job title…"
                    className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Assessments', value: adminAssessments.length, color: '#6B4FBB' },
                    { label: 'Completed', value: adminAssessments.filter(a => a.status === 'completed').length, color: '#22c55e' },
                    { label: 'Pending', value: adminAssessments.filter(a => a.status === 'pending').length, color: '#eab308' },
                    { label: 'Scorecards', value: adminScorecards.length, color: '#E8470A' },
                  ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)', color: s.color }}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Assessments table */}
                {assessmentSubTab === 'assessments' && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    {loadingAssessments ? (
                      <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>
                    ) : adminAssessments.length === 0 ? (
                      <div className="py-16 text-center">
                        <ClipboardList size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                        <p className="text-sm font-semibold text-muted-foreground">No assessments found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-3">Candidate</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Type</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Score</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Status</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {adminAssessments.map(a => (
                              <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="font-semibold text-foreground text-sm">{a.candidateName}</p>
                                  <p className="text-xs text-muted-foreground">{a.candidateEmail}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{a.jobTitle}</p>
                                </td>
                                <td className="px-4 py-4 text-sm text-foreground hidden md:table-cell">{a.type}</td>
                                <td className="px-4 py-4">
                                  {a.status === 'completed' ? (
                                    <span className="text-sm font-black text-foreground">{a.score}/{a.maxScore} <span className="text-xs text-muted-foreground font-normal">({Math.round((a.score / a.maxScore) * 100)}%)</span></span>
                                  ) : <span className="text-xs text-muted-foreground">—</span>}
                                </td>
                                <td className="px-4 py-4 hidden sm:table-cell">
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                    a.status === 'completed' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                                    a.status === 'pending' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                                    'bg-red-500/15 text-red-400 border-red-500/30'}`}>{a.status}</span>
                                </td>
                                <td className="px-4 py-4 text-xs text-muted-foreground hidden lg:table-cell">
                                  {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Scorecards table */}
                {assessmentSubTab === 'scorecards' && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    {loadingAssessments ? (
                      <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>
                    ) : adminScorecards.length === 0 ? (
                      <div className="py-16 text-center">
                        <TrendingUp size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                        <p className="text-sm font-semibold text-muted-foreground">No scorecards found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-3">Candidate</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Interviewer</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Overall</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Recommendation</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {adminScorecards.map(sc => (
                              <tr key={sc.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="font-semibold text-foreground text-sm">{sc.candidateName}</p>
                                  <p className="text-xs text-muted-foreground">{sc.candidateEmail}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{sc.jobTitle}</p>
                                </td>
                                <td className="px-4 py-4 text-sm text-muted-foreground hidden md:table-cell">{sc.submittedBy ?? '—'}</td>
                                <td className="px-4 py-4">
                                  <span className="text-xl font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>{sc.overallScore}</span>
                                  <span className="text-xs text-muted-foreground ml-1">/100</span>
                                </td>
                                <td className="px-4 py-4 hidden sm:table-cell">
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                    sc.recommendation === 'strong_yes' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                                    sc.recommendation === 'yes' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                                    sc.recommendation === 'maybe' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                                    'bg-red-500/15 text-red-400 border-red-500/30'}`}>
                                    {sc.recommendation === 'strong_yes' ? 'Strong Yes' : sc.recommendation === 'yes' ? 'Yes' : sc.recommendation === 'maybe' ? 'Maybe' : 'No'}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-xs text-muted-foreground hidden lg:table-cell">
                                  {new Date(sc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── APPROVALS ── */}
            {activeTab === 'approvals' && (
              <motion.div key="approvals" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-2 p-4 rounded-xl bg-secondary/10 border border-secondary/20">
                  <Clock size={15} className="text-secondary shrink-0" />
                  <p className="text-sm text-muted-foreground">Manual approval queue — coming soon. For now, all verified accounts are auto-approved.</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-8 text-center">
                  <CheckCircle size={32} className="text-green-400 mx-auto mb-3 opacity-60" />
                  <p className="text-sm font-semibold text-foreground mb-1">No pending approvals</p>
                  <p className="text-xs text-muted-foreground">Accounts are activated automatically after email verification.</p>
                </div>
              </motion.div>
            )}

            {/* ── COMMISSION ── */}
            {activeTab === 'commission' && (
              <motion.div key="commission" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                <CommissionConfig />
              </motion.div>
            )}

            {/* ── ANALYTICS ── */}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                <AnalyticsPanel stats={stats} />
              </motion.div>
            )}

            {/* ── SETTINGS ── */}
            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                <SettingsPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
