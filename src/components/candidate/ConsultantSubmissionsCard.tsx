/**
 * ConsultantSubmissionsCard — candidate-facing visibility into submissions
 * made by consultants on their behalf, including interview details. Fixes
 * a gap flagged when interview scheduling was first built: only the
 * employer and consultant could see proposed/confirmed interview times —
 * the candidate themselves had zero visibility. View-only for now; no
 * candidate-side accept/reschedule action yet.
 */
import { useState, useEffect } from 'react';
import { Loader2, Users, CalendarClock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Submission {
  submissionId: number;
  status: string;
  jobTitle: string;
  company: string;
  consultantName: string | null;
  createdAt: string;
  rejectionReason: string | null;
  interview: {
    status: string;
    proposedDate: string;
    interviewerName: string | null;
    interviewerDesignation: string | null;
    confirmedAt: string | null;
    candidateAcknowledgedAt: string | null;
  } | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground', review: 'bg-yellow-500/10 text-yellow-600',
  shortlisted: 'bg-primary/10 text-primary', interview: 'bg-purple-500/10 text-purple-500',
  hold: 'bg-slate-400/10 text-slate-500', selected: 'bg-green-500/10 text-green-600',
  offered: 'bg-blue-500/10 text-blue-500', rejected: 'bg-red-500/10 text-red-500',
  placed: 'bg-green-500/10 text-green-600',
};

export default function ConsultantSubmissionsCard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/candidate/consultant-submissions')
      .then(r => r.json())
      .then((d: { submissions?: Submission[] }) => setSubmissions(d.submissions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function acknowledge(submissionId: number) {
    setAcknowledging(prev => new Set(prev).add(submissionId));
    try {
      const res = await fetch(`/api/candidate/submissions/${submissionId}/interview/acknowledge`, { method: 'POST' });
      if (res.ok) {
        setSubmissions(prev => prev.map(s => s.submissionId === submissionId && s.interview
          ? { ...s, interview: { ...s.interview, candidateAcknowledgedAt: new Date().toISOString() } }
          : s));
      }
    } finally {
      setAcknowledging(prev => { const s = new Set(prev); s.delete(submissionId); return s; });
    }
  }

  if (loading) {
    return <div className="bg-card border border-border rounded-2xl p-6 flex justify-center"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }
  if (submissions.length === 0) return null; // nothing to show, don't clutter the page

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h2 className="font-black text-foreground mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
        <Users size={16} className="text-primary" /> Recruiter Submissions
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Jobs a recruitment consultant has submitted you for on TRICCI.
      </p>

      <div className="space-y-3">
        {submissions.map(s => (
          <div key={s.submissionId} className="border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{s.jobTitle}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.company} · via {s.consultantName ?? 'a TRICCI consultant'}</p>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[s.status] || 'bg-muted text-muted-foreground'}`}>
                {s.status}
              </span>
            </div>

            {s.interview && (
              <div className="mt-2 flex items-start gap-1.5 bg-purple-500/5 border border-purple-500/15 rounded-lg px-3 py-2">
                <CalendarClock size={13} className="text-purple-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">
                    {s.interview.status === 'confirmed' ? 'Interview confirmed' : s.interview.status === 'proposed' ? 'Interview proposed' : 'Interview update'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(s.interview.proposedDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  {s.interview.interviewerName && (
                    <p className="text-xs text-muted-foreground">Interviewer: {s.interview.interviewerName}{s.interview.interviewerDesignation ? ` (${s.interview.interviewerDesignation})` : ''}</p>
                  )}
                  {s.interview.candidateAcknowledgedAt ? (
                    <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1"><CheckCircle2 size={11} /> You confirmed you'll attend</p>
                  ) : (
                    <button
                      onClick={() => acknowledge(s.submissionId)}
                      disabled={acknowledging.has(s.submissionId)}
                      className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
                    >
                      {acknowledging.has(s.submissionId) ? <Loader2 size={11} className="animate-spin" /> : null}
                      I'll be there
                    </button>
                  )}
                </div>
              </div>
            )}

            {s.status === 'rejected' && s.rejectionReason && (
              <div className="mt-2 flex items-start gap-1.5 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
                <AlertCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-600">{s.rejectionReason}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
