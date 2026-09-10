/**
 * VisualAnalytics — the pictographic report requested for the Reports
 * tab. Reuses data from endpoints already live (employer funnel from
 * Phase 3c, consultant performance from Phase D) — no new backend needed.
 */
import { useState, useEffect } from 'react';
import { Loader2, BarChart3 } from 'lucide-react';
import { SimpleBarChart, SimpleDonutChart } from '@/components/shared/SimpleCharts';

interface Funnel {
  cvsReceived: number; seen: number; shortlisted: number; rejected: number;
}
interface ConsultantStat {
  consultantName: string; totalSubmissions: number; selectionRate: number;
}

export default function VisualAnalytics() {
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [consultants, setConsultants] = useState<ConsultantStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/employer/funnel').then(r => r.ok ? r.json() : null),
      fetch('/api/employer/consultants/performance').then(r => r.ok ? r.json() : null),
    ]).then(([f, c]) => {
      setFunnel(f);
      setConsultants(c?.consultants ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }

  const hasData = funnel && funnel.cvsReceived > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Hiring funnel bar chart */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5"><BarChart3 size={14} /> Hiring Funnel</h3>
        {hasData ? (
          <SimpleBarChart
            data={[
              { label: 'Received', value: funnel!.cvsReceived, color: '#35c9ff' },
              { label: 'Seen', value: funnel!.seen, color: '#6B4FBB' },
              { label: 'Shortlisted', value: funnel!.shortlisted, color: '#E8470A' },
              { label: 'Rejected', value: funnel!.rejected, color: '#EF4444' },
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground py-10 text-center">No CVs received yet — this chart will populate once candidates apply.</p>
        )}
      </div>

      {/* Source split donut */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-bold text-foreground mb-4">Direct vs Consultant Split</h3>
        {hasData ? (
          <SimpleDonutChart
            data={[
              { label: 'Consultant', value: consultants.reduce((s, c) => s + c.totalSubmissions, 0), color: '#6B4FBB' },
              { label: 'Direct', value: Math.max(0, funnel!.cvsReceived - consultants.reduce((s, c) => s + c.totalSubmissions, 0)), color: '#35c9ff' },
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground py-10 text-center">No data yet.</p>
        )}
      </div>

      {/* Top consultants bar chart */}
      {consultants.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 lg:col-span-2">
          <h3 className="text-sm font-bold text-foreground mb-4">Top Consultants by Submissions</h3>
          <SimpleBarChart
            data={consultants.slice(0, 6).map((c, i) => ({
              label: c.consultantName.split(' ')[0],
              value: c.totalSubmissions,
              color: ['#E8470A', '#6B4FBB', '#35c9ff', '#22c55e', '#f59e0b', '#ec4899'][i % 6],
            }))}
          />
        </div>
      )}
    </div>
  );
}
