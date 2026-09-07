// @seo-component — sub-component of employer dashboard, not a standalone page
import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar, Users, CheckCircle, XCircle, ChevronDown,
  Loader2, AlertCircle, FileText,
} from 'lucide-react';
import { Helmet } from '@dr.pogodin/react-helmet';
import type { SubmissionRecord } from './types.js';
import type { useSubmissions } from './useSubmissions.js';

interface Props {
  submissions: SubmissionRecord[];
  loading: boolean;
  updateStatus: ReturnType<typeof useSubmissions>['updateStatus'];
}

export default function ATSInterviewPanel({ submissions, loading, updateStatus }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  // Show submissions that are in interview stage or shortlisted (ready to be moved to interview)
  const relevant = submissions.filter(s =>
    ['shortlisted', 'interview', 'review'].includes(s.status)
  );

  async function move(id: number, status: 'interview' | 'selected' | 'rejected') {
    setUpdating(id);
    await updateStatus(id, status);
    setUpdating(null);
  }

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading submissions…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>ATS Interview Panel — Employer Dashboard — TRICCI</title>
        <meta name="description" content="Manage candidate interview rounds in the TRICCI employer ATS pipeline." />
        <link rel="canonical" href="https://tricci.in/employer/dashboard" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="sr-only">ATS Interview Panel — TRICCI Employer Dashboard</h1>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Interview Panel</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Shortlisted candidates ready for interview rounds</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-card border border-border rounded-xl px-4 py-2 text-center">
            <p className="text-xl font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>{relevant.filter(s => s.status === 'interview').length}</p>
            <p className="text-xs text-muted-foreground">In Interview</p>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-2 text-center">
            <p className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{relevant.filter(s => s.status === 'shortlisted').length}</p>
            <p className="text-xs text-muted-foreground">Shortlisted</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {relevant.map(sub => {
          const isExpanded = expandedId === sub.id;
          const isUpdating = updating === sub.id;

          return (
            <motion.div key={sub.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div
                className="flex items-center gap-4 p-5 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : sub.id)}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-primary">{sub.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm">{sub.candidateName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub.jobTitle}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {sub.consultantName && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users size={11} />via {sub.consultantName}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{new Date(sub.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    sub.status === 'interview' ? 'bg-secondary/15 text-secondary border-secondary/30' :
                    sub.status === 'shortlisted' ? 'bg-primary/15 text-primary border-primary/30' :
                    'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {sub.status === 'interview' ? 'In Interview' : sub.status === 'shortlisted' ? 'Shortlisted' : 'In Review'}
                  </span>
                  <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
                  {sub.cvUrl && (
                    <a href={sub.cvUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-primary hover:underline">
                      <FileText size={13} /> View CV
                    </a>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {sub.status !== 'interview' && (
                      <button
                        disabled={isUpdating}
                        onClick={() => move(sub.id, 'interview')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary/15 text-secondary border border-secondary/30 text-xs font-semibold hover:bg-secondary/25 transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />}
                        Move to Interview
                      </button>
                    )}
                    {sub.status === 'interview' && (
                      <button
                        disabled={isUpdating}
                        onClick={() => move(sub.id, 'selected')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-semibold hover:bg-green-500/25 transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Mark Selected
                      </button>
                    )}
                    <button
                      disabled={isUpdating}
                      onClick={() => move(sub.id, 'rejected')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {relevant.length === 0 && (
          <div className="py-16 text-center bg-card border border-border rounded-2xl">
            <AlertCircle size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No candidates in shortlisted or interview stage yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Shortlist candidates from the Candidates tab to see them here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
