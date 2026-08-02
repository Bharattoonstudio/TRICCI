import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase, Plus, Users, CheckCircle, ChevronRight, TrendingUp,
  IndianRupee, Eye, Send, MoreHorizontal, Search, Filter,
  Bell, Settings, ArrowUpRight, ArrowDownRight, Star, MapPin,
  Building2, ChevronDown, Mail, ClipboardList,
  BarChart3, Award, FileText, Download, Loader2, XCircle, X,
  Phone, CheckCircle2, UserCheck, UserX, Wallet,
} from 'lucide-react';
import PostJobModal from './components/PostJobModal.js';
import ATSInterviewPanel from './components/ATSInterviewPanel.js';
import ATSAssessments from './components/ATSAssessments.js';
import ATSSelectedCandidates from './components/ATSSelectedCandidates.js';
import ATSOffers from './components/ATSOffers.js';
import ATSPipelineStepper from './components/ATSPipelineStepper.js';
import type { ATSStage } from './components/ATSPipelineStepper.js';
import ReportsDashboard from './components/ReportsDashboard.js';
import EmailTemplateModal from './components/EmailTemplateModal.js';
import AccountDetails from '@/components/shared/AccountDetails';
import AgreementGate from '@/components/shared/AgreementGate';
import RejectReasonModal from '@/components/shared/RejectReasonModal';
import JobSubmissionsDrilldown from '@/components/shared/JobSubmissionsDrilldown';
import WalletPanel from '@/components/employer/WalletPanel';
import { authClient } from '@/lib/auth/auth-client';
import type { DashboardJob, JobStatus } from './components/types.js';

// ─── Sub-components ──────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
}
function maskPhone(phone: string): string {
  return phone.replace(/(\d{2})\d+(\d{2})/, '$1******$2');
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
    closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border' },
    paused: { label: 'Paused', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
    draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
  };
  const s = map[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.className}`}>{s.label}</span>;
}

function PriorityFlames({ priority, onChange, editable }: { priority: number; onChange?: (p: number) => void; editable?: boolean }) {
  const label = priority === 3 ? 'Very Urgent — Burning' : priority === 2 ? 'Urgent' : 'Normal';
  return (
    <div className="flex items-center gap-0.5" title={label}>
      {[1, 2, 3].map((level) => (
        <button
          key={level}
          type="button"
          disabled={!editable}
          onClick={() => editable && onChange?.(level)}
          className={`text-sm ${editable ? 'cursor-pointer hover:scale-110 transition' : 'cursor-default'} ${level <= priority ? 'opacity-100' : 'opacity-20'}`}
        >
          🔥
        </button>
      ))}
    </div>
  );
}

function JobActionButtons({ job, onStatusChange }: { job: DashboardJob; onStatusChange: (jobId: string | number, newStatus: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {job.status === 'active' && (
        <button
          onClick={() => onStatusChange(job.id, 'paused')}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition"
        >
          Pause
        </button>
      )}
      {job.status === 'paused' && (
        <button
          onClick={() => onStatusChange(job.id, 'active')}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition"
        >
          Reopen
        </button>
      )}
      {job.status !== 'closed' && (
        <button
          onClick={() => { if (confirm('Close this job? It will stop accepting new applications.')) onStatusChange(job.id, 'closed'); }}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
        >
          Close
        </button>
      )}
      {job.status === 'closed' && (
        <button
          onClick={() => onStatusChange(job.id, 'active')}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition"
        >
          Reopen
        </button>
      )}
    </div>
  );
}


function StatCard({ icon: Icon, label, value, sub, trend, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; trend?: 'up' | 'down'; color: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20', border: `1.5px solid ${color}40` }}>
          <Icon size={20} style={{ color }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend === 'up' ? '+12%' : '-3%'}
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1 opacity-70">{sub}</div>}
    </motion.div>
  );
}

// ─── Job Preview Modal ────────────────────────────────────────────────────────
function JobPreviewModal({ job, onClose, onEmailTemplate }: { job: DashboardJob; onClose: () => void; onEmailTemplate: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-primary" />
            <span className="text-sm font-bold text-foreground">Job Preview</span>
            {job.jobCode && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono font-semibold">{job.jobCode}</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ml-1 ${job.status === 'active' ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-muted text-muted-foreground border-border'}`}>
              {job.status === 'active' ? 'Live' : job.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEmailTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors">
              <Mail size={12} /> Email Admin
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{job.title}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1.5"><Building2 size={13} /> {job.department || 'N/A'}</span>
              <span className="flex items-center gap-1.5"><MapPin size={13} /> {job.location}</span>
              <span className="flex items-center gap-1.5"><IndianRupee size={13} /> {job.ctc}</span>
              <span className="flex items-center gap-1.5"><Star size={13} /> {job.fee}% placement fee</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Applicants', value: job.applicants },
              { label: 'Shortlisted', value: job.shortlisted },
              { label: 'Posted', value: `${job.postedDays}d ago` },
            ].map(s => (
              <div key={s.label} className="bg-muted/40 border border-border rounded-xl p-3 text-center">
                <p className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {job.description && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p>
            </div>
          )}

          {job.skills && job.skills.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-primary/8 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
            <IndianRupee size={16} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">Placement Fee: {job.fee}% of first-year CTC</p>
              <p className="text-xs text-muted-foreground mt-0.5">Payable only on successful placement. No upfront cost.</p>
            </div>
          </div>

          {job.interviewRounds && job.interviewRounds.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Interview Process</p>
              <div className="space-y-2">
                {job.interviewRounds.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{r.label}</p>
                      {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-muted/40 border border-border rounded-xl p-4 text-center">
            <a href={`/jobs/${job.id}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:opacity-80 transition-opacity">
              View Public Job Page <ArrowUpRight size={13} />
            </a>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose}
            className="w-full py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Jobs Dropdown Nav ────────────────────────────────────────────────────────
type JobsSubView = 'all_jobs' | 'requisitions' | 'consultants' | 'job_pages';

function DropdownNav<T extends string>({
  options, value, onChange,
}: { options: { id: T; label: string; icon: React.ElementType }[]; value: T; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.id === value)!;
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold text-foreground hover:border-primary/40 transition-colors">
        <current.icon size={14} className="text-primary" />
        {current.label}
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-20 min-w-[180px] overflow-hidden"
          >
            {options.map(opt => (
              <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold transition-colors text-left ${value === opt.id ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>
                <opt.icon size={14} className={value === opt.id ? 'text-primary' : 'text-muted-foreground'} />
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
type MainTab = 'overview' | 'jobs' | 'candidates' | 'ats' | 'reports' | 'billing' | 'wallet' | 'account';
type ATSSubTab = ATSStage;

interface Submission {
  id: number;
  status: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  cvUrl: string | null;
  coverNote: string | null;
  createdAt: string;
  jobId: string;
  jobTitle: string | null;
  jobCompany: string | null;
  jobLocation: string | null;
  jobCtcLabel: string | null;
  jobFeePercent: number | null;
  consultantId: string | null;
  consultantName: string | null;
  consultantEmail: string | null;
}

export default function EmployerDashboard() {
  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [showPostJob, setShowPostJob] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [liveJobs, setLiveJobs] = useState<DashboardJob[]>([]);
  const [previewJob, setPreviewJob] = useState<DashboardJob | null>(null);
  const [emailTemplateJob, setEmailTemplateJob] = useState<DashboardJob | null>(null);
  const [jobsSubView, setJobsSubView] = useState<JobsSubView>('all_jobs');
  const [atsSubTab, setATSSubTab] = useState<ATSSubTab>('interviews');
  const [atsJobFilter, setAtsJobFilter] = useState<string>('all');
  const [candidatesSubTab, setCandidatesSubTab] = useState<'submissions' | 'direct'>('submissions');

  // Logged-in user's display name (real name/company, replaces hardcoded placeholder)
  const [companyName, setCompanyName] = useState('');

  // Agreement gate — nothing works until this is accepted (SOP cross-cutting rule)
  const [agreementSigned, setAgreementSigned] = useState<boolean | null>(null);
  const [rejectModalAppId, setRejectModalAppId] = useState<number | null>(null);
  const [drilldownJob, setDrilldownJob] = useState<{ id: string; title: string } | null>(null);
  useEffect(() => {
    fetch('/api/employer/agreement')
      .then(r => r.json())
      .then((d: { signed?: boolean }) => setAgreementSigned(!!d.signed))
      .catch(() => setAgreementSigned(false));
  }, []);

  // Submissions (real data from API)
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState('');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<string>('all');
  const [candidateSearch, setCandidateSearch] = useState('');

  // Direct applications (real data from API)
  interface DirectApplication {
    id: number; status: string; appliedAt: string;
    jobId: string; jobTitle: string | null;
    candidateUserId: string; candidateName: string;
    candidateEmail: string | null; candidatePhone: string | null;
    candidateTitle: string | null; candidateCvUrl: string | null;
    candidateSkills?: string[] | null; candidateExperience?: number | null;
    // Unlocked contact (set client-side after shortlisting)
    _unlockedEmail?: string | null;
    _unlockedPhone?: string | null;
    _unlockRequested?: boolean;
    _rejectionReason?: string;
  }
  const [directApplications, setDirectApplications] = useState<DirectApplication[]>([]);
  const [directAppsLoading, setDirectAppsLoading] = useState(false);
  // Track which application IDs are currently being actioned (loading state)
  const [directAppActioning, setDirectAppActioning] = useState<Set<number>>(new Set());

  // CV viewer modal
  const [cvViewer, setCvViewer] = useState<{ name: string; title: string | null; jobTitle: string | null; cvUrl: string; skills?: string[] | null; experience?: number | null } | null>(null);

  // Live stats for overview
  const [overviewStats, setOverviewStats] = useState({
    consultantSubmissions: 0,
    directApplications: 0,
    cvsReceived: 0,
  });

  // Funnel dashboard (point 13)
  const [funnel, setFunnel] = useState<{ cvsReceived: number; seen: number; rejected: number; shortlisted: number; interview: number; selected: number } | null>(null);
  useEffect(() => {
    if (activeTab === 'overview') {
      fetch('/api/employer/funnel').then(r => r.ok ? r.json() : null).then(setFunnel).catch(() => {});
    }
  }, [activeTab]);

  // Notifications (bell dropdown)
  const [notifications, setNotifications] = useState<Array<{ id: number; message: string; link: string | null; read: boolean; createdAt: string }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch { /* silent fail — non-critical */ }
  }

  async function markAllNotificationsRead() {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch { /* silent fail */ }
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Job status (Pause/Close/Reopen) + priority (🔥 burning position) updates
  async function handleJobStatusChange(jobId: string | number, newStatus: string) {
    setLiveJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)));
    try {
      const res = await fetch(`/api/employer/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      alert('Failed to update job status. Please refresh and try again.');
    }
  }

  async function handleJobPriorityChange(jobId: string | number, priority: number) {
    setLiveJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, priority } : j)));
    try {
      await fetch(`/api/employer/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
    } catch {
      alert('Failed to update priority. Please refresh and try again.');
    }
  }

  // Fetch the logged-in user's name/company for the top bar (replaces hardcoded placeholder)
  useEffect(() => {
    authClient.getSession()
      .then((result: { data?: { user?: { name?: string } } | null }) => {
        const u = result?.data?.user;
        if (u?.name) setCompanyName(u.name);
      })
      .catch(() => { /* silent — falls back to default label */ });
  }, []);

  async function fetchDirectApplications() {
    setDirectAppsLoading(true);
    try {
      const res = await fetch('/api/employer/applications');
      if (!res.ok) return;
      const data = await res.json() as { applications: DirectApplication[]; total: number };
      setDirectApplications(data.applications);
      setOverviewStats(prev => ({
        ...prev,
        directApplications: data.total,
        cvsReceived: data.applications.filter(a => a.candidateCvUrl).length,
      }));
    } catch { /* silent */ }
    finally { setDirectAppsLoading(false); }
  }

  async function handleDirectAppStatus(appId: number, status: 'shortlisted' | 'rejected', rejectionReason?: string) {
    setDirectAppActioning(prev => new Set(prev).add(appId));
    try {
      const res = await fetch(`/api/employer/applications/${appId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(rejectionReason ? { rejectionReason } : {}) }),
      });
      if (res.status === 400) {
        const data = await res.json();
        if (data.error === 'rejection_reason_required') {
          setDirectAppActioning(prev => { const s = new Set(prev); s.delete(appId); return s; });
          setRejectModalAppId(appId);
          return;
        }
      }
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; status: string };
      setDirectApplications(prev => prev.map(app =>
        app.id === appId ? { ...app, status: data.status, ...(status === 'rejected' ? { _rejectionReason: rejectionReason } : {}) } : app
      ));
      setRejectModalAppId(null);
    } catch { /* silent */ }
    finally {
      setDirectAppActioning(prev => { const s = new Set(prev); s.delete(appId); return s; });
    }
  }

  async function handleRequestContactUnlock(appId: number) {
    setDirectAppActioning(prev => new Set(prev).add(appId));
    try {
      const res = await fetch(`/api/employer/applications/${appId}/request-unlock`, { method: 'POST' });
      if (res.ok) {
        setDirectApplications(prev => prev.map(app => app.id === appId ? { ...app, _unlockRequested: true } : app));
      }
    } catch { /* silent */ }
    finally {
      setDirectAppActioning(prev => { const s = new Set(prev); s.delete(appId); return s; });
    }
  }

  async function fetchSubmissions() {
    setSubmissionsLoading(true);
    setSubmissionsError('');
    try {
      const res = await fetch('/api/employer/submissions');
      if (!res.ok) throw new Error('Failed to load submissions');
      const data = await res.json() as { submissions: Submission[]; total: number };
      setSubmissions(data.submissions);
      setOverviewStats(prev => ({ ...prev, consultantSubmissions: data.total }));
    } catch {
      setSubmissionsError('Could not load candidate submissions. Please try again.');
    } finally {
      setSubmissionsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'candidates') {
      fetchSubmissions();
      fetchDirectApplications();
    }
  }, [activeTab]);

  // Fetch overview stats on mount
  useEffect(() => {
    fetchSubmissions();
    fetchDirectApplications();
    refreshJobs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateSubmissionStatus(id: number, status: string) {
    try {
      const res = await fetch(`/api/submissions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      // Optimistic update — cast to string so both Submission and SubmissionRecord stay in sync
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    } catch { /* silent — UI stays as-is */ }
  }

  async function refreshJobs() {
    try {
      const res = await fetch('/api/employer/jobs');
      if (!res.ok) return;
      const data = await res.json() as { jobs: Array<{
        id: string; title: string; department: string; location: string;
        ctcLabel: string; feePercent: number; status: string; applicants: number; postedDays: number;
        skills?: string[]; description?: string; interviewRounds?: { label: string; description: string }[];
      }> };
      const mapped: DashboardJob[] = data.jobs.map(j => ({
        id: j.id,
        title: j.title,
        department: j.department,
        location: j.location,
        ctc: j.ctcLabel,
        fee: j.feePercent,
        status: j.status,
        applicants: j.applicants,
        shortlisted: 0,
        postedDays: j.postedDays,
        consultants: 0,
        skills: j.skills,
        description: j.description,
        interviewRounds: j.interviewRounds,
      }));
      setLiveJobs(mapped);
    } catch { /* keep existing */ }
  }

  const filteredJobs = liveJobs.filter(j => {
    const matchSearch = j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const mainTabs: { id: MainTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'ats', label: 'ATS', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'billing', label: 'Billing', icon: IndianRupee },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'account', label: 'My Account', icon: Settings },
  ];

  const jobsNavOptions: { id: JobsSubView; label: string; icon: React.ElementType }[] = [
    { id: 'all_jobs', label: 'All Jobs', icon: Briefcase },
    { id: 'requisitions', label: 'All Requisitions', icon: FileText },
    { id: 'consultants', label: 'Consultants', icon: Users },
    { id: 'job_pages', label: 'Job Pages', icon: ArrowUpRight },
  ];

  return (
    <>
      <Helmet>
        <title>Employer Dashboard — TRICCI</title>
        <meta name="description" content="Manage job postings, review applicants, track ATS pipeline and placement fees on TRICCI." />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href="https://tricci.in/employer/dashboard" />
      </Helmet>

      {/* ── Agreement Gate (blocks everything until accepted) ── */}
      {agreementSigned === false && (
        <AgreementGate
          role="employer"
          endpoint="/api/employer/agreement"
          requireDesignation
          onAccepted={() => setAgreementSigned(true)}
        />
      )}

      {rejectModalAppId !== null && (
        <RejectReasonModal
          onClose={() => setRejectModalAppId(null)}
          onSubmit={(reason) => handleDirectAppStatus(rejectModalAppId, 'rejected', reason)}
        />
      )}

      {drilldownJob && (
        <JobSubmissionsDrilldown
          jobId={drilldownJob.id}
          jobTitle={drilldownJob.title}
          onClose={() => setDrilldownJob(null)}
        />
      )}

      {/* ── CV Viewer Modal ── */}
      <AnimatePresence>
        {cvViewer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setCvViewer(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <div>
                  <p className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{cvViewer.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cvViewer.title && <span>{cvViewer.title} · </span>}
                    Applied for: <span className="text-foreground font-medium">{cvViewer.jobTitle ?? 'Unknown Role'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={cvViewer.cvUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors">
                    <Download size={12} /> Download CV
                  </a>
                  <button onClick={() => setCvViewer(null)}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
              {/* Skills strip */}
              {cvViewer.skills && cvViewer.skills.length > 0 && (
                <div className="px-6 py-3 border-b border-border bg-muted/30 flex flex-wrap gap-1.5 shrink-0">
                  {cvViewer.skills.slice(0, 12).map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{s}</span>
                  ))}
                  {cvViewer.experience != null && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-medium">{cvViewer.experience}y exp</span>
                  )}
                </div>
              )}
              {/* CV iframe */}
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={cvViewer.cvUrl}
                  className="w-full h-full min-h-[500px]"
                  title={`CV — ${cvViewer.name}`}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground py-2 border-t border-border shrink-0">
                Contact details are hidden per platform policy. Use TRICCI messaging to reach candidates.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-background">
        <h1 className="sr-only">Employer Dashboard — TRICCI</h1>

        {/* ── Top Bar ── */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-[80px] z-30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{companyName || 'Your Company'}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Employer</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => { setShowNotifDropdown((v) => !v); if (unreadCount > 0) markAllNotificationsRead(); }}
                    className="relative w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Bell size={16} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </button>
                  {showNotifDropdown && (
                    <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
                      <div className="px-4 py-3 border-b border-border font-semibold text-sm">Notifications</div>
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
                      ) : (
                        notifications.map((n) => (
                          <a
                            key={n.id}
                            href={n.link || '#'}
                            className="block px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                            onClick={() => setShowNotifDropdown(false)}
                          >
                            <p className="text-sm">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                          </a>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => setActiveTab('account')}
                  className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Settings size={16} />
                </button>
                <button onClick={() => setShowPostJob(true)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                  <Plus size={15} /> Post Job
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Welcome Banner ── */}
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #E8470A 0%, #1a0a00 60%, #6B4FBB 100%)' }}>
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(30%, -40%)' }} />
          <div className="container mx-auto px-4 py-10 md:py-14 relative z-10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={15} className="text-green-300" />
                <span className="text-white/70 text-sm font-semibold uppercase tracking-wider">You&rsquo;re in the right place</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                The Right Talent Is Coming Your Way
              </h2>
              <p className="text-white/80 text-base md:text-lg mb-6 leading-relaxed max-w-2xl">
                TRICCI&rsquo;s network of verified consultants is already working on your mandates. You only pay when a position is filled.
              </p>
              <div className="flex flex-wrap gap-4 mb-6">
                {[
                  { label: 'Pay on Success', desc: 'No upfront fees' },
                  { label: 'Verified Consultants', desc: 'Pre-screened network' },
                  { label: 'Transparent Pipeline', desc: 'Real-time tracking' },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
                    <CheckCircle size={14} className="text-green-300 shrink-0" />
                    <div>
                      <p className="text-white font-bold text-sm leading-none">{label}</p>
                      <p className="text-white/60 text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowPostJob(true)}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-primary font-black text-sm hover:bg-white/90 transition-colors shadow-lg">
                <Plus size={16} /> Post a New Job — It&rsquo;s Free
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* ── Main Tab Nav ── */}
          <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit mb-8 overflow-x-auto">
            {mainTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={Briefcase} label="Active Jobs" value={String(liveJobs.filter(j => j.status === 'active').length)} trend="up" color="#FF6B35" />
                  <StatCard icon={Send} label="Consultant Submissions" value={String(overviewStats.consultantSubmissions)} sub="CVs from recruiters" color="#6B4FBB" />
                  <StatCard icon={Users} label="Direct Applications" value={String(overviewStats.directApplications)} sub="Candidate self-apply" color="#35c9ff" />
                  <StatCard icon={FileText} label="CVs Received" value={String(overviewStats.cvsReceived + overviewStats.consultantSubmissions)} sub="Total across all channels" color="#FF6B35" />
                </div>

                {/* Funnel dashboard (point 13) */}
                {funnel && (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Hiring Funnel</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {[
                        { label: 'CVs Received', value: funnel.cvsReceived, color: '#35c9ff' },
                        { label: 'Seen', value: funnel.seen, color: '#6B4FBB' },
                        { label: 'Shortlisted', value: funnel.shortlisted, color: '#E8470A' },
                        { label: 'Interview', value: funnel.interview, color: '#F5A623', note: 'coming soon' },
                        { label: 'Rejected', value: funnel.rejected, color: '#EF4444' },
                        { label: 'Selected', value: funnel.selected, color: '#22C55E' },
                      ].map(stage => (
                        <div key={stage.label} className="text-center">
                          <p className="text-2xl font-black" style={{ color: stage.color, fontFamily: 'var(--font-heading)' }}>{stage.value}</p>
                          <p className="text-[11px] text-muted-foreground font-medium mt-1">{stage.label}</p>
                          {stage.note && <p className="text-[9px] text-muted-foreground/50 mt-0.5">{stage.note}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Active Positions</h3>
                    <button onClick={() => setActiveTab('jobs')} className="text-sm text-primary font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                      View all <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {liveJobs.filter(j => j.status === 'active').map(job => (
                      <div key={String(job.id)} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{job.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {job.jobCode && <span className="text-xs font-mono text-muted-foreground">{job.jobCode}</span>}
                            <span className="text-xs text-muted-foreground">{job.location} · {job.ctc}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <p className="text-sm font-bold text-foreground">{job.applicants}</p>
                            <p className="text-xs text-muted-foreground">applicants</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-primary">{job.consultants}</p>
                            <p className="text-xs text-muted-foreground">consultants</p>
                          </div>
                          <StatusBadge status={job.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Recent Activity</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {submissions.slice(0, 5).map(s => (
                      <div key={s.id} className="flex items-start gap-4 px-6 py-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-accent/15">
                          <Send size={14} className="text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">New candidate submitted for {s.jobTitle || 'a role'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        </div>
                      </div>
                    ))}
                    {submissions.length === 0 && directApplications.length === 0 && (
                      <div className="px-6 py-8 text-center text-muted-foreground text-sm">No recent activity yet.</div>
                    )}
                    {directApplications.slice(0, 3).map(a => (
                      <div key={`da-${a.id}`} className="flex items-start gap-4 px-6 py-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-muted">
                          <Users size={14} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">Direct application for {a.jobTitle || 'a role'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── JOBS TAB ── */}
            {activeTab === 'jobs' && (
              <motion.div key="jobs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                {/* Jobs sub-nav dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <DropdownNav options={jobsNavOptions} value={jobsSubView} onChange={setJobsSubView} />
                  <button onClick={() => setShowPostJob(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
                    <Plus size={15} /> Post New Job
                  </button>
                </div>

                {/* All Jobs view */}
                {jobsSubView === 'all_jobs' && (
                  <>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search jobs..."
                          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {(['all', 'active', 'paused', 'closed'] as const).map(s => (
                          <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:text-foreground'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-4">Position</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden sm:table-cell">Job Code</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden md:table-cell">CTC Range</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden lg:table-cell">Fee %</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4">Applicants</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden md:table-cell">Priority</th>
                              <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden sm:table-cell">Status</th>
                              <th className="px-4 py-4" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {filteredJobs.map(job => (
                              <tr key={String(job.id)} className="hover:bg-muted/20 transition-colors group">
                                <td className="px-6 py-4">
                                  <p className="font-semibold text-foreground text-sm">{job.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">{job.department}</span>
                                    <span className="text-muted-foreground">·</span>
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={10} /> {job.location}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 hidden sm:table-cell">
                                  <span className="text-xs font-mono text-muted-foreground">{job.jobCode || '—'}</span>
                                </td>
                                <td className="px-4 py-4 hidden md:table-cell">
                                  <span className="text-sm text-foreground">{job.ctc}</span>
                                </td>
                                <td className="px-4 py-4 hidden lg:table-cell">
                                  <span className="text-sm font-bold text-primary">{job.fee}%</span>
                                </td>
                                <td className="px-4 py-4">
                                  <button onClick={() => setDrilldownJob({ id: String(job.id), title: job.title })} className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left">
                                    <div>
                                      <span className="text-sm font-bold text-foreground">{job.applicants}</span>
                                      <span className="text-xs text-muted-foreground ml-1">total</span>
                                    </div>
                                    <div className="hidden sm:block">
                                      <span className="text-sm font-bold text-primary">{job.shortlisted}</span>
                                      <span className="text-xs text-muted-foreground ml-1">shortlisted</span>
                                    </div>
                                  </button>
                                </td>
                                <td className="px-4 py-4 hidden md:table-cell">
                                  <PriorityFlames priority={job.priority ?? 1} editable onChange={(p) => handleJobPriorityChange(job.id, p)} />
                                </td>
                                <td className="px-4 py-4 hidden sm:table-cell">
                                  <StatusBadge status={job.status} />
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => setPreviewJob(job)}
                                      className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-colors" title="Preview job">
                                      <Eye size={14} />
                                    </button>
                                    <button onClick={() => setDrilldownJob({ id: String(job.id), title: job.title })}
                                      className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-colors" title="View submissions">
                                      <Users size={14} />
                                    </button>
                                    <button onClick={() => setEmailTemplateJob(job)}
                                      className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-colors" title="Email admin">
                                      <Mail size={14} />
                                    </button>
                                    <JobActionButtons job={job} onStatusChange={handleJobStatusChange} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {filteredJobs.length === 0 && (
                        <div className="py-16 text-center">
                          <Briefcase size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                          <p className="text-muted-foreground text-sm">No jobs match your filters.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Requisitions view */}
                {jobsSubView === 'requisitions' && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-border">
                      <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>All Requisitions</h3>
                      <p className="text-sm text-muted-foreground mt-1">All job requisitions including drafts and closed positions</p>
                    </div>
                    <div className="divide-y divide-border">
                      {liveJobs.map(job => (
                        <div key={String(job.id)} className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors group">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground text-sm">{job.title}</p>
                              {job.jobCode && <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{job.jobCode}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{job.department} · {job.location} · {job.ctc}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={job.status} />
                            <button onClick={() => setPreviewJob(job)} className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-all">
                              <Eye size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consultants view */}
                {jobsSubView === 'consultants' && (
                  <div className="space-y-4">
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h3 className="font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Consultants Working Your Mandates</h3>
                      <div className="space-y-3">
                        {['TalentBridge', 'HireRight India', 'TechRecruit Pro', 'DataHire', 'TopTalent'].map((c, i) => (
                          <div key={c} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center">
                                <span className="text-xs font-black text-secondary">{c[0]}</span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{c}</p>
                                <p className="text-xs text-muted-foreground">{[3, 2, 1, 1, 1][i]} active mandates</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <div>
                                <p className="text-sm font-bold text-foreground">{[5, 3, 2, 1, 2][i]}</p>
                                <p className="text-xs text-muted-foreground">submissions</p>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-primary">{[2, 1, 1, 0, 1][i]}</p>
                                <p className="text-xs text-muted-foreground">shortlisted</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Job Pages view */}
                {jobsSubView === 'job_pages' && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-border">
                      <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Public Job Pages</h3>
                      <p className="text-sm text-muted-foreground mt-1">Direct links to public-facing job listings on TRICCI</p>
                    </div>
                    <div className="divide-y divide-border">
                      {liveJobs.filter(j => j.status === 'active').map(job => (
                        <div key={String(job.id)} className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{job.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{job.jobCode} · {job.location}</p>
                          </div>
                          <a href={`/jobs/${job.id}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity">
                            View Page <ArrowUpRight size={12} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── CANDIDATES TAB ── */}
            {activeTab === 'candidates' && (
              <motion.div key="candidates" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">

                {/* Sub-tab switcher */}
                <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 w-fit">
                  <button onClick={() => setCandidatesSubTab('submissions')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${candidatesSubTab === 'submissions' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    <Send size={14} />
                    Consultant Submissions
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold bg-white/20">{submissions.length}</span>
                  </button>
                  <button onClick={() => setCandidatesSubTab('direct')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${candidatesSubTab === 'direct' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    <Users size={14} />
                    Direct Applications
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold bg-white/20">{directApplications.length}</span>
                  </button>
                </div>

                {/* ── Consultant Submissions sub-tab ── */}
                {candidatesSubTab === 'submissions' && (<>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Consultant Submissions</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {submissionsLoading ? 'Loading…' : `${submissions.length} candidate${submissions.length !== 1 ? 's' : ''} submitted by consultants`}
                    </p>
                  </div>
                  <button onClick={fetchSubmissions} disabled={submissionsLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                    {submissionsLoading ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />}
                    Refresh
                  </button>
                </div>

                {/* Pipeline summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Pending', status: 'pending', color: '#6B4FBB' },
                    { label: 'Shortlisted', status: 'shortlisted', color: '#E8470A' },
                    { label: 'Placed', status: 'placed', color: '#22c55e' },
                    { label: 'Rejected', status: 'rejected', color: '#ef4444' },
                  ].map(s => (
                    <button key={s.status}
                      onClick={() => setSubmissionStatusFilter(submissionStatusFilter === s.status ? 'all' : s.status)}
                      className={`bg-card border rounded-xl p-4 text-center transition-colors ${submissionStatusFilter === s.status ? 'border-primary' : 'border-border hover:border-primary/40'}`}>
                      <p className="text-2xl font-black" style={{ color: s.color, fontFamily: 'var(--font-heading)' }}>
                        {submissions.filter(c => c.status === s.status).length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </button>
                  ))}
                </div>

                {/* Search + filter bar */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={candidateSearch} onChange={e => setCandidateSearch(e.target.value)}
                      placeholder="Search by name, email, or job…"
                      className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  {submissionStatusFilter !== 'all' && (
                    <button onClick={() => setSubmissionStatusFilter('all')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-xs font-semibold text-primary">
                      <XCircle size={12} /> Clear filter
                    </button>
                  )}
                </div>

                {/* Error */}
                {submissionsError && (
                  <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive">
                    <XCircle size={14} /> {submissionsError}
                  </div>
                )}

                {/* Loading skeleton */}
                {submissionsLoading && (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-muted" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-muted rounded w-1/3" />
                            <div className="h-2.5 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submissions list */}
                {!submissionsLoading && (() => {
                  const filtered = submissions.filter(s => {
                    const matchStatus = submissionStatusFilter === 'all' || s.status === submissionStatusFilter;
                    const q = candidateSearch.toLowerCase();
                    const matchSearch = !q ||
                      s.candidateName.toLowerCase().includes(q) ||
                      s.candidateEmail.toLowerCase().includes(q) ||
                      (s.jobTitle ?? '').toLowerCase().includes(q) ||
                      (s.consultantName ?? '').toLowerCase().includes(q);
                    return matchStatus && matchSearch;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-card border border-border rounded-2xl p-12 text-center">
                        <Users size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                        <p className="font-semibold text-foreground">No candidates yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {submissions.length === 0
                            ? 'Consultants will submit candidates here once they find great matches for your jobs.'
                            : 'No candidates match your current filter.'}
                        </p>
                      </div>
                    );
                  }

                  const STATUS_STYLES: Record<string, string> = {
                    pending: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
                    shortlisted: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
                    placed: 'bg-green-500/15 text-green-400 border-green-500/30',
                    rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
                  };

                  return (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="divide-y divide-border">
                        {filtered.map(c => (
                          <div key={c.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/20 transition-colors group">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-sm font-black text-primary">
                                {c.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            </div>

                            {/* Main info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-foreground text-sm">{c.candidateName}</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[c.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                                  {c.status}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {/* Reveal contact only after shortlisting */}
                                {['shortlisted','interview','selected','offered','payment_processed','payment_done'].includes(c.status)
                                  ? <>{c.candidateEmail}{c.candidatePhone ? ` · +91 ${c.candidatePhone}` : ''}</>
                                  : <>{maskEmail(c.candidateEmail)}{c.candidatePhone ? ` · ${maskPhone(c.candidatePhone)}` : ''} <span className="text-[10px] text-muted-foreground/50">(shortlist to reveal)</span></>
                                }
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-0.5">
                                For: <span className="font-medium text-foreground/80">{c.jobTitle ?? c.jobId}</span>
                                {c.jobLocation ? ` · ${c.jobLocation}` : ''}
                              </p>
                              {c.coverNote && (
                                <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">&ldquo;{c.coverNote}&rdquo;</p>
                              )}
                              <p className="text-[10px] text-muted-foreground/50 mt-1">
                                via {c.consultantName ?? 'Consultant'} · {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Download CV */}
                              {c.cvUrl && (
                                <a href={c.cvUrl} target="_blank" rel="noopener noreferrer"
                                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                                  title="Download CV">
                                  <Download size={13} />
                                </a>
                              )}
                              {/* Shortlist */}
                              {c.status === 'pending' && (
                                <button onClick={() => updateSubmissionStatus(c.id, 'shortlisted')}
                                  className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/25 transition-colors"
                                  title="Shortlist">
                                  <CheckCircle size={13} />
                                </button>
                              )}
                              {/* Reject */}
                              {c.status !== 'rejected' && c.status !== 'placed' && (
                                <button onClick={() => updateSubmissionStatus(c.id, 'rejected')}
                                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                  title="Reject">
                                  <XCircle size={13} />
                                </button>
                              )}
                              {/* Mark placed */}
                              {c.status === 'shortlisted' && (
                                <button onClick={() => updateSubmissionStatus(c.id, 'placed')}
                                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-colors"
                                  title="Mark as placed">
                                  <Award size={11} /> Place
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                </>)}

                {/* ── Direct Applications sub-tab ── */}
                {candidatesSubTab === 'direct' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Direct Applications</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {directAppsLoading ? 'Loading…' : `${directApplications.length} candidate${directApplications.length !== 1 ? 's' : ''} applied directly`}
                        </p>
                      </div>
                      <button onClick={fetchDirectApplications} disabled={directAppsLoading}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                        {directAppsLoading ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />}
                        Refresh
                      </button>
                    </div>

                    {directAppsLoading && (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-muted" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 bg-muted rounded w-1/3" />
                                <div className="h-2.5 bg-muted rounded w-1/2" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!directAppsLoading && directApplications.length === 0 && (
                      <div className="bg-card border border-border rounded-2xl p-12 text-center">
                        <Users size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                        <p className="font-semibold text-foreground">No direct applications yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Candidates who apply directly to your jobs will appear here.
                        </p>
                      </div>
                    )}

                    {!directAppsLoading && directApplications.length > 0 && (
                      <div className="space-y-3">
                        {directApplications.map(app => {
                          const isActioning = directAppActioning.has(app.id);
                          const isShortlisted = app.status === 'shortlisted';
                          const isRejected = app.status === 'rejected';
                          const contactUnlocked = isShortlisted && (app._unlockedEmail || app._unlockedPhone);

                          return (
                            <motion.div
                              key={app.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`bg-card border rounded-2xl overflow-hidden transition-colors ${
                                isShortlisted ? 'border-[#E8470A]/40' :
                                isRejected ? 'border-border opacity-60' :
                                'border-border'
                              }`}
                            >
                              {/* Top row: candidate info + status badge */}
                              <div className="flex items-start justify-between px-5 pt-5 pb-3 gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                    isShortlisted ? 'bg-[#E8470A]/15 border border-[#E8470A]/30' : 'bg-primary/10 border border-primary/20'
                                  }`}>
                                    <span className={`text-base font-black ${isShortlisted ? 'text-[#E8470A]' : 'text-primary'}`}>
                                      {app.candidateName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-foreground text-sm truncate">{app.candidateName}</p>
                                    {app.candidateTitle && (
                                      <p className="text-xs text-muted-foreground truncate">{app.candidateTitle}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                      {app.jobTitle ?? '—'} · {new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                                <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                  isShortlisted ? 'bg-[#E8470A]/15 text-[#E8470A] border-[#E8470A]/30' :
                                  isRejected ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                  {isShortlisted ? '⭐ Shortlisted' : isRejected ? 'Not Selected' : 'Applied'}
                                </span>
                              </div>

                              {/* Unlocked contact banner — shown after shortlisting */}
                              {contactUnlocked && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  transition={{ duration: 0.25 }}
                                  className="mx-5 mb-3 rounded-xl bg-[#E8470A]/10 border border-[#E8470A]/25 px-4 py-3"
                                >
                                  <p className="text-xs font-bold text-[#E8470A] mb-2 flex items-center gap-1.5">
                                    <CheckCircle2 size={12} /> Contact Unlocked
                                  </p>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    {app._unlockedEmail && (
                                      <a href={`mailto:${app._unlockedEmail}`}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors">
                                        <Mail size={12} className="text-muted-foreground" />
                                        {app._unlockedEmail}
                                      </a>
                                    )}
                                    {app._unlockedPhone && (
                                      <a href={`tel:+91${app._unlockedPhone}`}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors">
                                        <Phone size={12} className="text-muted-foreground" />
                                        +91 {app._unlockedPhone}
                                      </a>
                                    )}
                                  </div>
                                </motion.div>
                              )}

                              {/* Skills row */}
                              {app.candidateSkills && app.candidateSkills.length > 0 && (
                                <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                                  {app.candidateSkills.slice(0, 6).map(s => (
                                    <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-medium">{s}</span>
                                  ))}
                                  {app.candidateExperience != null && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-medium">{app.candidateExperience}y exp</span>
                                  )}
                                </div>
                              )}

                              {/* Action row */}
                              <div className="flex items-center justify-between px-5 pb-4 pt-1 gap-3 border-t border-border/50 mt-1">
                                <div className="flex items-center gap-2">
                                  {/* View CV */}
                                  {app.candidateCvUrl ? (
                                    <button
                                      onClick={() => {
                                        setCvViewer({
                                          name: app.candidateName,
                                          title: app.candidateTitle,
                                          jobTitle: app.jobTitle,
                                          cvUrl: app.candidateCvUrl!,
                                          skills: app.candidateSkills,
                                          experience: app.candidateExperience,
                                        });
                                        fetch(`/api/employer/applications/${app.id}/view`, { method: 'POST' }).catch(() => {});
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
                                    >
                                      <Eye size={12} /> View CV
                                    </button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/50 px-1">No CV uploaded</span>
                                  )}
                                </div>

                                {/* Shortlist / Reject — only show when status is 'applied' */}
                                {!isShortlisted && !isRejected && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      disabled={isActioning}
                                      onClick={() => setRejectModalAppId(app.id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors disabled:opacity-40"
                                    >
                                      {isActioning ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} />}
                                      Reject
                                    </button>
                                    <button
                                      disabled={isActioning}
                                      onClick={() => handleDirectAppStatus(app.id, 'shortlisted')}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8470A] text-white hover:bg-[#E8470A]/90 text-xs font-bold transition-colors disabled:opacity-40 shadow-sm"
                                    >
                                      {isActioning ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />}
                                      Shortlist
                                    </button>
                                  </div>
                                )}

                                {/* Already shortlisted — contact stays masked until Admin approves an unlock request (points 9-12) */}
                                {isShortlisted && !contactUnlocked && (
                                  app._unlockRequested ? (
                                    <p className="text-xs text-muted-foreground italic">Unlock requested — Admin will release contact details after payment is confirmed.</p>
                                  ) : (
                                    <button
                                      disabled={isActioning}
                                      onClick={() => handleRequestContactUnlock(app.id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8470A]/30 text-[#E8470A] hover:bg-[#E8470A]/10 text-xs font-semibold transition-colors disabled:opacity-40"
                                    >
                                      {isActioning ? <Loader2 size={11} className="animate-spin" /> : null}
                                      Request Contact Unlock
                                    </button>
                                  )
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            )}

            {/* ── ATS TAB ── */}
            {activeTab === 'ats' && (
              <motion.div key="ats" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                {/* Job filter + interview round count */}
                {liveJobs.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Filter by Job</label>
                      <select
                        value={atsJobFilter}
                        onChange={e => setAtsJobFilter(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="all">All Jobs</option>
                        {liveJobs.map(j => (
                          <option key={j.id} value={j.id}>{j.title} — {j.department}</option>
                        ))}
                      </select>
                    </div>
                    {atsJobFilter !== 'all' && (() => {
                      const job = liveJobs.find(j => j.id === atsJobFilter);
                      const roundCount = job?.interviewRounds?.length ?? 0;
                      return roundCount > 0 ? (
                        <div className="sm:mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/10 border border-secondary/30">
                          <span className="text-xs font-bold text-secondary">{roundCount} Interview Round{roundCount !== 1 ? 's' : ''}</span>
                          <span className="text-xs text-muted-foreground">configured for this role</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* ATS pipeline stepper */}
                <ATSPipelineStepper
                  active={atsSubTab}
                  onChange={setATSSubTab}
                  interviewRoundCount={atsJobFilter !== 'all' ? (liveJobs.find(j => j.id === atsJobFilter)?.interviewRounds?.length ?? 0) : undefined}
                />

                {(() => {
                  const filteredSubs = atsJobFilter === 'all'
                    ? submissions
                    : submissions.filter(s => s.jobId === atsJobFilter);
                  const subProps = {
                    submissions: filteredSubs.map(s => ({
                      id: s.id,
                      candidateName: s.candidateName,
                      candidateEmail: s.candidateEmail,
                      candidatePhone: s.candidatePhone,
                      jobTitle: s.jobTitle ?? 'Unknown Role',
                      jobId: s.jobId,
                      consultantName: s.consultantName ?? undefined,
                      cvUrl: s.cvUrl,
                      status: s.status as import('./components/types.js').SubmissionStatus,
                      createdAt: s.createdAt,
                    })),
                    loading: submissionsLoading,
                    updateStatus: async (id: number, status: import('./components/types.js').SubmissionStatus) => {
                      await updateSubmissionStatus(id, status);
                      return true;
                    },
                  };
                  return (
                    <AnimatePresence mode="wait">
                      {atsSubTab === 'interviews' && (
                        <motion.div key="interviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <ATSInterviewPanel {...subProps} />
                        </motion.div>
                      )}
                      {atsSubTab === 'assessments' && <motion.div key="assessments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ATSAssessments submissions={submissions.map(s => ({ id: s.id, candidateName: s.candidateName, candidateEmail: s.candidateEmail, candidatePhone: s.candidatePhone, jobTitle: s.jobTitle ?? 'Unknown Role', jobId: s.jobId, consultantName: s.consultantName ?? undefined, consultantEmail: s.consultantEmail ?? undefined, cvUrl: s.cvUrl, status: s.status as import('./components/types.js').SubmissionStatus, createdAt: s.createdAt }))} /></motion.div>}
                      {atsSubTab === 'selected' && (
                        <motion.div key="selected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <ATSSelectedCandidates {...subProps} />
                        </motion.div>
                      )}
                      {atsSubTab === 'offers' && (
                        <motion.div key="offers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <ATSOffers {...subProps} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  );
                })()}
              </motion.div>
            )}

            {/* ── REPORTS TAB ── */}
            {activeTab === 'reports' && (
              <motion.div key="reports" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                <ReportsDashboard />
              </motion.div>
            )}

            {/* ── BILLING TAB ── */}
            {activeTab === 'billing' && (
              <motion.div key="billing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <p className="text-sm text-muted-foreground mb-1">Total Fees Paid</p>
                    <p className="text-3xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>₹0</p>
                    <p className="text-xs text-muted-foreground mt-1">No placements yet</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <p className="text-sm text-muted-foreground mb-1">Pending Invoices</p>
                    <p className="text-3xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>₹0</p>
                    <p className="text-xs text-green-400 mt-1">All clear</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <p className="text-sm text-muted-foreground mb-1">Projected (Active)</p>
                    <p className="text-3xl font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>—</p>
                    <p className="text-xs text-muted-foreground mt-1">Depends on active positions closing</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Invoice History</h3>
                  </div>
                  <div className="py-16 text-center">
                    <IndianRupee size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm font-semibold">No invoices yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Invoices will appear here after successful placements.</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>How Your Fees Are Split</h3>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1 h-4 rounded-full overflow-hidden flex">
                      <div className="h-full bg-secondary" style={{ width: '75%' }} />
                      <div className="h-full bg-primary" style={{ width: '25%' }} />
                    </div>
                  </div>
                  <div className="flex gap-6 mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-secondary" />
                      <span className="text-xs text-muted-foreground">Consultant ~75%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-xs text-muted-foreground">TRICCI ~25%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Of every rupee you pay, the majority goes directly to the consultant who placed your hire.</p>
                </div>
              </motion.div>
            )}

            {/* ── ACCOUNT TAB ── */}
            {activeTab === 'wallet' && (
              <motion.div key="wallet" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                <div className="mb-6">
                  <h2 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Wallet &amp; Credits</h2>
                  <p className="text-sm text-muted-foreground mt-1">Deposit funds to your TRICCI account via Razorpay. Use credits for premium services and placements.</p>
                </div>
                <WalletPanel />
              </motion.div>
            )}

            {/* ── ACCOUNT TAB ── */}
            {activeTab === 'account' && (
              <motion.div key="account" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>My Account</h2>
                  <p className="text-muted-foreground text-sm">Manage your profile, password, and notification settings.</p>
                </div>
                <AccountDetails theme="light" />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Post Job Modal */}
      <AnimatePresence>
        {showPostJob && (
          <PostJobModal
            onClose={() => setShowPostJob(false)}
            onPosted={(_jobCode) => { refreshJobs(); }}
          />
        )}
      </AnimatePresence>

      {/* Job Preview Modal */}
      <AnimatePresence>
        {previewJob && (
          <JobPreviewModal
            job={previewJob}
            onClose={() => setPreviewJob(null)}
            onEmailTemplate={() => { setEmailTemplateJob(previewJob); setPreviewJob(null); }}
          />
        )}
      </AnimatePresence>

      {/* Email Template Modal */}
      <AnimatePresence>
        {emailTemplateJob && (
          <EmailTemplateModal
            job={emailTemplateJob}
            onClose={() => setEmailTemplateJob(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}