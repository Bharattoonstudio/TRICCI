/**
 * SubmitToJobModal — bulk-submit selected CV Bank candidates to one of
 * the consultant's accepted jobs in a single action.
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, Send } from 'lucide-react';

interface AcceptedJob {
  id: string;
  title: string;
  company: string;
}

interface SubmitToJobModalProps {
  entryIds: string[];
  onClose: () => void;
  onDone: () => void;
}

export default function SubmitToJobModal({ entryIds, onClose, onDone }: SubmitToJobModalProps) {
  const [jobs, setJobs] = useState<AcceptedJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobId, setJobId] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ added: number; skippedDuplicate: number; skippedInvalid: number } | null>(null);

  useEffect(() => {
    fetch('/api/consultant/jobs/accepted')
      .then(r => r.json())
      .then((d: { jobs?: AcceptedJob[] }) => setJobs(d.jobs ?? []))
      .catch(() => {})
      .finally(() => setLoadingJobs(false));
  }, []);

  async function handleSubmit() {
    setError('');
    if (!jobId) { setError('Please select a job.'); return; }
    if (!consentConfirmed) { setError('Please confirm the selected candidates have consented.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/consultant/cv-bank/submit-to-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, entryIds: entryIds.map(Number), consentConfirmed: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || 'Failed to submit candidates.');
        return;
      }
      setResult(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Submit {entryIds.length} Candidates to a Job</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {result ? (
          <div className="text-center py-4">
            <p className="text-sm text-foreground">
              <span className="font-bold text-green-600">{result.added}</span> submitted successfully
              {result.skippedDuplicate > 0 && <span className="text-muted-foreground">, {result.skippedDuplicate} already submitted (skipped)</span>}
              {result.skippedInvalid > 0 && <span className="text-muted-foreground">, {result.skippedInvalid} missing required fields (skipped)</span>}
            </p>
            <button onClick={onDone} className="mt-4 w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl">Done</button>
          </div>
        ) : (
          <>
            {loadingJobs ? (
              <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">You haven't accepted any jobs yet — accept a job from Browse Jobs first, then come back here to bulk-submit candidates.</p>
            ) : (
              <>
                <label className="block text-xs text-muted-foreground mb-1">Select Job</label>
                <select value={jobId} onChange={e => setJobId(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground mb-4">
                  <option value="">Choose a job…</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}
                </select>

                <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
                  <input type="checkbox" checked={consentConfirmed} onChange={e => setConsentConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-border" />
                  <span className="text-xs text-foreground">I confirm all {entryIds.length} selected candidates have consented to being submitted for this role.</span>
                </label>

                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl disabled:opacity-60">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                  {submitting ? 'Submitting…' : `Submit ${entryIds.length} Candidates`}
                </button>
              </>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
