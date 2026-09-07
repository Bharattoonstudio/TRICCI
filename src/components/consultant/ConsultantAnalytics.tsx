import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, TrendingDown, Users, Briefcase, CheckCircle,
  XCircle, Clock, Star, Award, Target, Zap, IndianRupee,
  ArrowUpRight, ArrowDownRight, Download, BarChart3, Activity, Loader2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalyticsData {
  // Jobs
  jobsAccepted: number;
  jobsLive: number;
  jobsClosed: number;
  // CVs submitted
  cvsSubmitted: number;
  cvsRejected: number;
  cvsShortlisted: number;
  // Pipeline
  candidatesGiven: number;
  candidatesSelected: number;
  candidatesJoined: number;
  candidatesBackedOut: number;
  offersRejected: number;
  yetToJoin: number;
  // Ratios
  selectionRatio: number;
  rejectionRatio: number;
  prescreeningRatio: number;
  resumeSelectionRatio: number;
  // Earnings
  totalEarned: number;
  pendingEarnings: number;
  // Rating
  performanceRating: number; // out of 5
  rankPercentile: number;
}

const MOCK_DATA: AnalyticsData = {
  jobsAccepted: 0,
  jobsLive: 0,
  jobsClosed: 0,
  cvsSubmitted: 0,
  cvsRejected: 0,
  cvsShortlisted: 0,
  candidatesGiven: 0,
  candidatesSelected: 0,
  candidatesJoined: 0,
  candidatesBackedOut: 0,
  offersRejected: 0,
  yetToJoin: 0,
  selectionRatio: 0,
  rejectionRatio: 0,
  prescreeningRatio: 0,
  resumeSelectionRatio: 0,
  totalEarned: 0,
  pendingEarnings: 0,
  performanceRating: 0,
  rankPercentile: 0,
};

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = 0;
    const end = value;
    const duration = 1200;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return (
    <span>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
}

// ─── Donut chart (SVG) ────────────────────────────────────────────────────────
function DonutChart({ segments, size = 120, thickness = 18 }: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let offset = 0;
  const arcs = segments.map(seg => {
    const pct = total > 0 ? seg.value / total : 0;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const arc = { ...seg, dash, gap, offset: offset * circumference };
    offset += pct;
    return arc;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={thickness} />
      {arcs.map((arc, i) => (
        <motion.circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={thickness}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${arc.dash} ${arc.gap}` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: i * 0.1 }}
        />
      ))}
    </svg>
  );
}

// ─── Meter bar ────────────────────────────────────────────────────────────────
function MeterBar({ label, value, max = 100, color, sublabel }: {
  label: string; value: number; max?: number; color: string; sublabel?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-sm font-black" style={{ color }}>{value.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden border border-border">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────
function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(rating);
        const partial = !filled && i < rating;
        return (
          <div key={i} className="relative w-5 h-5">
            <Star size={20} className="text-muted" />
            {(filled || partial) && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: partial ? `${(rating % 1) * 100}%` : '100%' }}>
                <Star size={20} className="text-yellow-400" fill="currentColor" />
              </div>
            )}
          </div>
        );
      })}
      <span className="ml-1 text-sm font-black text-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({
  icon: Icon, label, value, sub, color, trend, prefix = '', suffix = '', decimals = 0,
}: {
  icon: React.ElementType; label: string; value: number; sub?: string;
  color: string; trend?: 'up' | 'down'; prefix?: string; suffix?: string; decimals?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden"
    >
      {/* Glow */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />

      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color + '20', border: `1.5px solid ${color}40` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {trend === 'up' ? '+12%' : '-5%'}
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </div>
      <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1 opacity-70">{sub}</div>}
    </motion.div>
  );
}

// ─── Pipeline funnel ──────────────────────────────────────────────────────────
function PipelineFunnel({ data }: { data: AnalyticsData }) {
  const stages = [
    { label: 'CVs Submitted', value: data.cvsSubmitted, color: '#6B4FBB', pct: 100 },
    { label: 'Shortlisted', value: data.cvsShortlisted, color: '#E8470A', pct: Math.round((data.cvsShortlisted / data.cvsSubmitted) * 100) },
    { label: 'Selected', value: data.candidatesSelected, color: '#35c9ff', pct: Math.round((data.candidatesSelected / data.cvsSubmitted) * 100) },
    { label: 'Joined', value: data.candidatesJoined, color: '#22c55e', pct: Math.round((data.candidatesJoined / data.cvsSubmitted) * 100) },
  ];

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => (
        <div key={stage.label}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
              <span className="text-sm font-semibold text-foreground">{stage.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{stage.pct}%</span>
              <span className="text-sm font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{stage.value}</span>
            </div>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: stage.color }}
              initial={{ width: 0 }}
              animate={{ width: `${stage.pct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: i * 0.15 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Outcome breakdown ────────────────────────────────────────────────────────
function OutcomeBreakdown({ data }: { data: AnalyticsData }) {
  const items = [
    { label: 'Joined', value: data.candidatesJoined, color: '#22c55e', icon: CheckCircle },
    { label: 'Yet to Join', value: data.yetToJoin, color: '#ffd035', icon: Clock },
    { label: 'Backed Out', value: data.candidatesBackedOut, color: '#f97316', icon: XCircle },
    { label: 'Offer Rejected', value: data.offersRejected, color: '#ef4444', icon: XCircle },
  ];
  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <div className="space-y-3">
      {items.map(item => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <div key={item.label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: item.color + '20' }}>
              <item.icon size={14} style={{ color: item.color }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <span className="text-sm font-black text-foreground">{item.value}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: item.color }}
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }} />
              </div>
            </div>
            <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Performance gauge ────────────────────────────────────────────────────────
function PerformanceGauge({ rating, percentile }: { rating: number; percentile: number }) {
  const angle = (rating / 5) * 180 - 90; // -90 to +90 degrees

  const getLabel = (r: number) => {
    if (r >= 4.5) return { label: 'Exceptional', color: '#22c55e' };
    if (r >= 4.0) return { label: 'Excellent', color: '#35c9ff' };
    if (r >= 3.5) return { label: 'Good', color: '#6B4FBB' };
    if (r >= 3.0) return { label: 'Average', color: '#ffd035' };
    return { label: 'Needs Work', color: '#ef4444' };
  };
  const { label, color } = getLabel(rating);

  return (
    <div className="flex flex-col items-center">
      {/* Semi-circle gauge */}
      <div className="relative w-48 h-24 overflow-hidden">
        <svg width="192" height="96" viewBox="0 0 192 96">
          {/* Track */}
          <path d="M 16 96 A 80 80 0 0 1 176 96" fill="none" stroke="hsl(var(--border))" strokeWidth="16" strokeLinecap="round" />
          {/* Colored arc */}
          {[
            { start: 0, end: 0.2, color: '#ef4444' },
            { start: 0.2, end: 0.4, color: '#ffd035' },
            { start: 0.4, end: 0.6, color: '#6B4FBB' },
            { start: 0.6, end: 0.8, color: '#35c9ff' },
            { start: 0.8, end: 1.0, color: '#22c55e' },
          ].map((seg, i) => {
            const r = 80;
            const cx = 96;
            const cy = 96;
            const startAngle = Math.PI + seg.start * Math.PI;
            const endAngle = Math.PI + seg.end * Math.PI;
            const x1 = cx + r * Math.cos(startAngle);
            const y1 = cy + r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(endAngle);
            const y2 = cy + r * Math.sin(endAngle);
            return (
              <motion.path
                key={i}
                d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: i * 0.1 }}
              />
            );
          })}
          {/* Needle */}
          <motion.line
            x1="96" y1="96"
            x2={96 + 60 * Math.cos((Math.PI + (rating / 5) * Math.PI))}
            y2={96 + 60 * Math.sin((Math.PI + (rating / 5) * Math.PI))}
            stroke="hsl(var(--foreground))"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ rotate: -90, originX: '96px', originY: '96px' }}
            animate={{ rotate: angle, originX: '96px', originY: '96px' }}
            transition={{ duration: 1.5, ease: 'easeOut', type: 'spring', stiffness: 60 }}
          />
          <circle cx="96" cy="96" r="6" fill="hsl(var(--foreground))" />
        </svg>
      </div>

      <div className="text-center mt-2">
        <p className="text-3xl font-black" style={{ color, fontFamily: 'var(--font-heading)' }}>{rating.toFixed(1)}</p>
        <p className="text-sm font-bold" style={{ color }}>{label}</p>
        <p className="text-xs text-muted-foreground mt-1">Top {100 - percentile}% of all consultants</p>
      </div>

      <StarRating rating={rating} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConsultantAnalytics() {
  const [data, setData] = useState<AnalyticsData>(MOCK_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/consultant/analytics')
      .then(r => r.json())
      .then((d: Partial<AnalyticsData>) => {
        setData({ ...MOCK_DATA, ...d });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  function exportReport() {
    const lines = [
      'TRICCI Consultant Performance Report',
      `Generated: ${new Date().toLocaleDateString('en-IN')}`,
      '',
      '=== JOBS ===',
      `Jobs Accepted: ${data.jobsAccepted}`,
      `Jobs Live: ${data.jobsLive}`,
      `Jobs Closed: ${data.jobsClosed}`,
      '',
      '=== CV PIPELINE ===',
      `CVs Submitted: ${data.cvsSubmitted}`,
      `CVs Shortlisted: ${data.cvsShortlisted}`,
      `CVs Rejected: ${data.cvsRejected}`,
      '',
      '=== CANDIDATE OUTCOMES ===',
      `Candidates Given: ${data.candidatesGiven}`,
      `Selected: ${data.candidatesSelected}`,
      `Joined: ${data.candidatesJoined}`,
      `Yet to Join: ${data.yetToJoin}`,
      `Backed Out: ${data.candidatesBackedOut}`,
      `Offer Rejected: ${data.offersRejected}`,
      '',
      '=== RATIOS ===',
      `Selection Ratio: ${data.selectionRatio}%`,
      `Rejection Ratio: ${data.rejectionRatio}%`,
      `Pre-screening Ratio: ${data.prescreeningRatio}%`,
      `Resume Selection Ratio: ${data.resumeSelectionRatio}%`,
      '',
      '=== EARNINGS ===',
      `Total Earned: ₹${data.totalEarned.toLocaleString('en-IN')}`,
      `Pending: ₹${data.pendingEarnings.toLocaleString('en-IN')}`,
      '',
      '=== PERFORMANCE ===',
      `Rating: ${data.performanceRating}/5`,
      `Percentile: Top ${100 - data.rankPercentile}%`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tricci-performance-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Performance Analytics</h3>
          <p className="text-sm text-muted-foreground">AI-powered insights into your recruitment performance</p>
        </div>
        <button onClick={exportReport}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <Download size={14} /> Export Report
        </button>
      </div>

      {/* ── Row 1: Top KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Briefcase} label="Jobs Accepted" value={data.jobsAccepted} color="#6B4FBB" trend="up" />
        <KPICard icon={Zap} label="Jobs Live" value={data.jobsLive} color="#E8470A" sub={`${data.jobsClosed} closed`} />
        <KPICard icon={Users} label="CVs Submitted" value={data.cvsSubmitted} color="#35c9ff" trend="up" />
        <KPICard icon={IndianRupee} label="Total Earned" value={data.totalEarned / 100000} prefix="₹" suffix="L" decimals={2} color="#22c55e" trend="up" />
      </div>

      {/* ── Row 2: Performance gauge + Donut + Ratios ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Performance gauge */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4 self-start">
            <Award size={16} className="text-yellow-400" />
            <h4 className="font-black text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Performance Rating</h4>
          </div>
          <PerformanceGauge rating={data.performanceRating} percentile={data.rankPercentile} />
          <div className="mt-4 w-full grid grid-cols-3 gap-2">
            {[
              { label: 'Placements', value: data.candidatesJoined },
              { label: 'Shortlists', value: data.cvsShortlisted },
              { label: 'Mandates', value: data.jobsAccepted },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-2 bg-muted/40 rounded-xl border border-border">
                <p className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Job status donut */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-primary" />
            <h4 className="font-black text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Job Status Breakdown</h4>
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <DonutChart
                size={140}
                thickness={20}
                segments={[
                  { value: data.jobsLive, color: '#E8470A', label: 'Live' },
                  { value: data.jobsClosed, color: '#22c55e', label: 'Closed' },
                  { value: data.jobsAccepted - data.jobsLive - data.jobsClosed, color: '#6B4FBB', label: 'In Progress' },
                ]}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{data.jobsAccepted}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Live / Active', value: data.jobsLive, color: '#E8470A' },
              { label: 'Closed / Filled', value: data.jobsClosed, color: '#22c55e' },
              { label: 'In Progress', value: data.jobsAccepted - data.jobsLive - data.jobsClosed, color: '#6B4FBB' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <span className="text-sm font-bold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CV pipeline donut */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-secondary" />
            <h4 className="font-black text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>CV Pipeline</h4>
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <DonutChart
                size={140}
                thickness={20}
                segments={[
                  { value: data.cvsShortlisted, color: '#6B4FBB', label: 'Shortlisted' },
                  { value: data.cvsRejected, color: '#ef4444', label: 'Rejected' },
                  { value: data.cvsSubmitted - data.cvsShortlisted - data.cvsRejected, color: '#ffd035', label: 'In Review' },
                ]}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{data.cvsSubmitted}</p>
                <p className="text-xs text-muted-foreground">CVs</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Shortlisted', value: data.cvsShortlisted, color: '#6B4FBB' },
              { label: 'Rejected', value: data.cvsRejected, color: '#ef4444' },
              { label: 'In Review', value: data.cvsSubmitted - data.cvsShortlisted - data.cvsRejected, color: '#ffd035' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <span className="text-sm font-bold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Pipeline funnel + Outcome breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Target size={16} className="text-primary" />
            <h4 className="font-black text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Recruitment Funnel</h4>
          </div>
          <PipelineFunnel data={data} />
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users size={16} className="text-secondary" />
            <h4 className="font-black text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Candidate Outcomes</h4>
          </div>
          <OutcomeBreakdown data={data} />

          {/* Summary row */}
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/40 rounded-xl border border-border text-center">
              <p className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{data.candidatesGiven}</p>
              <p className="text-xs text-muted-foreground">Total Given</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-center">
              <p className="text-xl font-black text-green-400" style={{ fontFamily: 'var(--font-heading)' }}>{data.candidatesJoined}</p>
              <p className="text-xs text-muted-foreground">Joined</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Performance meters ── */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={16} className="text-primary" />
          <h4 className="font-black text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Performance Meters</h4>
          <span className="ml-auto text-xs text-muted-foreground">Industry benchmark: 25–35%</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <MeterBar
            label="Resume Selection Ratio"
            value={data.resumeSelectionRatio}
            color="#6B4FBB"
            sublabel={`${data.cvsShortlisted} of ${data.cvsSubmitted} CVs shortlisted`}
          />
          <MeterBar
            label="Pre-screening Ratio"
            value={data.prescreeningRatio}
            color="#E8470A"
            sublabel="Candidates cleared initial screen"
          />
          <MeterBar
            label="Selection Ratio"
            value={data.selectionRatio}
            color="#35c9ff"
            sublabel={`${data.candidatesSelected} of ${data.candidatesGiven} selected`}
          />
          <MeterBar
            label="Rejection Ratio"
            value={data.rejectionRatio}
            color="#ef4444"
            sublabel={`${data.cvsRejected} of ${data.cvsSubmitted} rejected`}
          />
        </div>
      </div>

      {/* ── Row 5: Earnings + Quick stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Earnings card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-primary/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <IndianRupee size={16} className="text-primary" />
            <h4 className="font-black text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Earnings Overview</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Earned (All Time)</p>
              <p className="text-3xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                ₹{(data.totalEarned / 100000).toFixed(2)}L
              </p>
              <p className="text-xs text-green-400 mt-1 flex items-center gap-1"><TrendingUp size={11} /> +18% vs last quarter</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pending Payout</p>
              <p className="text-3xl font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                ₹{(data.pendingEarnings / 100000).toFixed(2)}L
              </p>
              <p className="text-xs text-muted-foreground mt-1">Expected within 7 days</p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round((data.totalEarned / (data.totalEarned + data.pendingEarnings)) * 100)}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">Received</span>
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h4 className="font-black text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Quick Stats</h4>
          {[
            { label: 'Avg. time to close', value: '18 days', icon: Clock, color: '#ffd035' },
            { label: 'Offer acceptance rate', value: '72%', icon: CheckCircle, color: '#22c55e' },
            { label: 'Backout rate', value: '18%', icon: TrendingDown, color: '#ef4444' },
            { label: 'Avg. CTC placed', value: '₹28 LPA', icon: IndianRupee, color: '#6B4FBB' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: color + '20' }}>
                <Icon size={14} style={{ color }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-bold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
