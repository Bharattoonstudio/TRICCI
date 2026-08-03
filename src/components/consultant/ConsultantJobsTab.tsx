import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Filter, Briefcase, MapPin, Building2, Clock,
  CheckCircle, Star, Zap, Send, XCircle, Loader2,
  ListChecks, Download, ChevronDown, BookmarkPlus,
  IndianRupee, Paperclip, Lock, Info, Navigation
} from 'lucide-react';
import type { Job } from '@/server/api/jobs/GET';

// ─── Types ────────────────────────────────────────────────────────────────────
type UrgencyLevel = 'high' | 'medium' | 'low';
type JobTab = 'new' | 'accepted' | 'mapped' | 'favourites';

interface EnrichedJob extends Job {
  urgency: UrgencyLevel;
  accepted?: boolean;
  mapped?: boolean;
  favourite?: boolean;
  mappedCandidates?: number;
  acceptedDate?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function jobUrgency(job: Job): UrgencyLevel {
  if (job.postedDays <= 3) return 'high';
  if (job.postedDays <= 7) return 'medium';
  return 'low';
}

function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  const map: Record<UrgencyLevel, { label: string; className: string }> = {
    high: { label: 'Urgent', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
    medium: { label: 'Active', className: 'bg-primary/15 text-primary border-primary/30' },
    low: { label: 'Open', className: 'bg-muted text-muted-foreground border-border' },
  };
  const s = map[urgency];
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.className}`}>
      {s.label}
    </span>
  );
}

// ─── Submit Candidate Modal ───────────────────────────────────────────────────
function SubmitCandidateModal({ job, consultantFeePct, onClose }: {
  job: EnrichedJob;
  consultantFeePct: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', currentCTC: '', expectedCTC: '', experience: '', notes: '',
    address: '', city: '', state: '', pincode: '',
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function handleFileSelect(file: File | null) {
    setCvError('');
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
      setCvError('Only PDF, DOC, or DOCX files are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCvError('File must be under 5 MB.');
      return;
    }
    setCvFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files[0] ?? null);
  }

  async function handleSubmit() {
    setSubmitError('');
    if (!form.name.trim()) { setSubmitError('Candidate name is required.'); return; }
    if (!form.email.trim()) { setSubmitError('Candidate email is required.'); return; }
    if (!form.city.trim()) { setSubmitError('Candidate location (city) is required.'); return; }
    if (!form.expectedCTC.trim()) { setSubmitError('Expected CTC is required.'); return; }
    if (!consentConfirmed) { setSubmitError('Please confirm the candidate has consented to this submission.'); return; }
    if (!cvFile) { setCvError('Please attach the candidate\u2019s CV before submitting.'); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('jobId', job.id);
      fd.append('candidateName', form.name.trim());
      fd.append('candidateEmail', form.email.trim());
      fd.append('candidatePhone', form.phone.trim());
      fd.append('currentCTC', form.currentCTC);
      fd.append('expectedCTC', form.expectedCTC);
      fd.append('experience', form.experience);
      fd.append('location', [form.city, form.state].filter(Boolean).join(', ') || form.city.trim());
      fd.append('notes', form.notes.trim());
      fd.append('consentConfirmed', consentConfirmed ? 'true' : 'false');
      fd.append('cv', cvFile);
      if (proofFile) fd.append('proof', proofFile);

      const res = await fetch('/api/submissions', { method: 'POST', body: fd });
      const data = await res.json() as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const cvFileIcon = cvFile?.name.endsWith('.pdf') ? '📄' : '📝';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Submit Candidate</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{job.title} &middot; {job.company}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <XCircle size={16} />
          </button>
        </div>

        {/* Commission banner */}
        {!submitted && (() => {
          const ctcMidLPA = ((job.ctcMin + job.ctcMax) / 2) / 100000;
          const estimatedFee = Math.round(ctcMidLPA * consultantFeePct / 100 * 100000);
          const feeLabel = estimatedFee >= 100000
            ? `₹${(estimatedFee / 100000).toFixed(1)} L`
            : `₹${(estimatedFee / 1000).toFixed(0)}K`;
          return (
            <div className="mx-6 mt-5 flex items-center gap-3 bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                <IndianRupee size={15} className="text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-green-400 uppercase tracking-wide">Your Commission on Placement</p>
                <p className="text-sm font-black text-foreground mt-0.5">
                  {feeLabel} estimated &middot; {consultantFeePct}% of CTC
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">CTC range</p>
                <p className="text-xs font-semibold text-foreground">{job.ctcLabel}</p>
              </div>
            </div>
          );
        })()}

        {/* Success state */}
        {submitted ? (
          <div className="p-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <div>
              <p className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Candidate Submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">{form.name} has been submitted for <span className="font-semibold text-foreground">{job.title}</span>. The employer will review and respond.</p>
            </div>
            <button onClick={onClose} className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4">
              {/* Name + Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Full Name *</label>
                  <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Candidate name"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Phone *</label>
                  <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+91 98765 43210"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Email *</label>
                <input value={form.email} onChange={e => update('email', e.target.value)} placeholder="candidate@email.com" type="email"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
              </div>

              {/* CTC */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Current CTC (LPA)</label>
                  <input value={form.currentCTC} onChange={e => update('currentCTC', e.target.value)} placeholder="e.g. 22" type="number"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Expected CTC (LPA)</label>
                  <input value={form.expectedCTC} onChange={e => update('expectedCTC', e.target.value)} placeholder="e.g. 28" type="number"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>

              {/* Experience */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Years of Experience</label>
                <input value={form.experience} onChange={e => update('experience', e.target.value)} placeholder="e.g. 7"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
              </div>

              {/* Address */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-foreground">Current Address</label>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent([form.address, form.city, form.state, form.pincode].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                  >
                    <Navigation size={11} /> View on Map
                  </a>
                </div>
                <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Street / Flat / Building"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors mb-2" />
                <div className="grid grid-cols-3 gap-2">
                  <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="City"
                    className="bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  <input value={form.state} onChange={e => update('state', e.target.value)} placeholder="State"
                    className="bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  <input value={form.pincode} onChange={e => update('pincode', e.target.value)} placeholder="PIN"
                    className="bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>

              {/* CV Upload — required */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Candidate CV / Resume *
                  <span className="ml-2 text-xs font-normal text-muted-foreground">PDF, DOC or DOCX · max 5 MB</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
                />
                {cvFile ? (
                  <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3">
                    <span className="text-lg leading-none">{cvFileIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{cvFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(cvFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      onClick={() => { setCvFile(null); setCvError(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                      title="Remove file"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors ${
                      isDragOver ? 'border-primary bg-primary/10' : 'border-border bg-muted hover:border-primary/60 hover:bg-primary/5'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center">
                      <Paperclip size={18} className="text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">
                        Drop CV here or <span className="text-primary underline underline-offset-2">browse files</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">PDF, DOC, DOCX up to 5 MB</p>
                    </div>
                  </div>
                )}
                {cvError && (
                  <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                    <XCircle size={12} /> {cvError}
                  </p>
                )}
              </div>

              {/* Candidate consent (mandatory) */}
              <div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentConfirmed}
                    onChange={e => setConsentConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm text-foreground">
                    I confirm the candidate has agreed to be submitted for this role and consents to their profile being shared with the employer. <span className="text-destructive">*</span>
                  </span>
                </label>
                <div className="mt-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Consent proof (optional) — screenshot or email of candidate's agreement</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
                    onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                    className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border file:bg-muted file:text-xs file:font-semibold file:text-foreground"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Notes for Employer</label>
                <textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Why is this candidate a great fit?" rows={3}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none" />
              </div>

              {/* API-level error */}
              {submitError && (
                <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
                  <XCircle size={14} className="text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={onClose} disabled={submitting}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <><Send size={14} /> Submit Candidate</>}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({
  job,
  tab,
  onSubmit,
  onAccept,
  onFavourite,
}: {
  job: EnrichedJob;
  tab: JobTab;
  onSubmit: (j: EnrichedJob) => void;
  onAccept: (id: string) => void;
  onFavourite: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canSubmit = tab !== 'new' || job.accepted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-colors group"
    >
      {/* Header row */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title + badges */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <a href={`/consultant/jobs/${job.id}`} className="font-black text-foreground text-base hover:underline decoration-primary" style={{ fontFamily: 'var(--font-heading)' }}>{job.title}</a>
              <UrgencyBadge urgency={job.urgency} />
              {tab === 'accepted' && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-green-500/15 text-green-400 border-green-500/30 flex items-center gap-1">
                  <CheckCircle size={10} /> Accepted
                </span>
              )}
              {tab === 'mapped' && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-secondary/15 text-secondary border-secondary/30 flex items-center gap-1">
                  <ListChecks size={10} /> {job.mappedCandidates ?? 0} Mapped
                </span>
              )}
              {job.interviewRounds && job.interviewRounds.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                  <ListChecks size={10} /> {job.interviewRounds.length} Round{job.interviewRounds.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap mb-3">
              <span className="flex items-center gap-1"><Building2 size={12} /> {job.company}</span>
              <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
              <span className="flex items-center gap-1"><Clock size={12} /> Posted {job.postedDays}d ago</span>
              {job.experience && <span className="flex items-center gap-1"><Briefcase size={12} /> {job.experience}</span>}
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {job.skills.slice(0, 5).map(skill => (
                <span key={skill} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border">
                  {skill}
                </span>
              ))}
              {job.skills.length > 5 && (
                <span className="text-xs text-muted-foreground px-2 py-0.5">+{job.skills.length - 5} more</span>
              )}
            </div>

            {/* CTC */}
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <IndianRupee size={12} />
                <span className="font-semibold text-foreground">{job.ctcLabel}</span>
              </span>
              {tab === 'accepted' && job.acceptedDate && (
                <span className="text-xs text-muted-foreground">Accepted on {job.acceptedDate}</span>
              )}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onFavourite(job.id)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
                  job.favourite
                    ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                    : 'bg-muted text-muted-foreground border-border hover:text-yellow-400'
                }`}
                title={job.favourite ? 'Remove from favourites' : 'Add to favourites'}
              >
                {job.favourite ? <Star size={14} fill="currentColor" /> : <BookmarkPlus size={14} />}
              </button>
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border"
              >
                <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {tab === 'new' && (
              <div className="flex gap-2">
                <button
                  onClick={() => onAccept(job.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${
                    job.accepted
                      ? 'bg-green-500/25 text-green-400 border-green-500/40 cursor-default'
                      : 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25'
                  }`}
                >
                  <CheckCircle size={13} /> {job.accepted ? 'Accepted' : 'Accept'}
                </button>
                {canSubmit ? (
                  <button
                    onClick={() => onSubmit(job)}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    <Send size={13} /> Submit CV
                  </button>
                ) : (
                  <div className="relative group">
                    <button
                      disabled
                      className="flex items-center gap-1.5 bg-muted text-muted-foreground text-xs font-bold px-3 py-2 rounded-xl border border-border cursor-not-allowed opacity-60"
                    >
                      <Lock size={13} /> Submit CV
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 w-44 bg-popover border border-border rounded-xl px-3 py-2 text-xs text-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <Info size={11} className="inline mr-1 text-primary" />
                      Accept this mandate first to unlock CV submission.
                    </div>
                  </div>
                )}
              </div>
            )}
            {(tab === 'accepted' || tab === 'mapped') && (
              <button
                onClick={() => onSubmit(job)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
              >
                <Send size={13} /> Submit CV
              </button>
            )}
            {tab === 'favourites' && (
              <div className="flex gap-2">
                <button
                  onClick={() => onAccept(job.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${
                    job.accepted
                      ? 'bg-green-500/25 text-green-400 border-green-500/40 cursor-default'
                      : 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25'
                  }`}
                >
                  <CheckCircle size={13} /> {job.accepted ? 'Accepted' : 'Accept'}
                </button>
                {canSubmit ? (
                  <button
                    onClick={() => onSubmit(job)}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    <Send size={13} /> Submit CV
                  </button>
                ) : (
                  <div className="relative group">
                    <button
                      disabled
                      className="flex items-center gap-1.5 bg-muted text-muted-foreground text-xs font-bold px-3 py-2 rounded-xl border border-border cursor-not-allowed opacity-60"
                    >
                      <Lock size={13} /> Submit CV
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 w-44 bg-popover border border-border rounded-xl px-3 py-2 text-xs text-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <Info size={11} className="inline mr-1 text-primary" />
                      Accept this mandate first to unlock CV submission.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expanded description */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-border">
                {job.responsibilities && job.responsibilities.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Key Responsibilities</p>
                    <ul className="space-y-1">
                      {job.responsibilities.slice(0, 4).map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {job.requirements && job.requirements.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Requirements</p>
                    <ul className="space-y-1">
                      {job.requirements.slice(0, 3).map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-secondary mt-1.5 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Excel Export ─────────────────────────────────────────────────────────────
function exportToExcel(jobs: EnrichedJob[], tab: JobTab) {
  const headers = ['Job Code', 'Title', 'Company', 'Location', 'CTC', 'Experience', 'Status', 'Posted Days Ago', 'Skills', 'Mapped Candidates'];
  const rows = jobs.map(j => [
    j.id,
    j.title,
    j.company,
    j.location,
    j.ctcLabel,
    j.experience ?? '',
    tab === 'accepted' ? 'Accepted' : tab === 'mapped' ? 'Mapped' : tab === 'favourites' ? 'Favourite' : 'New',
    String(j.postedDays),
    j.skills.join(', '),
    String(j.mappedCandidates ?? 0),
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tricci-jobs-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConsultantJobsTab() {
  const [activeJobTab, setActiveJobTab] = useState<JobTab>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJob, setSelectedJob] = useState<EnrichedJob | null>(null);
  const [consultantFeePct, setConsultantFeePct] = useState(6);

  const [liveJobs, setLiveJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);

  // Local state for accepted/favourite toggles (in real app these would be persisted)
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [mappedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setJobsLoading(true);
    setJobsError(null);
    fetch('/api/jobs')
      .then(r => r.json())
      .then((d: { jobs?: Job[] }) => setLiveJobs(d.jobs ?? []))
      .catch(() => setJobsError('Could not load mandates. Please try again.'))
      .finally(() => setJobsLoading(false));

    fetch('/api/commission/config')
      .then(r => r.json())
      .then(data => { if (typeof data.consultantFeePct === 'number') setConsultantFeePct(data.consultantFeePct); })
      .catch(() => { /* keep default 6% */ });
  }, []);

  const enrichedJobs: EnrichedJob[] = useMemo(() =>
    liveJobs.map(j => ({
      ...j,
      urgency: jobUrgency(j),
      accepted: acceptedIds.has(j.id),
      mapped: mappedIds.has(j.id),
      favourite: favouriteIds.has(j.id),
      mappedCandidates: mappedIds.has(j.id) ? Math.floor(Math.random() * 5) + 1 : 0,
      acceptedDate: acceptedIds.has(j.id) ? '10 Jun 2026' : undefined,
    })), [liveJobs, acceptedIds, favouriteIds, mappedIds]);

  const allStates = useMemo(() => {
    const states = new Set<string>();
    liveJobs.forEach(j => {
      const parts = j.location.split(',');
      if (parts.length > 1) states.add(parts[parts.length - 1].trim());
      else states.add(j.location.trim());
    });
    return Array.from(states).sort();
  }, [liveJobs]);

  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    liveJobs.forEach(j => j.skills.forEach(s => skills.add(s)));
    return Array.from(skills).sort().slice(0, 20);
  }, [liveJobs]);

  const filteredJobs = useMemo(() => {
    let jobs = enrichedJobs;

    // Tab filter
    if (activeJobTab === 'accepted') jobs = jobs.filter(j => j.accepted);
    else if (activeJobTab === 'mapped') jobs = jobs.filter(j => j.mapped);
    else if (activeJobTab === 'favourites') jobs = jobs.filter(j => j.favourite);
    // 'new' = all jobs not yet accepted

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      jobs = jobs.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.skills.some(s => s.toLowerCase().includes(q)) ||
        j.location.toLowerCase().includes(q)
      );
    }

    // State filter
    if (stateFilter) {
      jobs = jobs.filter(j => j.location.toLowerCase().includes(stateFilter.toLowerCase()));
    }

    // Skill filter
    if (skillFilter) {
      jobs = jobs.filter(j => j.skills.some(s => s.toLowerCase().includes(skillFilter.toLowerCase())));
    }

    return jobs;
  }, [enrichedJobs, activeJobTab, searchQuery, stateFilter, skillFilter]);

  const tabCounts = useMemo(() => ({
    new: enrichedJobs.length,
    accepted: enrichedJobs.filter(j => j.accepted).length,
    mapped: enrichedJobs.filter(j => j.mapped).length,
    favourites: enrichedJobs.filter(j => j.favourite).length,
  }), [enrichedJobs]);

  const jobTabs: { id: JobTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'new', label: 'New Jobs', icon: Zap, color: 'text-primary' },
    { id: 'accepted', label: 'Accepted', icon: CheckCircle, color: 'text-green-400' },
    { id: 'mapped', label: 'Mapped', icon: ListChecks, color: 'text-secondary' },
    { id: 'favourites', label: 'Favourites', icon: Star, color: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-5">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {jobTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveJobTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              activeJobTab === t.id
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <t.icon size={14} className={activeJobTab === t.id ? '' : t.color} />
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              activeJobTab === t.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {tabCounts[t.id]}
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => exportToExcel(filteredJobs, activeJobTab)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by job title, company, skill, or location..."
              className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
              showFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <Filter size={14} /> Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* State filter */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">State / City</label>
                  <select
                    value={stateFilter}
                    onChange={e => setStateFilter(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="">All Locations</option>
                    {allStates.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Department filter */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Department</label>
                  <select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="">All Departments</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="HR">HR</option>
                    <option value="Data">Data &amp; Analytics</option>
                  </select>
                </div>

                {/* Skill filter */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Skill</label>
                  <select
                    value={skillFilter}
                    onChange={e => setSkillFilter(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="">All Skills</option>
                    {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {(stateFilter || deptFilter || skillFilter) && (
                <button
                  onClick={() => { setStateFilter(''); setDeptFilter(''); setSkillFilter(''); }}
                  className="mt-2 text-xs text-primary font-semibold hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredJobs.length}</span> {activeJobTab === 'new' ? 'open mandates' : activeJobTab === 'accepted' ? 'accepted jobs' : activeJobTab === 'mapped' ? 'mapped positions' : 'favourites'}
        </p>
      </div>

      {/* Job cards */}
      <div className="space-y-3">
        {jobsLoading && (
          <div className="py-16 text-center bg-card border border-border rounded-2xl">
            <Loader2 size={28} className="text-muted-foreground mx-auto mb-3 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading mandates&hellip;</p>
          </div>
        )}
        {jobsError && !jobsLoading && (
          <div className="py-12 text-center bg-card border border-red-500/20 rounded-2xl">
            <XCircle size={28} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-400">{jobsError}</p>
          </div>
        )}
        {!jobsLoading && !jobsError && filteredJobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            tab={activeJobTab}
            onSubmit={setSelectedJob}
            onAccept={id => setAcceptedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
            onFavourite={id => setFavouriteIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          />
        ))}
        {!jobsLoading && !jobsError && filteredJobs.length === 0 && (
          <div className="py-16 text-center bg-card border border-border rounded-2xl">
            <Briefcase size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No jobs match your filters.</p>
            <button onClick={() => { setSearchQuery(''); setStateFilter(''); setDeptFilter(''); setSkillFilter(''); }}
              className="mt-3 text-xs text-primary font-semibold hover:underline">Clear filters</button>
          </div>
        )}
      </div>

      {/* Submit modal */}
      <AnimatePresence>
        {selectedJob && <SubmitCandidateModal job={selectedJob} consultantFeePct={consultantFeePct} onClose={() => setSelectedJob(null)} />}
      </AnimatePresence>
    </div>
  );
}
