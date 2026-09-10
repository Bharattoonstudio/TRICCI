/**
 * Consultant Job Detail Page — /consultant/jobs/:id
 * Mirrors the employer's job detail page: JD, commission (consultant's
 * share only), a funnel dashboard of THIS consultant's own submissions
 * for this job, and rejection reasons visible where present (point 38:
 * "if rejected → see employer's stated reason").
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
import {
  ArrowLeft, Loader2, MapPin, Briefcase, IndianRupee, FileText,
  CalendarClock, AlertCircle,
} from 'lucide-react';
import ProposeInterviewModal from '@/components/consultant/ProposeInterviewModal';

interface JobDetail {
  id: string; title: string; department: string; location: string;
  ctcLabel: string; ctcMin: number; ctcMax: number; feePercent: number; status: string;
}
interface Funnel {
  submitted: number; seen: number; shortlisted: number; interview: number; rejected: number; selected: number;
}
interface MySubmission {
  id: number; status: string; candidateName: string; cvUrl: string | null;
  createdAt: string; rejectionReason: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-white/10 text-white/50', review: 'bg-yellow-500/10 text-yellow-400',
  shortlisted: 'bg-primary/15 text-primary', interview: 'bg-purple-500/15 text-purple-400',
  hold: 'bg-slate-400/15 text-slate-400', selected: 'bg-green-500/15 text-green-400',
  rejected: 'bg-red-500/15 text-red-400', placed: 'bg-green-500/15 text-green-400',
};

export default function ConsultantJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [mySubmissions, setMySubmissions] = useState<MySubmission[]>([]);
  const [consultantFeePct, setConsultantFeePct] = useState<number>(8);
  const [loading, setLoading] = useState(true);
  const [proposeFor, setProposeFor] = useState<MySubmission | null>(null);
  const [proposing, setProposing] = useState(false);
  const [proposeError, setProposeError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detailRes, commRes] = await Promise.all([
        fetch(`/api/consultant/jobs/${id}/detail`),
        fetch('/api/commission/config'),
      ]);
      if (detailRes.ok) {
        const d = await detailRes.json();
        setJobDetail(d.job);
        setFunnel(d.funnel);
        setMySubmissions(d.submissions ?? []);
      }
      if (commRes.ok) {
        const c = await commRes.json();
        if (c.consultantFeePct) setConsultantFeePct(c.consultantFeePct);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleProposeInterview(proposedDate: string, note: string) {
    if (!proposeFor) return;
    setProposing(true);
    setProposeError('');
    try {
      const res = await fetch(`/api/consultant/submissions/${proposeFor.id}/interview/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposedDate, note }),
      });
      if (res.ok) { setProposeFor(null); load(); }
      else { const data = await res.json(); setProposeError(data.error || 'Failed to propose interview time.'); }
    } finally {
      setProposing(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>;
  }
  if (!jobDetail) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/40">Job not found</div>;
  }

  const ctcMidLPA = ((jobDetail.ctcMin + jobDetail.ctcMax) / 2) / 100000;
  const estimatedFee = Math.round(ctcMidLPA * consultantFeePct / 100 * 100000);
  const feeLabel = estimatedFee >= 100000 ? `₹${(estimatedFee / 100000).toFixed(1)}L` : `₹${(estimatedFee / 1000).toFixed(0)}K`;

  return (
    <>
      <Helmet><title>{jobDetail.title} — TRICCI</title><meta name="robots" content="noindex" /></Helmet>
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <button onClick={() => navigate('/consultant/dashboard')} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/80 mb-4">
            <ArrowLeft size={15} /> Back to Dashboard
          </button>

          {/* ── Job Header ── */}
          <div className="rounded-2xl border p-6 mb-5" style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{jobDetail.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-white/40 flex-wrap">
              <span className="flex items-center gap-1"><Briefcase size={13} /> {jobDetail.department}</span>
              <span className="flex items-center gap-1"><MapPin size={13} /> {jobDetail.location}</span>
              <span className="flex items-center gap-1"><IndianRupee size={13} /> {jobDetail.ctcLabel}</span>
            </div>

            {/* Commission banner — consultant's share only (point 28) */}
            <div className="mt-4 flex items-center gap-3 bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                <IndianRupee size={15} className="text-green-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-green-400 uppercase tracking-wide">Your Commission on Placement</p>
                <p className="text-sm font-black text-white mt-0.5">{feeLabel} estimated · {consultantFeePct}% of CTC</p>
              </div>
            </div>
          </div>

          {/* ── Your funnel for this job ── */}
          {funnel && (
            <div className="rounded-2xl border p-6 mb-5" style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
              <h2 className="text-sm font-bold text-white mb-4">Your Submissions Funnel</h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: 'Submitted', value: funnel.submitted, color: '#35c9ff' },
                  { label: 'Seen', value: funnel.seen, color: '#6B4FBB' },
                  { label: 'Shortlisted', value: funnel.shortlisted, color: '#E8470A' },
                  { label: 'Interview', value: funnel.interview, color: '#a855f7' },
                  { label: 'Rejected', value: funnel.rejected, color: '#EF4444' },
                  { label: 'Selected', value: funnel.selected, color: '#22c55e' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-black" style={{ color: s.color, fontFamily: 'var(--font-heading)' }}>{s.value}</p>
                    <p className="text-[11px] text-white/30 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Your candidates for this job ── */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: '#ffffff0d' }}>
              <h2 className="text-sm font-bold text-white">Your Candidates ({mySubmissions.length})</h2>
            </div>
            {mySubmissions.length === 0 ? (
              <p className="text-sm text-white/30 px-6 py-6">You haven't submitted any candidates for this job yet.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: '#ffffff06' }}>
                {mySubmissions.map(s => (
                  <div key={s.id} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{s.candidateName}</p>
                        <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status] || 'bg-white/10 text-white/50'}`}>{s.status}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {s.cvUrl && (
                          <a href={s.cvUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white" title="View CV"><FileText size={12} /></a>
                        )}
                        {s.status === 'shortlisted' && (
                          <button onClick={() => setProposeFor(s)} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-1">
                            <CalendarClock size={11} /> Propose Interview
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Point 38: rejection reason visible to consultant */}
                    {s.status === 'rejected' && s.rejectionReason && (
                      <div className="mt-2 flex items-start gap-1.5 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
                        <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-300">{s.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {proposeFor && (
        <ProposeInterviewModal
          candidateName={proposeFor.candidateName}
          submitting={proposing}
          error={proposeError}
          onClose={() => { setProposeFor(null); setProposeError(''); }}
          onSubmit={handleProposeInterview}
        />
      )}
    </>
  );
}
