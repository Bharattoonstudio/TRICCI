/**
 * Employer Job Detail Page — /employer/jobs/:id
 * Full page (not a modal): job details, who posted it, a funnel
 * mini-dashboard, and the complete CV review flow (grouped by consultant
 * + direct applications) with Shortlist/Reject actions.
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
import {
  ArrowLeft, Loader2, Users, FileText, UserCheck, UserX,
  MapPin, Briefcase, IndianRupee, ChevronDown, ChevronRight, ExternalLink,
} from 'lucide-react';
import RejectReasonModal from '@/components/shared/RejectReasonModal';
import InterviewResponseModal from '@/components/shared/InterviewResponseModal';

interface JobDetail {
  id: string; title: string; department: string; location: string;
  ctcLabel: string; feePercent: number; status: string; description?: string;
  skills?: string[];
}
interface Funnel {
  cvsReceived: number; seen: number; shortlisted: number; rejected: number;
  direct: number; consultant: number;
}
interface ConsultantSubmission {
  id: number; status: string; candidateName: string; candidateEmail: string | null;
  candidatePhone: string | null; cvUrl: string | null; createdAt: string;
  consultantId: string; consultantName: string; consultantEmail: string;
}
interface DirectApp {
  id: number; status: string; candidateName: string; candidateCvUrl: string | null;
  cvMatchScore: number | null; appliedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground', applied: 'bg-muted text-muted-foreground',
  shortlisted: 'bg-primary/10 text-primary', interview: 'bg-purple-500/10 text-purple-500',
  hold: 'bg-slate-400/10 text-slate-500', selected: 'bg-green-500/10 text-green-600',
  offered: 'bg-blue-500/10 text-blue-500', rejected: 'bg-red-500/10 text-red-500',
  placed: 'bg-green-500/10 text-green-600',
};

export default function EmployerJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [postedBy, setPostedBy] = useState<{ name: string; email: string } | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [consultantSubs, setConsultantSubs] = useState<ConsultantSubmission[]>([]);
  const [directApps, setDirectApps] = useState<DirectApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedConsultants, setExpandedConsultants] = useState<Set<string>>(new Set());
  const [actioning, setActioning] = useState<Set<number>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<{ kind: 'submission' | 'application'; id: number } | null>(null);
  const [interviewTarget, setInterviewTarget] = useState<{ id: number; candidateName: string } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detailRes, subsRes, appsRes] = await Promise.all([
        fetch(`/api/employer/jobs/${id}/detail`),
        fetch(`/api/employer/submissions?jobId=${id}`),
        fetch(`/api/employer/applications?jobId=${id}`),
      ]);
      if (detailRes.ok) {
        const d = await detailRes.json();
        setJobDetail(d.job);
        setPostedBy(d.postedBy);
        setFunnel(d.funnel);
      }
      const subsData = subsRes.ok ? await subsRes.json() : { submissions: [] };
      const appsData = appsRes.ok ? await appsRes.json() : { applications: [] };
      setConsultantSubs(subsData.submissions ?? []);
      setDirectApps(appsData.applications ?? []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function toggleConsultant(cid: string) {
    setExpandedConsultants(prev => {
      const s = new Set(prev);
      s.has(cid) ? s.delete(cid) : s.add(cid);
      return s;
    });
  }

  async function actOnSubmission(sid: number, status: 'shortlisted' | 'rejected', rejectionReason?: string) {
    setActioning(prev => new Set(prev).add(sid));
    try {
      const res = await fetch(`/api/submissions/${sid}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(rejectionReason ? { rejectionReason } : {}) }),
      });
      if (res.status === 400) {
        const data = await res.json();
        if (data.error === 'rejection_reason_required') {
          setActioning(prev => { const s = new Set(prev); s.delete(sid); return s; });
          setRejectTarget({ kind: 'submission', id: sid });
          return;
        }
      }
      if (res.ok) { setRejectTarget(null); load(); }
    } finally {
      setActioning(prev => { const s = new Set(prev); s.delete(sid); return s; });
    }
  }

  async function actOnApplication(aid: number, status: 'shortlisted' | 'rejected', rejectionReason?: string) {
    setActioning(prev => new Set(prev).add(aid));
    try {
      const res = await fetch(`/api/employer/applications/${aid}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(rejectionReason ? { rejectionReason } : {}) }),
      });
      if (res.status === 400) {
        const data = await res.json();
        if (data.error === 'rejection_reason_required') {
          setActioning(prev => { const s = new Set(prev); s.delete(aid); return s; });
          setRejectTarget({ kind: 'application', id: aid });
          return;
        }
      }
      if (res.ok) { setRejectTarget(null); load(); }
    } finally {
      setActioning(prev => { const s = new Set(prev); s.delete(aid); return s; });
    }
  }

  const grouped = consultantSubs.reduce<Record<string, { name: string; items: ConsultantSubmission[] }>>((acc, s) => {
    if (!acc[s.consultantId]) acc[s.consultantId] = { name: s.consultantName, items: [] };
    acc[s.consultantId].items.push(s);
    return acc;
  }, {});

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>;
  }
  if (!jobDetail) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Job not found</div>;
  }

  return (
    <>
      <Helmet><title>{jobDetail.title} — TRICCI</title><meta name="robots" content="noindex" /></Helmet>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <button onClick={() => navigate('/employer/dashboard')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft size={15} /> Back to Dashboard
          </button>

          {/* ── Job Header ── */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{jobDetail.title}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Briefcase size={13} /> {jobDetail.department}</span>
                  <span className="flex items-center gap-1"><MapPin size={13} /> {jobDetail.location}</span>
                  <span className="flex items-center gap-1"><IndianRupee size={13} /> {jobDetail.ctcLabel}</span>
                  <span>Fee: {jobDetail.feePercent}%</span>
                </div>
                {postedBy && (
                  <p className="text-xs text-muted-foreground mt-2">Posted by <span className="font-semibold text-foreground">{postedBy.name}</span> ({postedBy.email})</p>
                )}
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${jobDetail.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                {jobDetail.status}
              </span>
            </div>
            {jobDetail.description && (
              <p className="text-sm text-muted-foreground mt-4 whitespace-pre-wrap">{jobDetail.description}</p>
            )}
          </div>

          {/* ── Funnel mini dashboard ── */}
          {funnel && (
            <div className="bg-card border border-border rounded-2xl p-6 mb-5">
              <h2 className="text-sm font-bold text-foreground mb-4">Hiring Funnel</h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: 'CVs Received', value: funnel.cvsReceived, color: '#35c9ff' },
                  { label: 'Seen', value: funnel.seen, color: '#6B4FBB' },
                  { label: 'Shortlisted', value: funnel.shortlisted, color: '#E8470A' },
                  { label: 'Rejected', value: funnel.rejected, color: '#EF4444' },
                  { label: 'Direct', value: funnel.direct, color: '#35c9ff' },
                  { label: 'Consultant', value: funnel.consultant, color: '#6B4FBB' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-black" style={{ color: s.color, fontFamily: 'var(--font-heading)' }}>{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Consultant submissions grouped ── */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-5">
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5"><Users size={14} /> Consultant Submissions ({consultantSubs.length})</h2>
            {Object.keys(grouped).length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">No consultant submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(grouped).map(([cid, group]) => {
                  const isExpanded = expandedConsultants.has(cid);
                  return (
                    <div key={cid} className="border border-border rounded-xl overflow-hidden">
                      <button onClick={() => toggleConsultant(cid)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors">
                        <span className="text-sm font-semibold text-foreground">{group.name} — {group.items.length} submission{group.items.length === 1 ? '' : 's'}</span>
                        {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                      </button>
                      {isExpanded && (
                        <div className="divide-y divide-border">
                          {group.items.map(item => {
                            const isActioning = actioning.has(item.id);
                            const canAct = item.status === 'pending' || item.status === 'review';
                            return (
                              <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{item.candidateName}</p>
                                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[item.status] || 'bg-muted text-muted-foreground'}`}>{item.status}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {item.cvUrl && (
                                    <a href={item.cvUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground" title="View CV"><FileText size={12} /></a>
                                  )}
                                  {item.status === 'interview' && (
                                    <button onClick={() => setInterviewTarget({ id: item.id, candidateName: item.candidateName })} className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-purple-400/30 text-purple-500 hover:bg-purple-400/10">Interview</button>
                                  )}
                                  {canAct && (
                                    <>
                                      <button disabled={isActioning} onClick={() => setRejectTarget({ kind: 'submission', id: item.id })} className="w-7 h-7 rounded-lg border border-red-500/30 text-red-500 flex items-center justify-center hover:bg-red-500/10 disabled:opacity-40" title="Reject">
                                        {isActioning ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} />}
                                      </button>
                                      <button disabled={isActioning} onClick={() => actOnSubmission(item.id, 'shortlisted')} className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40" title="Shortlist">
                                        {isActioning ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Direct applications ── */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-bold text-foreground mb-3">Direct Applications ({directApps.length})</h2>
            {directApps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">No direct applications yet.</p>
            ) : (
              <div className="border border-border rounded-xl divide-y divide-border">
                {directApps.map(app => {
                  const isActioning = actioning.has(app.id);
                  const canAct = app.status === 'applied';
                  return (
                    <div key={app.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{app.candidateName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[app.status] || 'bg-muted text-muted-foreground'}`}>{app.status}</span>
                          {app.cvMatchScore != null && <span className="text-[10px] text-muted-foreground">Match: {app.cvMatchScore}%</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {app.candidateCvUrl && (
                          <a href={app.candidateCvUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground" title="View CV"><ExternalLink size={12} /></a>
                        )}
                        {canAct && (
                          <>
                            <button disabled={isActioning} onClick={() => setRejectTarget({ kind: 'application', id: app.id })} className="w-7 h-7 rounded-lg border border-red-500/30 text-red-500 flex items-center justify-center hover:bg-red-500/10 disabled:opacity-40" title="Reject">
                              {isActioning ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} />}
                            </button>
                            <button disabled={isActioning} onClick={() => actOnApplication(app.id, 'shortlisted')} className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40" title="Shortlist">
                              {isActioning ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {rejectTarget && (
        <RejectReasonModal
          onClose={() => setRejectTarget(null)}
          onSubmit={(reason) => rejectTarget.kind === 'submission' ? actOnSubmission(rejectTarget.id, 'rejected', reason) : actOnApplication(rejectTarget.id, 'rejected', reason)}
          submitting={actioning.has(rejectTarget.id)}
        />
      )}
      {interviewTarget && (
        <InterviewResponseModal
          submissionId={interviewTarget.id}
          candidateName={interviewTarget.candidateName}
          onClose={() => setInterviewTarget(null)}
          onResolved={() => { setInterviewTarget(null); load(); }}
        />
      )}
    </>
  );
}
