/**
 * JobSubmissionsDrilldown — points 3-6, 18-20 of the SOP:
 * Click a job → see submissions grouped by consultant (e.g. "XYZ Consultant
 * — 10 submissions") → click a group → see their candidates → click a
 * candidate → CV opens with Shortlist/Reject actions right there. Direct
 * (candidate self-apply) applications are shown in their own section below.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { X, ChevronDown, ChevronRight, Loader2, FileText, UserCheck, UserX, Users, ExternalLink } from 'lucide-react';
import RejectReasonModal from './RejectReasonModal';
import InterviewResponseModal from './InterviewResponseModal';

interface ConsultantSubmission {
  id: number;
  status: string;
  candidateName: string;
  candidateEmail: string | null;
  candidatePhone: string | null;
  cvUrl: string | null;
  createdAt: string;
  consultantId: string;
  consultantName: string;
  consultantEmail: string;
}

interface DirectApp {
  id: number;
  status: string;
  candidateName: string;
  candidateCvUrl: string | null;
  cvMatchScore: number | null;
  appliedAt: string;
}

interface JobSubmissionsDrilldownProps {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  applied: 'bg-muted text-muted-foreground',
  review: 'bg-yellow-500/10 text-yellow-500',
  shortlisted: 'bg-primary/10 text-primary',
  interview: 'bg-purple-500/10 text-purple-400',
  selected: 'bg-green-500/10 text-green-500',
  offered: 'bg-blue-500/10 text-blue-400',
  rejected: 'bg-red-500/10 text-red-400',
  placed: 'bg-green-500/10 text-green-500',
};

export default function JobSubmissionsDrilldown({ jobId, jobTitle, onClose }: JobSubmissionsDrilldownProps) {
  const [consultantSubs, setConsultantSubs] = useState<ConsultantSubmission[]>([]);
  const [directApps, setDirectApps] = useState<DirectApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedConsultants, setExpandedConsultants] = useState<Set<string>>(new Set());
  const [actioning, setActioning] = useState<Set<number>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<{ kind: 'submission' | 'application'; id: number } | null>(null);
  const [interviewTarget, setInterviewTarget] = useState<{ id: number; candidateName: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subsRes, appsRes] = await Promise.all([
        fetch(`/api/employer/submissions?jobId=${jobId}`),
        fetch(`/api/employer/applications?jobId=${jobId}`),
      ]);
      const subsData = subsRes.ok ? await subsRes.json() : { submissions: [] };
      const appsData = appsRes.ok ? await appsRes.json() : { applications: [] };
      setConsultantSubs(subsData.submissions ?? []);
      setDirectApps(appsData.applications ?? []);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  function toggleConsultant(id: string) {
    setExpandedConsultants(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  async function actOnSubmission(id: number, status: 'shortlisted' | 'rejected', rejectionReason?: string) {
    setActioning(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/submissions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(rejectionReason ? { rejectionReason } : {}) }),
      });
      if (res.status === 400) {
        const data = await res.json();
        if (data.error === 'rejection_reason_required') {
          setActioning(prev => { const s = new Set(prev); s.delete(id); return s; });
          setRejectTarget({ kind: 'submission', id });
          return;
        }
      }
      if (res.ok) {
        setConsultantSubs(prev => prev.map(s => s.id === id ? { ...s, status } : s));
        setRejectTarget(null);
      }
    } finally {
      setActioning(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function actOnApplication(id: number, status: 'shortlisted' | 'rejected', rejectionReason?: string) {
    setActioning(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/employer/applications/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(rejectionReason ? { rejectionReason } : {}) }),
      });
      if (res.status === 400) {
        const data = await res.json();
        if (data.error === 'rejection_reason_required') {
          setActioning(prev => { const s = new Set(prev); s.delete(id); return s; });
          setRejectTarget({ kind: 'application', id });
          return;
        }
      }
      if (res.ok) {
        setDirectApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        setRejectTarget(null);
      }
    } finally {
      setActioning(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  // Group consultant submissions by consultant
  const grouped = consultantSubs.reduce<Record<string, { name: string; email: string; items: ConsultantSubmission[] }>>((acc, s) => {
    if (!acc[s.consultantId]) acc[s.consultantId] = { name: s.consultantName, email: s.consultantEmail, items: [] };
    acc[s.consultantId].items.push(s);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-[#0c0c0c] border border-white/10 rounded-2xl max-h-[92vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">{jobTitle}</h2>
            <p className="text-xs text-white/50 mt-0.5">Submissions by consultant + direct applications</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-white/40" /></div>
          ) : (
            <>
              {/* Consultant submissions grouped */}
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users size={12} /> Consultant Submissions ({consultantSubs.length})
                </h3>
                {Object.keys(grouped).length === 0 ? (
                  <p className="text-sm text-white/30 py-3">No consultant submissions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(grouped).map(([consultantId, group]) => {
                      const isExpanded = expandedConsultants.has(consultantId);
                      return (
                        <div key={consultantId} className="border border-white/10 rounded-xl overflow-hidden">
                          <button
                            onClick={() => toggleConsultant(consultantId)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                          >
                            <span className="text-sm font-semibold text-white">{group.name} — {group.items.length} submission{group.items.length === 1 ? '' : 's'}</span>
                            {isExpanded ? <ChevronDown size={16} className="text-white/40" /> : <ChevronRight size={16} className="text-white/40" />}
                          </button>
                          {isExpanded && (
                            <div className="divide-y divide-white/5">
                              {group.items.map(item => {
                                const isActioning = actioning.has(item.id);
                                const canAct = item.status === 'pending' || item.status === 'review';
                                return (
                                  <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-white truncate">{item.candidateName}</p>
                                      <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[item.status] || 'bg-muted text-muted-foreground'}`}>
                                        {item.status}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {item.cvUrl && (
                                        <a href={item.cvUrl} target="_blank" rel="noopener noreferrer"
                                          className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white" title="View CV">
                                          <FileText size={12} />
                                        </a>
                                      )}
                                      {item.status === 'interview' && (
                                        <button onClick={() => setInterviewTarget({ id: item.id, candidateName: item.candidateName })}
                                          className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-purple-400/30 text-purple-300 hover:bg-purple-400/10" title="Interview">
                                          Interview
                                        </button>
                                      )}
                                      {canAct && (
                                        <>
                                          <button disabled={isActioning} onClick={() => setRejectTarget({ kind: 'submission', id: item.id })}
                                            className="w-7 h-7 rounded-lg border border-red-500/30 text-red-400 flex items-center justify-center hover:bg-red-500/10 disabled:opacity-40" title="Reject">
                                            {isActioning ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} />}
                                          </button>
                                          <button disabled={isActioning} onClick={() => actOnSubmission(item.id, 'shortlisted')}
                                            className="w-7 h-7 rounded-lg bg-[#E8470A] text-white flex items-center justify-center hover:bg-[#E8470A]/90 disabled:opacity-40" title="Shortlist">
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

              {/* Direct applications */}
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Direct Applications ({directApps.length})</h3>
                {directApps.length === 0 ? (
                  <p className="text-sm text-white/30 py-3">No direct applications yet.</p>
                ) : (
                  <div className="border border-white/10 rounded-xl divide-y divide-white/5">
                    {directApps.map(app => {
                      const isActioning = actioning.has(app.id);
                      const canAct = app.status === 'applied';
                      return (
                        <div key={app.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{app.candidateName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[app.status] || 'bg-muted text-muted-foreground'}`}>
                                {app.status}
                              </span>
                              {app.cvMatchScore != null && (
                                <span className="text-[10px] text-white/40">Match: {app.cvMatchScore}%</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {app.candidateCvUrl && (
                              <a href={app.candidateCvUrl} target="_blank" rel="noopener noreferrer"
                                className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white" title="View CV">
                                <ExternalLink size={12} />
                              </a>
                            )}
                            {canAct && (
                              <>
                                <button disabled={isActioning} onClick={() => setRejectTarget({ kind: 'application', id: app.id })}
                                  className="w-7 h-7 rounded-lg border border-red-500/30 text-red-400 flex items-center justify-center hover:bg-red-500/10 disabled:opacity-40" title="Reject">
                                  {isActioning ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} />}
                                </button>
                                <button disabled={isActioning} onClick={() => actOnApplication(app.id, 'shortlisted')}
                                  className="w-7 h-7 rounded-lg bg-[#E8470A] text-white flex items-center justify-center hover:bg-[#E8470A]/90 disabled:opacity-40" title="Shortlist">
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
            </>
          )}
        </div>
      </motion.div>

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
    </div>
  );
}
