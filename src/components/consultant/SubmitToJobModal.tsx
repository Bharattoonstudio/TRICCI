/**
 * SubmitToJobModal — bulk-submit selected CV Bank candidates to one of
 * the consultant's accepted jobs in a single action.
 * 
 * P0 #1 + UX FIX: Now displays submission results with duplicate/winner status
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface AcceptedJob {
  id: string;
  title: string;
  company: string;
}

interface SubmissionResult {
  id: number;
  candidateName: string;
  candidateEmail: string;
  status: string;
  isDuplicate: boolean;
  createdAt: string;
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
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    added: number;
    skippedDuplicate: number;
    skippedInvalid: number;
    submissions: SubmissionResult[];
  } | null>(null);

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
        className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Submit Candidates to Job</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        {result ? (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-foreground">{result.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.added} successfully submitted
                    {result.skippedDuplicate > 0 && ` • ${result.skippedDuplicate} duplicate(s)`}
                    {result.skippedInvalid > 0 && ` • ${result.skippedInvalid} invalid`}
                  </p>
                </div>
              </div>
            </div>

            {/* Submissions List */}
            {result.submissions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase">Submitted Candidates</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className={`border rounded-lg p-3 flex items-start gap-3 ${
                        sub.isDuplicate
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-green-500/30 bg-green-500/5'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {sub.isDuplicate ? (
                          <AlertCircle size={16} className="text-amber-600" />
                        ) : (
                          <CheckCircle size={16} className="text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{sub.candidateName}</p>
                        <p className="text-xs text-muted-foreground truncate">{sub.candidateEmail}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            sub.status === 'pending' ? 'bg-blue-500/20 text-blue-600' :
                            sub.status === 'shortlisted' ? 'bg-purple-500/20 text-purple-600' :
                            'bg-gray-500/20 text-gray-600'
                          }`}>
                            {sub.status}
                          </span>
                          {sub.isDuplicate ? (
                            <span className="text-xs text-amber-600 font-semibold">⚠️ Duplicate</span>
                          ) : (
                            <span className="text-xs text-green-600 font-semibold">✅ Primary</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-border">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-semibold text-sm"
              >
                Close
              </button>
              <button
                onClick={onDone}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold text-sm"
              >
                View All Submissions
              </button>
            </div>
          </div>
        ) : (
          <>
            {loadingJobs ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">You haven't accepted any jobs yet — accept a job from Browse Jobs first, then come back here to bulk-submit candidates.</p>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-2 font-semibold">Select Job</label>
                    <select value={jobId} onChange={e => setJobId(e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="">Choose a job…</option>
                      {jobs.map(j => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}
                    </select>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={consentConfirmed}
                      onChange={e => setConsentConfirmed(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-border cursor-pointer"
                    />
                    <span className="text-xs text-foreground leading-relaxed">
                      I confirm all <strong>{entryIds.length}</strong> selected candidates have explicitly consented to being submitted for this role. They understand their CV will be shared with the employer.
                    </span>
                  </label>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-lg disabled:opacity-60 hover:bg-primary/90 transition-colors text-sm"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {submitting ? 'Submitting…' : `Submit ${entryIds.length} Candidate${entryIds.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
