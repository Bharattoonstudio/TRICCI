import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3, TrendingUp, Users, Briefcase, Clock,
  Download, Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { Helmet } from '@dr.pogodin/react-helmet';

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: max > 0 ? `${Math.round((value / max) * 100)}%` : '0%', backgroundColor: color }} />
    </div>
  );
}

const ACTIVITY_TEMPLATES = [
  { id: 1, name: 'Weekly Hiring Summary', description: 'Applications received, shortlisted, and interviews scheduled this week', frequency: 'Weekly', lastRun: '—' },
  { id: 2, name: 'Monthly Placement Report', description: 'Positions closed, fees paid, and consultant performance', frequency: 'Monthly', lastRun: '—' },
  { id: 3, name: 'Pipeline Health Check', description: 'Stale applications, pending interviews, and offer status', frequency: 'Bi-weekly', lastRun: '—' },
  { id: 4, name: 'Consultant Performance', description: 'Submissions, shortlist rate, and placement rate per consultant', frequency: 'Monthly', lastRun: '—' },
];

type ReportTab = 'dashboard' | 'activity';

interface LiveJob { id: string; title: string; jobCode?: string; status: string; applicants: number; shortlisted: number; consultants: number; }
interface LiveSubmission { id: number; status: string; }

export default function ReportsDashboard() {
  const [activeTab, setActiveTab] = useState<ReportTab>('dashboard');
  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [submissions, setSubmissions] = useState<LiveSubmission[]>([]);
  const [directCount, setDirectCount] = useState(0);

  useEffect(() => {
    fetch('/api/jobs').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.jobs) setJobs(d.jobs.map((j: { id: string; title: string; jobCode?: string; status: string; applicants: number; postedDays: number }) => ({
        id: j.id, title: j.title, jobCode: j.jobCode, status: j.status,
        applicants: j.applicants, shortlisted: 0, consultants: 0,
      })));
    }).catch(() => {});
    fetch('/api/employer/submissions').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.submissions) setSubmissions(d.submissions);
    }).catch(() => {});
    fetch('/api/employer/applications').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.total) setDirectCount(d.total);
    }).catch(() => {});
  }, []);

  const totalApplicants = submissions.length + directCount;
  const shortlisted = submissions.filter(s => ['shortlisted', 'interview', 'selected', 'offered'].includes(s.status)).length;
  const placed = submissions.filter(s => s.status === 'offered').length;
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const maxApplicants = Math.max(totalApplicants, 1);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Reports & Analytics — Employer Dashboard — TRICCI</title>
        <meta name="description" content="View hiring performance, pipeline health, and activity reports on TRICCI." />
        <link rel="canonical" href="https://tricci.in/employer/dashboard" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="sr-only">Reports & Analytics — TRICCI Employer Dashboard</h1>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Reports & Analytics</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Hiring performance, pipeline health, and activity reports</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-muted border border-border rounded-xl p-1">
            {(['dashboard', 'activity'] as ReportTab[]).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t === 'dashboard' ? 'Dashboard' : 'Activity Templates'}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Active Positions', value: String(activeJobs), icon: Briefcase, color: '#E8470A' },
              { label: 'Total Applicants', value: String(totalApplicants), icon: Users, color: '#6B4FBB' },
              { label: 'Shortlist Rate', value: totalApplicants > 0 ? `${Math.round((shortlisted / totalApplicants) * 100)}%` : '—', icon: TrendingUp, color: '#22c55e' },
              { label: 'Avg. Time to Fill', value: '—', icon: Clock, color: '#3b82f6' },
            ].map(kpi => (
              <motion.div key={kpi.label}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.color + '20' }}>
                    <kpi.icon size={18} style={{ color: kpi.color }} />
                  </div>
                  <ArrowUpRight size={12} className="text-green-400" />
                </div>
                <p className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Job Performance Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h4 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Job Performance</h4>
            </div>
            <div className="overflow-x-auto">
              {jobs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No jobs posted yet.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-3">Position</th>
                      <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Applicants</th>
                      <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {jobs.map(job => (
                      <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3">
                          <p className="text-sm font-semibold text-foreground">{job.title}</p>
                          {job.jobCode && <p className="text-xs text-muted-foreground">{job.jobCode}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-foreground">{job.applicants}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            job.status === 'active' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                            job.status === 'closed' ? 'bg-muted text-muted-foreground border-border' :
                            'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                          }`}>{job.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Placement funnel */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h4 className="font-black text-foreground mb-5" style={{ fontFamily: 'var(--font-heading)' }}>Hiring Funnel</h4>
            {totalApplicants === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No applicants yet — funnel will appear once candidates apply.</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Applications Received', value: totalApplicants, color: '#E8470A' },
                  { label: 'Shortlisted', value: shortlisted, color: '#6B4FBB' },
                  { label: 'Interview Stage', value: submissions.filter(s => s.status === 'interview').length, color: '#3b82f6' },
                  { label: 'Selected', value: submissions.filter(s => s.status === 'selected').length, color: '#22c55e' },
                  { label: 'Offer Sent', value: placed, color: '#f59e0b' },
                ].map((stage, i) => (
                  <div key={stage.label} className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground w-36 shrink-0">{stage.label}</span>
                    <div className="flex-1 h-6 bg-muted rounded-lg overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((stage.value / maxApplicants) * 100)}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        className="h-full rounded-lg flex items-center justify-end pr-2"
                        style={{ backgroundColor: stage.color }}
                      >
                        {stage.value > 0 && <span className="text-white text-xs font-bold">{stage.value}</span>}
                      </motion.div>
                    </div>
                    <span className="text-xs font-bold text-foreground w-8 text-right">{stage.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly chart placeholder */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h4 className="font-black text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Monthly Pipeline</h4>
            <p className="text-sm text-muted-foreground">Historical monthly data will appear here as your hiring activity grows.</p>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <MiniBar value={0} max={1} color="#E8470A" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Pre-built report templates. Run on demand or schedule automatic delivery.</p>
          {ACTIVITY_TEMPLATES.map(t => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BarChart3 size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar size={11} />{t.frequency}</span>
                      <span className="text-xs text-muted-foreground">Last run: {t.lastRun}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity">
                    Run Now
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors">
                    <Download size={12} /> Export
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
