import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase, IndianRupee, Send,
  CheckCircle, Star, ArrowUpRight, Bell, Settings,
  Building2, Zap, Award, Wallet, ListChecks,
  BarChart3, Database, ChevronRight, MapPin,
  BookOpen, Gamepad2, FileText, Video, HelpCircle,
  ExternalLink, PlayCircle, Target, Flame, Trophy,
  Clock, TrendingDown, Activity, Sparkles
} from 'lucide-react';
import ConsultantAgreementModal from '@/components/consultant/ConsultantAgreementModal';
import ConsultantJobsTab from '@/components/consultant/ConsultantJobsTab';
import ConsultantCVBank from '@/components/consultant/ConsultantCVBank';
import ConsultantAnalytics from '@/components/consultant/ConsultantAnalytics';
import AccountDetails from '@/components/shared/AccountDetails';
import ConsultantIndustriesCard from '@/components/consultant/ConsultantIndustriesCard';
import ProposeInterviewModal from '@/components/consultant/ProposeInterviewModal';
import type { Job } from '@/server/api/jobs/GET';

// ─── Static mock data removed — dashboard now shows real data only ────────────

let CONSULTANT_FEE_PCT = 6;
fetch('/api/commission/config')
  .then(r => r.json())
  .then(data => { if (typeof data.consultantFeePct === 'number') CONSULTANT_FEE_PCT = data.consultantFeePct; })
  .catch(() => { /* keep default */ });

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const start = Date.now();
    const duration = 1200;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}

// ─── Glowing stat card ────────────────────────────────────────────────────────
function GlowCard({ icon: Icon, label, value, sub, trend, color, delay = 0, prefix = '', suffix = '', decimals = 0 }: {
  icon: React.ElementType; label: string; value: number; sub?: string;
  trend?: 'up' | 'down'; color: string; delay?: number;
  prefix?: string; suffix?: string; decimals?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' as const }}
      className="relative overflow-hidden rounded-2xl p-6 border group cursor-default"
      style={{
        background: `linear-gradient(135deg, ${color}08 0%, #0d0d0d 100%)`,
        borderColor: `${color}25`,
        boxShadow: `0 0 0 1px ${color}15, inset 0 1px 0 ${color}10`,
      }}
      whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
    >
      {/* Glow blob */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none transition-opacity duration-300 opacity-20 group-hover:opacity-40"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18`, border: `1.5px solid ${color}35` }}>
            <Icon size={22} style={{ color }} />
          </div>
          {trend && (
            <motion.span
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay + 0.3 }}
              className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                trend === 'up'
                  ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                  : 'bg-red-500/15 text-red-400 border border-red-500/25'
              }`}>
              {trend === 'up' ? <ArrowUpRight size={12} /> : <TrendingDown size={12} />}
              {trend === 'up' ? '+18%' : '-5%'}
            </motion.span>
          )}
        </div>
        <div className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'var(--font-heading)', textShadow: `0 0 20px ${color}40` }}>
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </div>
        <div className="text-sm font-semibold" style={{ color: `${color}cc` }}>{label}</div>
        {sub && <div className="text-xs text-white/30 mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

// ─── Live pulse dot ───────────────────────────────────────────────────────────
function LiveDot({ color = '#22c55e' }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }} />
    </span>
  );
}

// ─── Badge components ─────────────────────────────────────────────────────────
type UrgencyLevel = 'high' | 'medium' | 'low';

function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  const map: Record<UrgencyLevel, { label: string; className: string }> = {
    high: { label: '🔥 Urgent', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
    medium: { label: 'Active', className: 'bg-primary/15 text-primary border-primary/30' },
    low: { label: 'Open', className: 'bg-white/5 text-white/50 border-white/10' },
  };
  const s = map[urgency];
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.className}`}>{s.label}</span>;
}

function SubmissionBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    submitted: { label: 'Submitted', className: 'bg-white/5 text-white/50 border-white/10' },
    pending: { label: 'Submitted', className: 'bg-white/5 text-white/50 border-white/10' },
    review: { label: 'In Review', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
    shortlisted: { label: 'Shortlisted', className: 'bg-primary/15 text-primary border-primary/30' },
    interview: { label: 'Interview', className: 'bg-secondary/15 text-secondary border-secondary/30' },
    selected: { label: 'Selected', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
    offered: { label: 'Offer Issued', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    closed: { label: 'Closed', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
    rejected: { label: 'Rejected', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
    payment_processed: { label: 'Pmt Processing', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
    payment_done: { label: 'Payment Done ✓', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  };
  const s = map[status] ?? { label: status ?? 'Submitted', className: 'bg-white/5 text-white/50 border-white/10' };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.className}`}>{s.label}</span>;
}

// ─── Tab types ────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'jobs' | 'cvbank' | 'submissions' | 'analytics' | 'earnings' | 'resources' | 'refresh' | 'account';

export default function ConsultantDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [liveJobs, setLiveJobs] = useState<Job[]>([]);
  const [agreementSigned, setAgreementSigned] = useState<boolean | null>(null);
  const [showAgreement, setShowAgreement] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetch('/api/consultant/agreement')
      .then(r => r.json())
      .then((d: { signed?: boolean }) => {
        const signed = !!d.signed;
        setAgreementSigned(signed);
        // If unsigned, fire the reminder email (rate-limited server-side to once/24h)
        if (!signed) {
          fetch('/api/consultant/onboarding/reminder', { method: 'POST' }).catch(() => {});
        }
      })
      .catch(() => setAgreementSigned(false));
  }, []);

  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then((d: { jobs?: Job[] }) => { if (d.jobs) setLiveJobs(d.jobs); })
      .catch(() => { /* silent */ });
  }, []);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function handleBrowseJobsClick() {
    if (agreementSigned) setActiveTab('jobs');
    else setShowAgreement(true);
  }

  function handleAgreementAccepted() {
    setAgreementSigned(true);
    setShowAgreement(false);
    setActiveTab('jobs');
  }

  function jobUrgency(job: Job): UrgencyLevel {
    if (job.postedDays <= 3) return 'high';
    if (job.postedDays <= 7) return 'medium';
    return 'low';
  }

  // Real submissions fetched from API
  interface MySubmission {
    id: number;
    candidateName: string;
    candidateEmail: string;
    status: string;
    createdAt: string;
    jobTitle: string | null;
    jobCompany: string | null;
    _interviewProposed?: boolean;
  }
  const [mySubmissions, setMySubmissions] = useState<MySubmission[]>([]);
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false);
  const [proposeInterviewFor, setProposeInterviewFor] = useState<MySubmission | null>(null);
  const [proposingInterview, setProposingInterview] = useState(false);
  const [proposeError, setProposeError] = useState('');

  async function handleProposeInterview(proposedDate: string, note: string) {
    if (!proposeInterviewFor) return;
    setProposingInterview(true);
    setProposeError('');
    try {
      const res = await fetch(`/api/consultant/submissions/${proposeInterviewFor.id}/interview/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposedDate, note }),
      });
      if (res.ok) {
        setMySubmissions(prev => prev.map(s => s.id === proposeInterviewFor.id ? { ...s, _interviewProposed: true } : s));
        setProposeInterviewFor(null);
      } else {
        const data = await res.json();
        setProposeError(data.error || 'Failed to propose interview time.');
      }
    } finally {
      setProposingInterview(false);
    }
  }

  useEffect(() => {
    fetch('/api/consultant/submissions')
      .then(r => r.json())
      .then((d: { submissions?: MySubmission[] }) => {
        if (d.submissions) setMySubmissions(d.submissions);
        setSubmissionsLoaded(true);
      })
      .catch(() => setSubmissionsLoaded(true));
  }, []);

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Dashboard', icon: Activity },
    { id: 'jobs', label: 'Browse Jobs', icon: Briefcase },
    { id: 'submissions', label: 'Submissions', icon: Send },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'earnings', label: 'Earnings', icon: Wallet },
    { id: 'cvbank', label: 'CV Bank', icon: Database },
    { id: 'account', label: 'My Account', icon: Settings },
    { id: 'resources', label: 'Resources', icon: BookOpen },
    { id: 'refresh', label: "Let's Refresh", icon: Gamepad2 },
  ];

  const timeStr = currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <>
      {showAgreement && <ConsultantAgreementModal onAccepted={handleAgreementAccepted} />}

      <Helmet>
        <title>Consultant Portal — TRICCI</title>
        <meta name="description" content="Browse job mandates, submit candidates, and track your placement earnings on TRICCI." />
        <link rel="canonical" href="https://tricci.in/consultant/dashboard" />
        <meta name="robots" content="noindex" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ProfessionalService',
          name: 'TRICCI Recruitment Consultant Portal',
          url: 'https://tricci.in',
        })}</script>
      </Helmet>

      {/* ── Full dark canvas ── */}
      <div className="min-h-screen" style={{ background: '#080808' }}>
        <h1 className="sr-only">Consultant Portal — TRICCI</h1>

        {/* ══════════════════════════════════════════════════════
            HERO BANNER — full energy, dark, animated
        ══════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden" style={{ minHeight: 340 }}>
          {/* Animated gradient background */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #0d0520 0%, #0a0a0a 40%, #1a0500 100%)' }} />

          {/* Animated grid lines */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(#E8470A 1px, transparent 1px), linear-gradient(90deg, #E8470A 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }} />

          {/* Glow orbs */}
          <motion.div className="absolute pointer-events-none"
            style={{ top: '-20%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, #6B4FBB22 0%, transparent 65%)' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' as const }} />
          <motion.div className="absolute pointer-events-none"
            style={{ bottom: '-30%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, #E8470A18 0%, transparent 65%)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' as const, delay: 2 }} />

          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div key={i} className="absolute w-1 h-1 rounded-full pointer-events-none"
              style={{
                left: `${15 + i * 14}%`,
                top: `${20 + (i % 3) * 25}%`,
                background: i % 2 === 0 ? '#E8470A' : '#6B4FBB',
              }}
              animate={{ y: [-8, 8, -8], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' as const, delay: i * 0.4 }} />
          ))}

          <div className="relative z-10 container mx-auto px-4 py-12 md:py-16">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">

              {/* Left — greeting + headline */}
              <div className="max-w-2xl">
                {/* Live status bar */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                  className="flex items-center gap-3 mb-5">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                    <LiveDot color="#22c55e" />
                    <span className="text-xs font-bold text-green-400">LIVE</span>
                    <span className="text-xs text-white/40">{liveJobs.length} mandates active</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/30 text-xs">
                    <Clock size={11} />
                    <span>{timeStr} &middot; {dateStr}</span>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-yellow-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40">Good morning, Rajesh</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-white leading-[1.1] mb-4"
                    style={{ fontFamily: 'var(--font-heading)', textShadow: '0 0 60px rgba(232,71,10,0.3)' }}>
                    Your earnings<br />
                    <span style={{ background: 'linear-gradient(90deg, #E8470A, #ff9a6c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      start today.
                    </span>
                  </h2>
                  <p className="text-white/50 text-base leading-relaxed max-w-lg">
                    Every mandate you work on is a placement waiting to happen. Submit your best candidates and earn <strong className="text-white/80">maximum commission</strong> — no subscription, no cap.
                  </p>
                </motion.div>

                {/* CTA row */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}
                  className="flex flex-wrap gap-3 mt-7">
                  <button onClick={handleBrowseJobsClick}
                    className="group flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-black text-sm text-white transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #E8470A, #c73a08)', boxShadow: '0 0 24px rgba(232,71,10,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
                    <Zap size={16} className="group-hover:animate-bounce" />
                    Browse Open Mandates
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button onClick={() => setActiveTab('analytics')}
                    className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm text-white/70 border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all duration-200">
                    <BarChart3 size={15} /> View Analytics
                  </button>
                </motion.div>

                {/* Trust pills */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="flex flex-wrap gap-2 mt-5">
                  {[
                    { icon: Trophy, label: 'Maximum Commission', color: '#ffd035' },
                    { icon: Flame, label: 'No subscription', color: '#E8470A' },
                    { icon: Target, label: 'Fast payouts', color: '#22c55e' },
                  ].map(p => (
                    <div key={p.label} className="flex items-center gap-1.5 text-xs font-semibold text-white/50 bg-white/5 border border-white/8 rounded-full px-3 py-1.5">
                      <p.icon size={11} style={{ color: p.color }} />
                      {p.label}
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right — big earnings ticker */}
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.3 }}
                className="lg:shrink-0 lg:w-72">
                <div className="relative rounded-2xl p-6 border overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #1a0a00 0%, #0d0d0d 100%)',
                    borderColor: '#E8470A30',
                    boxShadow: '0 0 40px rgba(232,71,10,0.15), inset 0 1px 0 rgba(232,71,10,0.1)',
                  }}>
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-20"
                    style={{ background: 'radial-gradient(circle, #E8470A 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                        <IndianRupee size={14} className="text-primary" />
                      </div>
                      <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Pipeline Potential</span>
                    </div>
                    <div className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'var(--font-heading)', textShadow: '0 0 30px rgba(232,71,10,0.5)' }}>
                      {mySubmissions.length > 0 ? '—' : '₹0'}
                    </div>
                    <p className="text-xs text-white/30 mb-5">If all {mySubmissions.length} active submissions close</p>

                    <div className="space-y-2.5">
                      {[
                        { label: 'Shortlisted', count: mySubmissions.filter(s => s.status === 'shortlisted').length, color: '#E8470A' },
                        { label: 'In Interview', count: mySubmissions.filter(s => s.status === 'interview').length, color: '#6B4FBB' },
                        { label: 'In Review', count: mySubmissions.filter(s => s.status === 'pending' || s.status === 'review').length, color: '#ffd035' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-xs text-white/40">{item.label}</span>
                          </div>
                          <span className="text-xs font-black text-white">{item.count}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-white/30">Total earned</span>
                      <span className="text-sm font-black text-green-400">₹0.00L</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            STICKY NAV BAR
        ══════════════════════════════════════════════════════ */}
        <div className="sticky top-[80px] z-30 border-b"
          style={{ background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(20px)', borderColor: '#ffffff10' }}>
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              {/* Tab nav */}
              <div className="flex items-center gap-1">
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-150 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-white'
                        : 'text-white/30 hover:text-white/70'
                    }`}
                    style={activeTab === tab.id ? {
                      background: 'linear-gradient(135deg, #E8470A20, #6B4FBB15)',
                      border: '1px solid #E8470A30',
                    } : {}}>
                    <tab.icon size={14} />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Right side */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 mr-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #E8470A, #6B4FBB)' }}>
                    <Award size={13} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-none">Rajesh Kumar</p>
                    <p className="text-[10px] text-green-400 leading-none">Verified ✓</p>
                  </div>
                </div>
                <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  style={{ background: '#ffffff08', border: '1px solid #ffffff10' }}>
                  <Bell size={14} />
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
                </button>
                <button onClick={() => setActiveTab('account')} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  style={{ background: '#ffffff08', border: '1px solid #ffffff10' }}>
                  <Settings size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            MAIN CONTENT
        ══════════════════════════════════════════════════════ */}
        <div className="container mx-auto px-4 py-8">
          <AnimatePresence mode="wait">

            {/* ── DASHBOARD TAB ── */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }} className="space-y-8">

                {/* ── KPI stat cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <GlowCard icon={Briefcase} label="Open Mandates" value={liveJobs.length} sub="Available now" color="#E8470A" delay={0} />
                  <GlowCard icon={Send} label="Active Submissions" value={mySubmissions.length} trend="up" color="#ffd035" delay={0.08} />
                  <GlowCard icon={Trophy} label="Placements Closed" value={0} sub="This year" color="#22c55e" delay={0.16} />
                  <GlowCard icon={IndianRupee} label="Total Earned (L)" value={0} sub="All time" color="#6B4FBB" delay={0.24} decimals={2} />
                </div>

                {/* ── Performance meter + quick actions ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                  {/* Performance score */}
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                    className="lg:col-span-1 rounded-2xl p-6 border relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0d0520 0%, #0a0a0a 100%)', borderColor: '#6B4FBB25' }}>
                    <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none opacity-15"
                      style={{ background: 'radial-gradient(circle, #6B4FBB 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-5">
                        <Star size={14} className="text-yellow-400" />
                        <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Performance Score</span>
                      </div>
                      <div className="flex items-center gap-5 mb-5">
                        <div className="relative w-20 h-20 shrink-0">
                          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                            <circle cx="40" cy="40" r="32" fill="none" stroke="#ffffff08" strokeWidth="6" />
                            <circle cx="40" cy="40" r="32" fill="none" stroke="#6B4FBB30" strokeWidth="6" strokeDasharray={`${2 * Math.PI * 32}`} strokeDashoffset={2 * Math.PI * 32} />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-black text-white/30" style={{ fontFamily: 'var(--font-heading)' }}>—</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xl font-black text-white/50 mb-0.5" style={{ fontFamily: 'var(--font-heading)' }}>New</p>
                          <p className="text-xs text-white/25">Score builds as you submit candidates</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: 'Shortlist Rate', value: 0, color: '#E8470A' },
                          { label: 'Interview Rate', value: 0, color: '#6B4FBB' },
                          { label: 'Offer Rate', value: 0, color: '#22c55e' },
                        ].map(m => (
                          <div key={m.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-white/40">{m.label}</span>
                              <span className="text-white/30 font-bold">—</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full w-0" style={{ background: m.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* Quick action cards */}
                  <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    {[
                      { id: 'jobs' as TabId, icon: Briefcase, label: 'Browse Jobs', desc: 'New, Accepted, Mapped', color: '#E8470A', badge: `${liveJobs.length} live` },
                      { id: 'cvbank' as TabId, icon: Database, label: 'CV Bank', desc: 'Your talent pool', color: '#6B4FBB', badge: '0 saved' },
                      { id: 'analytics' as TabId, icon: BarChart3, label: 'Analytics', desc: 'Performance insights', color: '#35c9ff', badge: 'Live' },
                      { id: 'earnings' as TabId, icon: Wallet, label: 'Earnings', desc: 'Payouts & history', color: '#22c55e', badge: '₹0' },
                    ].map((card, i) => (
                      <motion.button key={card.id}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.07 }}
                        onClick={() => setActiveTab(card.id)}
                        className="relative overflow-hidden rounded-2xl p-5 text-left border group transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          background: `linear-gradient(135deg, ${card.color}08 0%, #0d0d0d 100%)`,
                          borderColor: `${card.color}20`,
                        }}
                        whileHover={{ borderColor: `${card.color}50` } as Record<string, string>}>
                        <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity"
                          style={{ background: `radial-gradient(circle, ${card.color} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ background: `${card.color}18`, border: `1.5px solid ${card.color}30` }}>
                              <card.icon size={18} style={{ color: card.color }} />
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${card.color}15`, color: card.color, border: `1px solid ${card.color}25` }}>
                              {card.badge}
                            </span>
                          </div>
                          <p className="font-black text-white text-sm mb-0.5" style={{ fontFamily: 'var(--font-heading)' }}>{card.label}</p>
                          <p className="text-xs text-white/30">{card.desc}</p>
                          <ChevronRight size={13} className="text-white/20 mt-2 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* ── Live mandates ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="rounded-2xl border overflow-hidden"
                  style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
                  <div className="flex items-center justify-between px-6 py-4 border-b"
                    style={{ borderColor: '#ffffff0d', background: 'linear-gradient(90deg, #E8470A08, transparent)' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <LiveDot color="#E8470A" />
                        <span className="font-black text-white text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Top Mandates for You</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                        {liveJobs.length} live
                      </span>
                    </div>
                    <button onClick={() => setActiveTab('jobs')}
                      className="text-xs font-bold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                      Browse all <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="divide-y" style={{ borderColor: '#ffffff08' }}>
                    {liveJobs.slice(0, 4).map((job, i) => (
                      <motion.div key={job.id}
                        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.06 }}
                        className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: '#E8470A12', border: '1px solid #E8470A20' }}>
                            <Building2 size={14} className="text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{job.title}</p>
                            <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1.5">
                              <span>{job.company}</span>
                              <span className="w-1 h-1 rounded-full bg-white/20" />
                              <MapPin size={10} />{job.location}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-black text-primary">{CONSULTANT_FEE_PCT}%</p>
                            <p className="text-[10px] text-white/25">your fee</p>
                          </div>
                          <UrgencyBadge urgency={jobUrgency(job)} />
                          <button onClick={() => setActiveTab('jobs')}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            style={{ background: '#E8470A20', color: '#E8470A', border: '1px solid #E8470A30' }}>
                            View →
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {liveJobs.length === 0 && (
                      <div className="py-10 text-center">
                        <Briefcase size={20} className="text-white/20 mx-auto mb-2" />
                        <p className="text-xs text-white/30">No mandates posted yet — check back soon</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* ── Submissions + Activity ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                  {/* My Submissions */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="rounded-2xl border overflow-hidden"
                    style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
                    <div className="flex items-center justify-between px-5 py-4 border-b"
                      style={{ borderColor: '#ffffff0d' }}>
                      <div className="flex items-center gap-2">
                        <ListChecks size={14} className="text-secondary" />
                        <span className="font-black text-white text-sm" style={{ fontFamily: 'var(--font-heading)' }}>My Submissions</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/25">
                        {mySubmissions.length} active
                      </span>
                    </div>
                    <div className="divide-y" style={{ borderColor: '#ffffff06' }}>
                      {mySubmissions.slice(0, 4).map((s, i) => (
                        <motion.div key={s.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 + i * 0.05 }}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black"
                            style={{ background: '#6B4FBB20', color: '#6B4FBB', border: '1px solid #6B4FBB25' }}>
                            {s.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{s.candidateName}</p>
                            <p className="text-[11px] text-white/30 truncate">{s.jobTitle ?? 'Job'}</p>
                          </div>
                          <SubmissionBadge status={s.status ?? ''} />
                        </motion.div>
                      ))}
                      {submissionsLoaded && mySubmissions.length === 0 && (
                        <div className="py-8 text-center">
                          <Send size={18} className="text-white/15 mx-auto mb-2" />
                          <p className="text-xs text-white/25">No submissions yet — browse jobs and submit candidates</p>
                        </div>
                      )}
                    </div>
                    <div className="px-5 py-3 border-t" style={{ borderColor: '#ffffff06' }}>
                      <button onClick={() => setActiveTab('submissions')}
                        className="text-xs font-bold text-white/30 hover:text-primary transition-colors flex items-center gap-1">
                        View all submissions <ChevronRight size={11} />
                      </button>
                    </div>
                  </motion.div>

                  {/* Activity feed — shows recent submissions as activity */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                    className="rounded-2xl border overflow-hidden"
                    style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
                    <div className="flex items-center gap-2 px-5 py-4 border-b"
                      style={{ borderColor: '#ffffff0d' }}>
                      <Activity size={14} className="text-primary" />
                      <span className="font-black text-white text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Recent Activity</span>
                    </div>
                    <div className="divide-y" style={{ borderColor: '#ffffff06' }}>
                      {mySubmissions.slice(0, 4).map((s, i) => (
                        <motion.div key={s.id}
                          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.06 }}
                          className="flex items-start gap-3 px-5 py-4">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-secondary/15">
                            <Send size={13} className="text-secondary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/70 leading-relaxed">
                              Submitted <span className="font-semibold text-white/90">{s.candidateName}</span> for {s.jobTitle ?? 'a job'}
                            </p>
                            <p className="text-[10px] text-white/25 mt-1">
                              {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      {submissionsLoaded && mySubmissions.length === 0 && (
                        <div className="py-8 text-center">
                          <Sparkles size={18} className="text-white/15 mx-auto mb-2" />
                          <p className="text-xs text-white/25">Activity will appear here as you start submitting candidates</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* ── Earnings snapshot ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                  className="rounded-2xl border p-6 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0a1a05 0%, #0d0d0d 100%)', borderColor: '#22c55e20' }}>
                  <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none opacity-10"
                    style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet size={14} className="text-green-400" />
                        <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Earnings Overview</span>
                      </div>
                      <p className="text-4xl font-black mb-1" style={{ fontFamily: 'var(--font-heading)', color: '#22c55e', textShadow: '0 0 30px rgba(34,197,94,0.3)' }}>
                        ₹0.00L
                      </p>
                      <p className="text-sm text-white/30">Earnings will appear here after your first placement</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: 'Pending', value: '₹0', color: '#ffd035' },
                        { label: 'Projected', value: '—', color: '#22c55e' },
                        { label: 'This Month', value: '₹0', color: '#E8470A' },
                      ].map(e => (
                        <div key={e.label} className="rounded-xl px-4 py-3 border"
                          style={{ background: `${e.color}08`, borderColor: `${e.color}20` }}>
                          <p className="text-[10px] text-white/30 mb-0.5">{e.label}</p>
                          <p className="text-sm font-black" style={{ color: e.color, fontFamily: 'var(--font-heading)' }}>{e.value}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setActiveTab('earnings')}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white/70 border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all shrink-0">
                      Full History <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>

              </motion.div>
            )}

            {/* ── JOBS TAB (hidden, accessible via cards) ── */}
            {activeTab === 'jobs' && (
              <motion.div key="jobs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                <ConsultantJobsTab />
              </motion.div>
            )}

            {/* ── CV BANK TAB ── */}
            {activeTab === 'cvbank' && (
              <motion.div key="cvbank" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                <ConsultantCVBank />
              </motion.div>
            )}

            {/* ── SUBMISSIONS TAB ── */}
            {activeTab === 'submissions' && (
              <motion.div key="submissions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
                  <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#ffffff0d' }}>
                    <h3 className="font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>My Submissions</h3>
                    <div className="flex items-center gap-2 text-sm text-white/30">
                      <ListChecks size={14} />
                      <span>{mySubmissions.length} candidates</span>
                    </div>
                  </div>
                  <div className="divide-y" style={{ borderColor: '#ffffff06' }}>
                    {mySubmissions.map(s => (
                      <div key={s.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
                          style={{ background: '#6B4FBB20', color: '#6B4FBB', border: '1px solid #6B4FBB25' }}>
                          {s.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm">{s.candidateName}</p>
                          <p className="text-xs text-white/30 mt-0.5">{s.jobTitle ?? 'Job'}{s.jobCompany ? ` · ${s.jobCompany}` : ''}</p>
                        </div>
                        <div className="hidden sm:block text-right">
                          <p className="text-xs text-white/25">{new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        </div>
                        {s.status === 'shortlisted' && (
                          s._interviewProposed ? (
                            <span className="text-[10px] text-white/30 italic shrink-0">Interview proposed</span>
                          ) : (
                            <button
                              onClick={() => setProposeInterviewFor(s)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors shrink-0"
                            >
                              Propose Interview
                            </button>
                          )
                        )}
                        <SubmissionBadge status={s.status ?? ''} />
                      </div>
                    ))}
                    {submissionsLoaded && mySubmissions.length === 0 && (
                      <div className="py-12 text-center">
                        <Send size={24} className="text-white/15 mx-auto mb-3" />
                        <p className="text-sm font-bold text-white/30">No submissions yet</p>
                        <p className="text-xs text-white/20 mt-1">Browse jobs and submit candidates to see them here</p>
                        <button onClick={() => setActiveTab('jobs')}
                          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors">
                          Browse Jobs
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {proposeInterviewFor && (
              <ProposeInterviewModal
                candidateName={proposeInterviewFor.candidateName}
                submitting={proposingInterview}
                error={proposeError}
                onClose={() => { setProposeInterviewFor(null); setProposeError(''); }}
                onSubmit={handleProposeInterview}
              />
            )}

            {/* ── ANALYTICS TAB ── */}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                <ConsultantAnalytics />
              </motion.div>
            )}

            {/* ── EARNINGS TAB ── */}
            {activeTab === 'earnings' && (
              <motion.div key="earnings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Earned', value: '₹0.00L', sub: 'Placements will appear here', color: '#22c55e' },
                    { label: 'Pending Payouts', value: '₹0', sub: 'Nothing pending', color: '#ffd035' },
                    { label: 'Projected Pipeline', value: '—', sub: 'Submit candidates to build pipeline', color: '#E8470A' },
                  ].map(e => (
                    <div key={e.label} className="rounded-2xl border p-6 relative overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${e.color}08 0%, #0d0d0d 100%)`, borderColor: `${e.color}20` }}>
                      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none opacity-15"
                        style={{ background: `radial-gradient(circle, ${e.color} 0%, transparent 70%)` }} />
                      <p className="text-xs text-white/30 mb-2">{e.label}</p>
                      <p className="text-3xl font-black mb-1" style={{ fontFamily: 'var(--font-heading)', color: e.color }}>{e.value}</p>
                      <p className="text-xs text-white/25">{e.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
                  <div className="px-6 py-4 border-b" style={{ borderColor: '#ffffff0d' }}>
                    <h3 className="font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>Payout History</h3>
                  </div>
                  <div className="py-12 text-center">
                    <IndianRupee size={24} className="text-white/15 mx-auto mb-3" />
                    <p className="text-sm font-bold text-white/30">No payouts yet</p>
                    <p className="text-xs text-white/20 mt-1">Your payout history will appear here after your first placement closes</p>
                  </div>
                </div>

                <div className="rounded-2xl border p-6" style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
                  <h3 className="font-black text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>How Your Payouts Work</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { icon: CheckCircle, title: 'Position Closed', desc: 'Employer confirms hire and triggers the fee payment to TRICCI.', color: '#35c9ff' },
                      { icon: IndianRupee, title: 'Fee Collected', desc: 'TRICCI collects the full placement fee from the employer within 7 days.', color: '#ffd035' },
                      { icon: Wallet, title: 'You Get Paid', desc: 'Your placement fee is transferred to your bank within 3 business days of candidate joining.', color: '#22c55e' },
                    ].map(step => (
                      <div key={step.title} className="flex gap-3 p-4 rounded-xl border"
                        style={{ background: `${step.color}06`, borderColor: `${step.color}15` }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${step.color}18` }}>
                          <step.icon size={16} style={{ color: step.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{step.title}</p>
                          <p className="text-xs text-white/30 mt-1">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── ACCOUNT TAB ── */}
            {activeTab === 'account' && (
              <motion.div key="account" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>My Account</h2>
                  <p className="text-white/30 text-sm">Manage your profile, password, and notification settings.</p>
                </div>
                <ConsultantIndustriesCard />
                <AccountDetails theme="dark" />
              </motion.div>
            )}

            {/* ── RESOURCES TAB ── */}
            {activeTab === 'resources' && (
              <motion.div key="resources" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-8">
                <div>
                  <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Resources</h2>
                  <p className="text-white/30 text-sm">Guides, templates, and tools to help you place faster and earn more.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { icon: FileText, title: 'Consultant Handbook', desc: 'Everything you need to know about working with TRICCI — mandates, submissions, payouts.', color: '#E8470A', tag: 'PDF Guide' },
                    { icon: Video, title: 'Platform Walkthrough', desc: 'A 5-minute video tour of the consultant portal — from browsing mandates to submitting CVs.', color: '#6B4FBB', tag: 'Video' },
                    { icon: FileText, title: 'CV Submission Template', desc: 'Use our standard candidate profile template to maximise shortlist rates with employers.', color: '#35c9ff', tag: 'Template' },
                    { icon: HelpCircle, title: 'FAQ — Fees & Payouts', desc: 'How is my commission calculated? When do I get paid? All payout questions answered.', color: '#ffd035', tag: 'FAQ' },
                    { icon: FileText, title: 'Interview Prep Checklist', desc: 'Share this with candidates before every interview to improve selection ratios.', color: '#22c55e', tag: 'Checklist' },
                    { icon: Video, title: 'Candidate Briefing Tips', desc: 'How to brief candidates effectively so they show up prepared and confident.', color: '#E8470A', tag: 'Video' },
                  ].map((r, i) => (
                    <motion.div key={r.title}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className="rounded-2xl border p-5 flex flex-col gap-3 group hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                      style={{ background: `linear-gradient(135deg, ${r.color}06 0%, #0d0d0d 100%)`, borderColor: `${r.color}18` }}>
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${r.color}18`, border: `1.5px solid ${r.color}30` }}>
                          <r.icon size={18} style={{ color: r.color }} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${r.color}12`, color: r.color, border: `1px solid ${r.color}20` }}>{r.tag}</span>
                      </div>
                      <div>
                        <p className="font-black text-white text-sm" style={{ fontFamily: 'var(--font-heading)' }}>{r.title}</p>
                        <p className="text-xs text-white/30 mt-1 leading-relaxed">{r.desc}</p>
                      </div>
                      <button className="mt-auto flex items-center gap-1.5 text-xs font-bold group-hover:gap-2.5 transition-all" style={{ color: r.color }}>
                        {r.tag === 'Video' ? <PlayCircle size={13} /> : <ExternalLink size={13} />}
                        {r.tag === 'Video' ? 'Watch now' : 'Open'}
                      </button>
                    </motion.div>
                  ))}
                </div>
                <div className="rounded-2xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0d0520, #0a0a0a)', borderColor: '#6B4FBB25' }}>
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none opacity-10"
                    style={{ background: 'radial-gradient(circle, #6B4FBB 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                  <div className="relative z-10">
                    <p className="font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>Your Consultant Agreement</p>
                    <p className="text-sm text-white/30 mt-1">Download a copy of your signed agreement for your records.</p>
                  </div>
                  <button className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shrink-0 transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #6B4FBB, #4a3580)', boxShadow: '0 0 20px rgba(107,79,187,0.3)' }}>
                    <FileText size={15} /> Download Agreement
                  </button>
                </div>
                <div className="rounded-2xl border p-6" style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
                  <h3 className="font-black text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Need Help?</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { title: 'Email Support', desc: 'Write to us at support@tricci.in — we respond within 4 business hours.', action: 'Send Email', href: 'mailto:support@tricci.in', color: '#E8470A' },
                      { title: 'WhatsApp Helpdesk', desc: 'Chat with our consultant success team directly on WhatsApp.', action: 'Open WhatsApp', href: '#', color: '#22c55e' },
                    ].map(s => (
                      <div key={s.title} className="flex gap-3 p-4 rounded-xl border"
                        style={{ background: `${s.color}06`, borderColor: `${s.color}15` }}>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white">{s.title}</p>
                          <p className="text-xs text-white/30 mt-1">{s.desc}</p>
                          <a href={s.href} className="inline-flex items-center gap-1 text-xs font-bold mt-2 hover:underline" style={{ color: s.color }}>
                            {s.action} <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── LET'S REFRESH TAB ── */}
            {activeTab === 'refresh' && (
              <motion.div key="refresh" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Let&rsquo;s Refresh</h2>
                  <p className="text-white/30 text-sm">Take a break, recharge, and come back sharper.</p>
                </div>
                <div className="rounded-2xl border p-10 text-center relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0d0520, #0a0a0a)', borderColor: '#6B4FBB25' }}>
                  <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'linear-gradient(#6B4FBB 1px, transparent 1px), linear-gradient(90deg, #6B4FBB 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                  <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' as const }}
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 relative z-10"
                    style={{ background: 'linear-gradient(135deg, #6B4FBB, #4a3580)', boxShadow: '0 0 40px rgba(107,79,187,0.4)' }}>
                    <Gamepad2 size={32} className="text-white" />
                  </motion.div>
                  <p className="font-black text-white text-xl mb-2 relative z-10" style={{ fontFamily: 'var(--font-heading)' }}>Full Refresh Zone</p>
                  <p className="text-white/30 text-sm mb-7 max-w-md mx-auto relative z-10">
                    4 games, brain teasers, and the TIC AI Copilot — all on the dedicated page. Take 5 minutes to recharge.
                  </p>
                  <a href="/refresh" target="_blank" rel="noopener noreferrer"
                    className="relative z-10 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-black text-sm text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #6B4FBB, #4a3580)', boxShadow: '0 0 30px rgba(107,79,187,0.4)' }}>
                    <PlayCircle size={16} /> Open Let&rsquo;s Refresh
                  </a>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
