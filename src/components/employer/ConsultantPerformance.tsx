/**
 * ConsultantPerformance — the employer-facing leaderboard of consultants
 * who've submitted to their jobs. TRICCI's key differentiator per the
 * product spec: submissions, shortlist rate, selection rate, rejection
 * rate, jobs worked, and responsiveness — sorted best performers first.
 */
import { useState, useEffect } from 'react';
import { Loader2, Award, TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface ConsultantStat {
  consultantUserId: string;
  consultantName: string;
  consultantEmail: string;
  totalSubmissions: number;
  jobsSubmittedTo: number;
  shortlisted: number;
  interview: number;
  selected: number;
  rejected: number;
  shortlistRate: number;
  selectionRate: number;
  rejectionRate: number;
  avgHoursToView: number | null;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export default function ConsultantPerformance() {
  const [consultants, setConsultants] = useState<ConsultantStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/employer/consultants/performance')
      .then(r => r.json())
      .then(d => setConsultants(d.consultants ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-muted-foreground" /></div>;
  }

  if (consultants.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl py-16 text-center">
        <Award size={32} className="mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm font-semibold text-foreground">No consultant submissions yet</p>
        <p className="text-xs text-muted-foreground mt-1">Once consultants submit candidates to your jobs, their performance shows up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {consultants.map((c, i) => (
        <div key={c.consultantUserId} className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              {i < 3 && <span className="text-lg">{MEDAL[i]}</span>}
              <div>
                <p className="text-sm font-bold text-foreground">{c.consultantName}</p>
                <p className="text-xs text-muted-foreground">{c.consultantEmail}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>{c.selectionRate}%</p>
              <p className="text-[10px] text-muted-foreground">Selection Rate</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
            <div>
              <p className="text-lg font-black text-foreground">{c.totalSubmissions}</p>
              <p className="text-[10px] text-muted-foreground">Submitted</p>
            </div>
            <div>
              <p className="text-lg font-black text-foreground">{c.jobsSubmittedTo}</p>
              <p className="text-[10px] text-muted-foreground">Jobs Worked</p>
            </div>
            <div>
              <p className="text-lg font-black text-primary">{c.shortlistRate}%</p>
              <p className="text-[10px] text-muted-foreground">Shortlist Rate</p>
            </div>
            <div>
              <p className="text-lg font-black text-green-600">{c.selected}</p>
              <p className="text-[10px] text-muted-foreground">Selected</p>
            </div>
            <div>
              <p className="text-lg font-black text-red-500">{c.rejectionRate}%</p>
              <p className="text-[10px] text-muted-foreground">Rejection Rate</p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-3 border-t border-border">
            {c.avgHoursToView != null && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock size={11} /> Avg {c.avgHoursToView}h for you to review their CVs
              </span>
            )}
            {c.selectionRate >= 20 && (
              <span className="flex items-center gap-1 text-[11px] text-green-600 font-semibold"><TrendingUp size={11} /> Strong performer</span>
            )}
            {c.rejectionRate >= 60 && c.totalSubmissions >= 3 && (
              <span className="flex items-center gap-1 text-[11px] text-red-500 font-semibold"><TrendingDown size={11} /> High rejection rate</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
