import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  XCircle, CheckCircle, PlusCircle, Building2, MapPin,
  IndianRupee, Maximize2, Minimize2, Edit3, Briefcase,
  Upload, FileText, Pen, AlertCircle,
} from 'lucide-react';
import { Helmet } from '@dr.pogodin/react-helmet';

interface PostJobModalProps {
  onClose: () => void;
  onPosted: (jobCode: string) => void;
}

function generateJobCode(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `TRC-${year}-${num}`;
}

const EXPERIENCE_OPTIONS = [
  '0–1 years', '1–2 years', '2–4 years', '3–5 years',
  '4–6 years', '5–8 years', '6–10 years', '8–12 years',
  '10–15 years', '12+ years', '15+ years',
];

export default function PostJobModal({ onClose, onPosted }: PostJobModalProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [postedJobCode, setPostedJobCode] = useState('');
  const [previewExpanded, setPreviewExpanded] = useState(false);

  // JD mode: 'write' or 'upload'
  const [jdMode, setJdMode] = useState<'write' | 'upload'>('write');
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdUploading, setJdUploading] = useState(false);
  const [jdUploadError, setJdUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', department: '', location: '', locationType: 'hybrid',
    ctcMin: '', ctcMax: '', fee: '8', description: '', skills: '',
    experience: '', responsibilities: '', requirements: '', visibility: 'public',
    paymentTermDays: '45',
  });
  const [rounds, setRounds] = useState<{ label: string; description: string }[]>([
    { label: 'HR Screening', description: 'Initial call to assess fitment and expectations' },
    { label: 'Technical Round', description: 'In-depth technical assessment' },
  ]);

  function addRound() { setRounds(r => [...r, { label: '', description: '' }]); }
  function removeRound(i: number) { setRounds(r => r.filter((_, idx) => idx !== i)); }
  function updateRound(i: number, key: 'label' | 'description', val: string) {
    setRounds(r => r.map((round, idx) => idx === i ? { ...round, [key]: val } : round));
  }
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const [jdRawText, setJdRawText] = useState('');

  // Handle JD file upload — parse and auto-fill ALL fields
  async function handleJdFile(file: File) {
    setJdFile(file);
    setJdUploadError(null);
    setJdUploading(true);
    try {
      const formData = new FormData();
      formData.append('jd', file);
      const res = await fetch('/api/jobs/parse-jd', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json() as {
          title?: string; department?: string; location?: string;
          experience?: string; skills?: string; description?: string;
          responsibilities?: string; requirements?: string; rawText?: string;
        };
        if (data.rawText) setJdRawText(data.rawText);
        // Auto-fill every field that was parsed — only overwrite if currently empty
        setForm(f => ({
          ...f,
          title: f.title || data.title || f.title,
          department: f.department || data.department || f.department,
          location: f.location || data.location || f.location,
          experience: f.experience || data.experience || f.experience,
          skills: f.skills || data.skills || f.skills,
          description: data.description || data.rawText?.slice(0, 3000) || f.description,
          responsibilities: f.responsibilities || data.responsibilities || f.responsibilities,
          requirements: f.requirements || data.requirements || f.requirements,
        }));
        setJdMode('write'); // switch to write mode so they can review/edit extracted content
      } else {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        setJdUploadError(errData.error || 'Could not parse this file. Please type the JD manually.');
      }
    } catch {
      setJdUploadError('Upload failed. Please type or paste the JD manually.');
    } finally {
      setJdUploading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const jobCode = generateJobCode();
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          department: form.department,
          location: form.location,
          locationType: form.locationType,
          ctcMin: form.ctcMin ? Number(form.ctcMin) : 0,
          ctcMax: form.ctcMax ? Number(form.ctcMax) : 0,
          description: form.description || jdRawText,
          skills: form.skills,
          feePercent: Number(form.fee),
          paymentTermDays: Number(form.paymentTermDays),
          experience: form.experience,
          responsibilities: form.responsibilities,
          requirements: form.requirements,
          interviewRounds: rounds.filter(r => r.label.trim()),
          jobCode,
          visibility: form.visibility,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Failed to post job');
      }
      setPostedJobCode(jobCode);
      setSuccess(true);
      onPosted(jobCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Helmet>
          <title>Post a Job — Employer Dashboard — TRICCI</title>
          <meta name="description" content="Post a new job opening and manage applications on TRICCI." />
          <link rel="canonical" href="https://tricci.in/employer/dashboard" />
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="sr-only">Post a Job — TRICCI Employer Dashboard</h1>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative bg-card border border-border rounded-2xl w-full max-w-sm p-8 text-center shadow-2xl"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-400" />
          </div>
          <h2 className="text-xl font-black text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Job Posted!</h2>
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 mb-3">
            <Briefcase size={14} className="text-primary" />
            <span className="text-sm font-black text-primary">{postedJobCode}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Your role is now live and visible to verified consultants on TRICCI.</p>
          <button onClick={onClose}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
            Done
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Step 3 Full-Screen Preview ──────────────────────────────────────────────
  if (step === 3 && previewExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        <div className="sticky top-0 z-10 bg-card border-b border-border flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Briefcase size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Full Job Preview</p>
              <p className="text-xs text-muted-foreground">This is exactly how consultants and candidates will see this role</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setPreviewExpanded(false); setStep(2); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors">
              <Edit3 size={13} /> Edit Job
            </button>
            <button onClick={() => setPreviewExpanded(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors">
              <Minimize2 size={13} /> Collapse
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60">
              {submitting ? 'Posting…' : 'Confirm & Post Job'}
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Job Code Banner */}
          <div className="flex items-center gap-3 bg-primary/8 border border-primary/20 rounded-xl px-5 py-3 mb-6">
            <Briefcase size={16} className="text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Auto-generated Job Code</p>
              <p className="text-sm font-black text-primary">TRC-{new Date().getFullYear()}-XXXX (assigned on post)</p>
            </div>
          </div>

          {/* Title block */}
          <div className="mb-6">
            <h1 className="text-3xl font-black text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              {form.title || 'Untitled Role'}
            </h1>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {form.department && <span className="flex items-center gap-1.5"><Building2 size={14} />{form.department}</span>}
              <span className="flex items-center gap-1.5"><MapPin size={14} />{form.location}</span>
              <span className="capitalize px-3 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/20 text-xs font-semibold">{form.locationType}</span>
              {(form.ctcMin || form.ctcMax) && (
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  <IndianRupee size={14} />₹{form.ctcMin || '?'}–{form.ctcMax || '?'} LPA
                </span>
              )}
              {form.experience && (
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  {form.experience} experience
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {form.description && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h2 className="text-base font-black text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>About the Role</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{form.description}</p>
                </div>
              )}
              {form.responsibilities && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h2 className="text-base font-black text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Key Responsibilities</h2>
                  <ul className="space-y-2">
                    {form.responsibilities.split('\n').filter(Boolean).map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {form.requirements && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h2 className="text-base font-black text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Requirements</h2>
                  <ul className="space-y-2">
                    {form.requirements.split('\n').filter(Boolean).map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle size={13} className="text-green-400 mt-0.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rounds.filter(r => r.label.trim()).length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h2 className="text-base font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Interview Process</h2>
                  <div className="space-y-3">
                    {rounds.filter(r => r.label.trim()).map((r, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-black text-primary shrink-0 mt-0.5">{i + 1}</div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{r.label}</p>
                          {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {form.skills && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="text-sm font-black text-foreground mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {form.skills.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-primary/8 border border-primary/20 rounded-2xl p-5">
                <h3 className="text-sm font-black text-foreground mb-2">Placement Fee</h3>
                <p className="text-2xl font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>{form.fee}%</p>
                <p className="text-xs text-muted-foreground mt-1">of first-year CTC, payable on successful placement only</p>
              </div>
              {form.experience && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="text-sm font-black text-foreground mb-1">Experience Required</h3>
                  <p className="text-sm font-semibold text-foreground">{form.experience}</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-6 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <XCircle size={15} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Normal Modal (Steps 1–3) ────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Post a New Job</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Step {step} of 3 — {step === 1 ? 'Basic Details' : step === 2 ? 'Job Description' : 'Preview & Confirm'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <XCircle size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full"
              animate={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
              transition={{ duration: 0.3 }} />
          </div>
          <div className="flex justify-between mt-1.5">
            {['Basic Details', 'Job Description', 'Preview'].map((label, i) => (
              <span key={label} className={`text-xs font-semibold ${step === i + 1 ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* ── STEP 1: Basic Details ── */}
          {step === 1 && (
            <>
              {/* Job Title */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Job Title *</label>
                <input value={form.title} onChange={e => update('title', e.target.value)}
                  placeholder="e.g. Senior Product Manager"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
              </div>

              {/* Department + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Department</label>
                  <input value={form.department} onChange={e => update('department', e.target.value)}
                    placeholder="e.g. Engineering"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Location *</label>
                  <input value={form.location} onChange={e => update('location', e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>

              {/* Work Type */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Work Type</label>
                <div className="flex gap-2">
                  {(['onsite', 'hybrid', 'remote'] as const).map(t => (
                    <button key={t} type="button" onClick={() => update('locationType', t)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border capitalize transition-colors ${form.locationType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Job Visibility */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Job Visibility</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'public', label: 'Public', hint: 'Shown to everyone' },
                    { value: 'consultant_only', label: 'Consultants Only', hint: 'Hidden from candidates' },
                    { value: 'confidential', label: 'Confidential', hint: 'Company name hidden too' },
                  ] as const).map(opt => (
                    <button key={opt.value} type="button" onClick={() => update('visibility', opt.value)}
                      className={`text-left p-3 rounded-xl border transition-colors ${form.visibility === opt.value ? 'bg-primary/10 border-primary' : 'bg-muted border-border hover:border-primary/40'}`}>
                      <p className={`text-xs font-bold ${form.visibility === opt.value ? 'text-primary' : 'text-foreground'}`}>{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* CTC Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">CTC Min (LPA)</label>
                  <input value={form.ctcMin} onChange={e => update('ctcMin', e.target.value)}
                    placeholder="e.g. 20" type="number"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">CTC Max (LPA)</label>
                  <input value={form.ctcMax} onChange={e => update('ctcMax', e.target.value)}
                    placeholder="e.g. 30" type="number"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>

              {/* Experience Required — dropdown */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Experience Required *</label>
                <div className="relative">
                  <select
                    value={form.experience}
                    onChange={e => update('experience', e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">Select experience range</option>
                    {EXPERIENCE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Can&rsquo;t find your range? Type it below</p>
                <input value={EXPERIENCE_OPTIONS.includes(form.experience) ? '' : form.experience}
                  onChange={e => update('experience', e.target.value)}
                  placeholder="Or type custom range e.g. 7–9 years"
                  className="w-full mt-2 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
              </div>
            </>
          )}

          {/* ── STEP 2: Job Description ── */}
          {step === 2 && (
            <>
              {/* JD Mode Toggle */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Job Description *</label>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setJdMode('write')}
                    className={`flex items-center gap-2 flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${jdMode === 'write' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
                    <Pen size={13} /> Write / Paste JD
                  </button>
                  <button type="button" onClick={() => setJdMode('upload')}
                    className={`flex items-center gap-2 flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${jdMode === 'upload' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
                    <Upload size={13} /> Attach JD (PDF / DOC)
                  </button>
                </div>

                {/* Write mode */}
                {jdMode === 'write' && (
                  <>
                    {jdFile && (
                      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2.5 mb-2">
                        <FileText size={13} className="text-green-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-green-400 font-semibold truncate">{jdFile.name} — parsed &amp; fields auto-filled</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Review and edit the extracted content below before proceeding</p>
                        </div>
                        <button type="button" onClick={() => { setJdFile(null); setJdRawText(''); }}
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                          <XCircle size={13} />
                        </button>
                      </div>
                    )}
                    <textarea value={form.description} onChange={e => update('description', e.target.value)}
                      placeholder="Describe the role, its impact, what success looks like, team structure, and growth opportunities..."
                      rows={7}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-y min-h-[140px]" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {form.description.length > 0 ? `${form.description.length} characters` : 'Tip: A detailed JD attracts better-matched candidates from consultants'}
                    </p>
                  </>
                )}

                {/* Upload mode */}
                {jdMode === 'upload' && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleJdFile(file);
                      }}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      {jdUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <p className="text-sm text-muted-foreground">Extracting text from JD…</p>
                        </div>
                      ) : jdFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                            <FileText size={22} className="text-green-400" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">{jdFile.name}</p>
                          <p className="text-xs text-muted-foreground">Click to replace</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center">
                            <Upload size={22} className="text-muted-foreground" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">Click to upload JD</p>
                          <p className="text-xs text-muted-foreground">PDF, DOC, DOCX or TXT — max 5 MB</p>
                          <p className="text-xs text-muted-foreground mt-1">Text will be auto-extracted and pre-filled for you to review</p>
                        </div>
                      )}
                    </div>
                    {jdUploadError && (
                      <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2.5 mt-2">
                        <AlertCircle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-400">{jdUploadError}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Responsibilities */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Key Responsibilities</label>
                <textarea value={form.responsibilities} onChange={e => update('responsibilities', e.target.value)}
                  placeholder="• Lead cross-functional product teams&#10;• Define and own the product roadmap&#10;• Work closely with engineering and design"
                  rows={4}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none" />
                <p className="text-xs text-muted-foreground mt-1">One responsibility per line — shown as bullet points</p>
              </div>

              {/* Requirements */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Requirements</label>
                <textarea value={form.requirements} onChange={e => update('requirements', e.target.value)}
                  placeholder="• 5+ years of product management experience&#10;• Strong analytical and data skills&#10;• Excellent communication skills"
                  rows={4}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none" />
                <p className="text-xs text-muted-foreground mt-1">One requirement per line — shown with checkmarks</p>
              </div>

              {/* Skills */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Required Skills</label>
                <input value={form.skills} onChange={e => update('skills', e.target.value)}
                  placeholder="e.g. React, Node.js, System Design, AWS"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                <p className="text-xs text-muted-foreground mt-1">Separate skills with commas</p>
              </div>

              {/* Placement Fee */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Placement Fee: <span className="text-primary font-black">{form.fee}% of first-year CTC</span>
                </label>
                <input type="range" min="5" max="35" step="0.5" value={form.fee}
                  onChange={e => update('fee', e.target.value)} className="w-full accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5%</span>
                  <span className="text-primary font-semibold">Payable only on successful placement</span>
                  <span>35%</span>
                </div>
              </div>

              {/* Payment Term */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Payment Term</label>
                <p className="text-xs text-muted-foreground mb-2">Days from candidate's joining date until the placement fee is due</p>
                <div className="flex items-center gap-2">
                  {['45', '90'].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => update('paymentTermDays', days)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                        form.paymentTermDays === days ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Interview Rounds */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-foreground">Interview Rounds</label>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30">
                      {rounds.filter(r => r.label.trim()).length} round{rounds.filter(r => r.label.trim()).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button type="button" onClick={addRound}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity">
                    <PlusCircle size={13} /> Add Round
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">These rounds will appear in the ATS pipeline for this job. Consultants and candidates will be informed at each stage.</p>
                <div className="space-y-3">
                  {rounds.map((round, i) => (
                    <div key={i} className="flex gap-2 items-start bg-muted/40 border border-border rounded-xl p-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-black text-primary mt-0.5">{i + 1}</div>
                      <div className="flex-1 space-y-2">
                        <input value={round.label} onChange={e => updateRound(i, 'label', e.target.value)}
                          placeholder={`Round ${i + 1} name`}
                          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                        <input value={round.description} onChange={e => updateRound(i, 'description', e.target.value)}
                          placeholder="Brief description (optional)"
                          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                      </div>
                      {rounds.length > 1 && (
                        <button type="button" onClick={() => removeRound(i)}
                          className="w-6 h-6 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors mt-0.5 flex-shrink-0">
                          <XCircle size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <XCircle size={15} className="text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </>
          )}

          {/* ── STEP 3: Compact Preview ── */}
          {step === 3 && (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-foreground">Job Preview</p>
                <button onClick={() => setPreviewExpanded(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity">
                  <Maximize2 size={13} /> Full Preview
                </button>
              </div>

              {/* Compact preview card */}
              <div className="bg-muted/40 border border-border rounded-xl p-5 space-y-4">
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                      {form.title || 'Untitled Role'}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 font-semibold shrink-0">Live on Post</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {form.department && <span className="flex items-center gap-1"><Building2 size={10} />{form.department}</span>}
                    <span className="flex items-center gap-1"><MapPin size={10} />{form.location}</span>
                    <span className="capitalize px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/20 font-semibold">{form.locationType}</span>
                    {form.experience && <span className="px-2 py-0.5 rounded-full bg-muted border border-border font-semibold">{form.experience}</span>}
                  </div>
                </div>

                {/* CTC + Fee row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">CTC Range</p>
                    <p className="text-sm font-black text-foreground">
                      {form.ctcMin || form.ctcMax ? `₹${form.ctcMin || '?'}–${form.ctcMax || '?'} LPA` : 'Not specified'}
                    </p>
                  </div>
                  <div className="bg-primary/8 border border-primary/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Placement Fee</p>
                    <p className="text-sm font-black text-primary">{form.fee}% of CTC</p>
                  </div>
                </div>

                {/* Description — full, not clamped */}
                {form.description && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">Job Description</p>
                    <div className="bg-card border border-border rounded-lg px-4 py-3 max-h-48 overflow-y-auto">
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{form.description}</p>
                    </div>
                    {jdFile && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <FileText size={11} className="text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Source: {jdFile.name}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Responsibilities preview */}
                {form.responsibilities && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">Key Responsibilities</p>
                    <ul className="space-y-1">
                      {form.responsibilities.split('\n').filter(Boolean).slice(0, 4).map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          {r.replace(/^[•\-\*]\s*/, '')}
                        </li>
                      ))}
                      {form.responsibilities.split('\n').filter(Boolean).length > 4 && (
                        <li className="text-xs text-muted-foreground opacity-60">+{form.responsibilities.split('\n').filter(Boolean).length - 4} more…</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Skills */}
                {form.skills && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.skills.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interview rounds */}
                {rounds.filter(r => r.label.trim()).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">Interview Process ({rounds.filter(r => r.label.trim()).length} rounds)</p>
                    <div className="space-y-1">
                      {rounds.filter(r => r.label.trim()).map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                          {r.label}
                          {r.description && <span className="text-muted-foreground/60">— {r.description}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Edit prompt */}
              <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-4 py-3">
                <Edit3 size={14} className="text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Need changes?{' '}
                  <button onClick={() => setStep(1)} className="text-primary font-semibold hover:underline">Edit Basic Details</button>
                  {' '}or{' '}
                  <button onClick={() => setStep(2)} className="text-primary font-semibold hover:underline">Edit Job Description</button>
                  {' '}or use{' '}
                  <button onClick={() => setPreviewExpanded(true)} className="text-primary font-semibold hover:underline">Full Preview</button>.
                </p>
              </div>

              {/* Confirm notice */}
              <div className="bg-green-500/8 border border-green-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
                <CheckCircle size={15} className="text-green-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This job will be <span className="font-bold text-foreground">immediately visible</span> to verified consultants on TRICCI. A unique job code will be auto-assigned. You can pause or close it anytime.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <XCircle size={15} className="text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0 sticky bottom-0 bg-card border-t border-border mt-2">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} disabled={submitting}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50">
              ← Back
            </button>
          )}
          <button
            onClick={() => {
              if (step === 1) {
                if (!form.title.trim()) { setError('Job title is required'); return; }
                if (!form.location.trim()) { setError('Location is required'); return; }
                if (!form.experience) { setError('Please select an experience range'); return; }
                setError(null); setStep(2);
              } else if (step === 2) {
                if (!form.description.trim() && !jdFile) { setError('Please write a job description or attach a JD file'); return; }
                setError(null); setStep(3);
              } else {
                handleSubmit();
              }
            }}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"</div>div></div>
            >
            {submitting ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Posting…</>
            ) : step === 1 ? 'Next: Job Description →' : step === 2 ? 'Preview Job →' : 'Confirm & Post Job'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
