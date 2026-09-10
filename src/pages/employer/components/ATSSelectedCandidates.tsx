import { motion } from 'motion/react';
import { CheckCircle, Award, Loader2, FileText, IndianRupee, Users } from 'lucide-react';
import { Helmet } from '@dr.pogodin/react-helmet';
import type { SubmissionRecord, SubmissionStatus } from './types.js';

interface Props {
  submissions: SubmissionRecord[];
  loading: boolean;
  updateStatus: (id: number, status: SubmissionStatus) => Promise<boolean>;
}

export default function ATSSelectedCandidates({ submissions, loading, updateStatus }: Props) {
  const selected = submissions.filter(s => ['selected', 'offered', 'payment_processed', 'payment_done'].includes(s.status));

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    selected:          { label: 'Selected',           className: 'bg-green-500/15 text-green-400 border-green-500/30' },
    offered:           { label: 'Offer Sent',         className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    payment_processed: { label: 'Payment Processing', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
    payment_done:      { label: 'Payment Done',       className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Selected Candidates — Employer Dashboard — TRICCI</title>
        <meta name="description" content="Track selected candidates and manage offer and payment stages in the TRICCI ATS." />
        <link rel="canonical" href="https://tricci.in/employer/dashboard" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="sr-only">Selected Candidates — TRICCI Employer Dashboard</h1>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Selected Candidates</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Candidates who cleared all rounds — offer and payment tracking</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Selected', count: selected.filter(s => s.status === 'selected').length, color: '#22c55e' },
            { label: 'Offered', count: selected.filter(s => s.status === 'offered').length, color: '#3b82f6' },
            { label: 'Pmt Processing', count: selected.filter(s => s.status === 'payment_processed').length, color: '#a855f7' },
            { label: 'Pmt Done', count: selected.filter(s => s.status === 'payment_done').length, color: '#22c55e' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl px-3 py-2 text-center">
              <p className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)', color: s.color }}>{s.count}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {selected.map(sub => {
          const cfg = STATUS_CONFIG[sub.status] ?? { label: sub.status, className: 'bg-muted text-muted-foreground border-border' };
          return (
            <motion.div key={sub.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-primary">{sub.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-foreground text-sm">{sub.candidateName}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.className}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub.jobTitle}</p>
                  {sub.consultantName && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Users size={10} />via {sub.consultantName}</p>
                  )}
                </div>
              </div>

              {sub.cvUrl && (
                <a href={sub.cvUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline mb-3">
                  <FileText size={11} /> View CV
                </a>
              )}

              {/* Action buttons based on current status */}
              <div className="flex flex-wrap gap-2 mt-2">
                {sub.status === 'selected' && (
                  <button onClick={() => updateStatus(sub.id, 'offered')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs font-semibold hover:bg-blue-500/25 transition-colors">
                    <IndianRupee size={11} /> Issue Offer
                  </button>
                )}
                {sub.status === 'offered' && (
                  <button onClick={() => updateStatus(sub.id, 'payment_processed')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 text-xs font-semibold hover:bg-purple-500/25 transition-colors">
                    <CheckCircle size={11} /> Mark Joined — Process Payment
                  </button>
                )}
                {sub.status === 'payment_processed' && (
                  <button onClick={() => updateStatus(sub.id, 'payment_done')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-semibold hover:bg-green-500/25 transition-colors">
                    <CheckCircle size={11} /> Confirm Payment Done
                  </button>
                )}
                {sub.status === 'payment_done' && (
                  <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 text-green-400 text-xs font-semibold">
                    <CheckCircle size={11} /> Placement Complete
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {selected.length === 0 && (
        <div className="py-16 text-center bg-card border border-border rounded-2xl">
          <Award size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">No candidates selected yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Move candidates through Interview → Selected to see them here.</p>
        </div>
      )}
    </div>
  );
}
