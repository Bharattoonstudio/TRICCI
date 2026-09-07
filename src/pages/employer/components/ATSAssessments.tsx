import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, CheckCircle, Clock, AlertCircle, TrendingUp,
  Plus, X, Loader2, ChevronDown,
} from 'lucide-react';
import { Helmet } from '@dr.pogodin/react-helmet';
import type { SubmissionRecord } from './types.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RealAssessment {
  id: number;
  submissionId: number | null;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  type: string;
  score: number;
  maxScore: number;
  status: 'pending' | 'completed' | 'expired';
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface RealScorecard {
  id: number;
  submissionId: number | null;
  candidateName: string;
  jobTitle: string;
  technicalScore: number;
  communicationScore: number;
  cultureFitScore: number;
  leadershipScore: number;
  overallScore: number;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
  notes: string | null;
  submittedBy: string | null;
  createdAt: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ score, max = 100, color = '#E8470A' }: { score: number; max?: number; color?: string }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold text-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

const RECOMMENDATION_MAP = {
  strong_yes: { label: 'Strong Yes', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  yes:        { label: 'Yes',        className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  maybe:      { label: 'Maybe',      className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  no:         { label: 'No',         className: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const ASSESSMENT_TYPES = [
  'Technical', 'Aptitude', 'Coding', 'Case Study',
  'Domain Knowledge', 'Psychometric', 'Communication', 'Other',
];

// ── Assessment Create Form ────────────────────────────────────────────────────

interface AssessmentFormProps {
  submissions: SubmissionRecord[];
  onClose: () => void;
  onCreated: () => void;
}

function AssessmentForm({ submissions, onClose, onCreated }: AssessmentFormProps) {
  const [submissionId, setSubmissionId] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [type, setType] = useState('Technical');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [status, setStatus] = useState<'pending' | 'completed'>('pending');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill from selected submission
  function handleSubmissionChange(id: string) {
    setSubmissionId(id);
    if (!id) return;
    const sub = submissions.find(s => String(s.id) === id);
    if (sub) {
      setCandidateName(sub.candidateName);
      setCandidateEmail(sub.candidateEmail);
      setJobTitle(sub.jobTitle);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/employer/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submissionId ? parseInt(submissionId, 10) : undefined,
          candidateName,
          candidateEmail,
          jobTitle,
          type,
          score: score ? parseInt(score, 10) : 0,
          maxScore: parseInt(maxScore, 10) || 100,
          status,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? 'Failed to save');
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-primary" />
            <h2 className="font-black text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
              Add Assessment
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Link to submission */}
          {submissions.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Link to Submission <span className="text-muted-foreground font-normal">(optional — auto-fills candidate details)</span>
              </label>
              <div className="relative">
                <select value={submissionId} onChange={e => handleSubmissionChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">— Select submission —</option>
                  {submissions.map(s => (
                    <option key={s.id} value={s.id}>{s.candidateName} — {s.jobTitle}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          {/* Candidate details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Candidate Name *</label>
              <input required value={candidateName} onChange={e => setCandidateName(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Email *</label>
              <input required type="email" value={candidateEmail} onChange={e => setCandidateEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="email@example.com" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Job Title *</label>
            <input required value={jobTitle} onChange={e => setJobTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. Senior Backend Engineer" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Assessment Type</label>
              <div className="relative">
                <select value={type} onChange={e => setType(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/40">
                  {ASSESSMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Status</label>
              <div className="relative">
                <select value={status} onChange={e => setStatus(e.target.value as 'pending' | 'completed')}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {status === 'completed' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Score</label>
                <input type="number" min="0" value={score} onChange={e => setScore(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Max Score</label>
                <input type="number" min="1" value={maxScore} onChange={e => setMaxScore(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="100" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Optional notes about this assessment…" />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Assessment'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Scorecard Create Form ─────────────────────────────────────────────────────

interface ScorecardFormProps {
  submissions: SubmissionRecord[];
  onClose: () => void;
  onCreated: () => void;
}

function ScorecardForm({ submissions, onClose, onCreated }: ScorecardFormProps) {
  const [submissionId, setSubmissionId] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [technicalScore, setTechnicalScore] = useState(70);
  const [communicationScore, setCommunicationScore] = useState(70);
  const [cultureFitScore, setCultureFitScore] = useState(70);
  const [leadershipScore, setLeadershipScore] = useState(70);
  const [recommendation, setRecommendation] = useState<'strong_yes' | 'yes' | 'maybe' | 'no'>('yes');
  const [notes, setNotes] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const overallPreview = Math.round(
    technicalScore * 0.4 + communicationScore * 0.25 + cultureFitScore * 0.2 + leadershipScore * 0.15
  );

  function handleSubmissionChange(id: string) {
    setSubmissionId(id);
    if (!id) return;
    const sub = submissions.find(s => String(s.id) === id);
    if (sub) {
      setCandidateName(sub.candidateName);
      setCandidateEmail(sub.candidateEmail);
      setJobTitle(sub.jobTitle);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/employer/scorecards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submissionId ? parseInt(submissionId, 10) : undefined,
          candidateName,
          candidateEmail,
          jobTitle,
          technicalScore,
          communicationScore,
          cultureFitScore,
          leadershipScore,
          recommendation,
          notes: notes || undefined,
          submittedBy: submittedBy || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? 'Failed to save');
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function ScoreSlider({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-foreground">{label}</label>
          <span className="text-xs font-black text-foreground">{value}/100</span>
        </div>
        <input type="range" min="0" max="100" value={value} onChange={e => onChange(parseInt(e.target.value, 10))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: color }} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="font-black text-foreground text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
              Submit Scorecard
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {submissions.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Link to Submission <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="relative">
                <select value={submissionId} onChange={e => handleSubmissionChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">— Select submission —</option>
                  {submissions.map(s => (
                    <option key={s.id} value={s.id}>{s.candidateName} — {s.jobTitle}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Candidate Name *</label>
              <input required value={candidateName} onChange={e => setCandidateName(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Email *</label>
              <input required type="email" value={candidateEmail} onChange={e => setCandidateEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="email@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Job Title *</label>
              <input required value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Role applied for" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Interviewer Name</label>
              <input value={submittedBy} onChange={e => setSubmittedBy(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Your name" />
            </div>
          </div>

          {/* Score sliders */}
          <div className="bg-background border border-border rounded-xl p-4 space-y-4">
            <ScoreSlider label="Technical Skills (40%)" value={technicalScore} onChange={setTechnicalScore} color="#E8470A" />
            <ScoreSlider label="Communication (25%)" value={communicationScore} onChange={setCommunicationScore} color="#6B4FBB" />
            <ScoreSlider label="Culture Fit (20%)" value={cultureFitScore} onChange={setCultureFitScore} color="#22c55e" />
            <ScoreSlider label="Leadership (15%)" value={leadershipScore} onChange={setLeadershipScore} color="#3b82f6" />
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Overall Score</span>
              <span className="text-xl font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                {overallPreview}<span className="text-sm text-muted-foreground font-normal">/100</span>
              </span>
            </div>
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">Recommendation</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(RECOMMENDATION_MAP) as [keyof typeof RECOMMENDATION_MAP, { label: string; className: string }][]).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => setRecommendation(key)}
                  className={`px-2 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    recommendation === key ? cfg.className : 'border-border text-muted-foreground hover:text-foreground'
                  }`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Panel Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Key observations, strengths, concerns…" />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Submit Scorecard'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ATSAssessmentsProps {
  submissions?: SubmissionRecord[];
}

export default function ATSAssessments({ submissions = [] }: ATSAssessmentsProps) {
  const [activeTab, setActiveTab] = useState<'assessments' | 'scorecards'>('assessments');
  const [assessments, setAssessments] = useState<RealAssessment[]>([]);
  const [scorecards, setScorecards] = useState<RealScorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showScorecardForm, setShowScorecardForm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        fetch('/api/employer/assessments'),
        fetch('/api/employer/scorecards'),
      ]);
      if (aRes.ok) {
        const d = await aRes.json() as { assessments: RealAssessment[] };
        setAssessments(d.assessments ?? []);
      }
      if (sRes.ok) {
        const d = await sRes.json() as { scorecards: RealScorecard[] };
        setScorecards(d.scorecards ?? []);
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>ATS Assessments — Employer Dashboard — TRICCI</title>
        <meta name="description" content="Manage candidate assessments and scorecards in the TRICCI employer ATS pipeline." />
        <link rel="canonical" href="https://tricci.in/employer/dashboard" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="sr-only">ATS Assessments — TRICCI Employer Dashboard</h1>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Assessments & Scorecards
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">Track candidate assessments and panel scorecards</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted border border-border rounded-xl p-1">
            {(['assessments', 'scorecards'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => activeTab === 'assessments' ? setShowAssessmentForm(true) : setShowScorecardForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity">
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {/* ── Assessments Tab ── */}
      {activeTab === 'assessments' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Sent',  value: assessments.length,                                          icon: ClipboardList, color: '#6B4FBB' },
              { label: 'Completed',   value: assessments.filter(a => a.status === 'completed').length,    icon: CheckCircle,   color: '#22c55e' },
              { label: 'Pending',     value: assessments.filter(a => a.status === 'pending').length,      icon: Clock,         color: '#eab308' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <s.icon size={18} className="mx-auto mb-2" style={{ color: s.color }} />
                <p className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin text-primary" />
              </div>
            ) : assessments.length === 0 ? (
              <div className="py-16 text-center">
                <ClipboardList size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground text-sm font-semibold mb-1">No assessments yet</p>
                <p className="text-xs text-muted-foreground mb-4">Add an assessment to start tracking candidate scores.</p>
                <button onClick={() => setShowAssessmentForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity">
                  <Plus size={13} /> Add First Assessment
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-4">Candidate</th>
                      <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden md:table-cell">Type</th>
                      <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4">Score</th>
                      <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden sm:table-cell">Status</th>
                      <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-4 hidden lg:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {assessments.map(a => (
                      <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-foreground text-sm">{a.candidateName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.jobTitle}</p>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <span className="text-sm text-foreground">{a.type}</span>
                        </td>
                        <td className="px-4 py-4">
                          {a.status === 'completed' ? (
                            <div className="w-32">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-black text-foreground">{a.score}/{a.maxScore}</span>
                                <span className={`text-xs font-bold ${a.score / a.maxScore >= 0.8 ? 'text-green-400' : a.score / a.maxScore >= 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                                  {Math.round((a.score / a.maxScore) * 100)}%
                                </span>
                              </div>
                              <ScoreBar score={a.score} max={a.maxScore}
                                color={a.score / a.maxScore >= 0.8 ? '#22c55e' : a.score / a.maxScore >= 0.6 ? '#eab308' : '#ef4444'} />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            a.status === 'completed' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                            a.status === 'pending'   ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                                                       'bg-red-500/15 text-red-400 border-red-500/30'
                          }`}>{a.status}</span>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {a.completedAt
                              ? new Date(a.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Scorecards Tab ── */}
      {activeTab === 'scorecards' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : scorecards.length === 0 ? (
            <div className="py-16 text-center bg-card border border-border rounded-2xl">
              <TrendingUp size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm font-semibold mb-1">No scorecards yet</p>
              <p className="text-xs text-muted-foreground mb-4">Submit a panel scorecard after each interview round.</p>
              <button onClick={() => setShowScorecardForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity">
                <Plus size={13} /> Submit First Scorecard
              </button>
            </div>
          ) : (
            scorecards.map(sc => {
              const rec = RECOMMENDATION_MAP[sc.recommendation as keyof typeof RECOMMENDATION_MAP] ?? RECOMMENDATION_MAP.maybe;
              return (
                <motion.div key={sc.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-black text-primary">
                          {sc.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-black text-foreground text-sm">{sc.candidateName}</p>
                        <p className="text-xs text-muted-foreground">{sc.jobTitle}</p>
                        {sc.submittedBy && (
                          <p className="text-xs text-muted-foreground">by {sc.submittedBy}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <TrendingUp size={14} className="text-primary" />
                        <span className="text-2xl font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                          {sc.overallScore}
                        </span>
                        <span className="text-sm text-muted-foreground">/100</span>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${rec.className}`}>
                        {rec.label}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {[
                      { label: 'Technical Skills', score: sc.technicalScore,     color: '#E8470A' },
                      { label: 'Communication',    score: sc.communicationScore, color: '#6B4FBB' },
                      { label: 'Culture Fit',      score: sc.cultureFitScore,    color: '#22c55e' },
                      { label: 'Leadership',       score: sc.leadershipScore,    color: '#3b82f6' },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-foreground">{item.label}</span>
                          <span className="text-xs font-bold text-foreground">{item.score}/100</span>
                        </div>
                        <ScoreBar score={item.score} color={item.color} />
                      </div>
                    ))}
                  </div>

                  {sc.notes && (
                    <div className="bg-muted/40 border border-border rounded-xl p-3">
                      <p className="text-xs font-semibold text-foreground mb-1">Panel Notes</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{sc.notes}</p>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAssessmentForm && (
          <AssessmentForm
            submissions={submissions}
            onClose={() => setShowAssessmentForm(false)}
            onCreated={() => { setShowAssessmentForm(false); void loadData(); }}
          />
        )}
        {showScorecardForm && (
          <ScorecardForm
            submissions={submissions}
            onClose={() => setShowScorecardForm(false)}
            onCreated={() => { setShowScorecardForm(false); void loadData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
