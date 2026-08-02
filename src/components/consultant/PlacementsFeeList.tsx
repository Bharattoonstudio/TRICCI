/**
 * PlacementsFeeList — points 48, 50-51, 53, 55: consultant sees offered
 * CTC + auto-calculated fee per placement, can Accept/Reject the fee, and
 * once paid, sees a "Remuneration Paid" state with an Acknowledge button.
 */
import { useState, useEffect } from 'react';
import { Loader2, IndianRupee, CheckCircle2, XCircle } from 'lucide-react';

interface Placement {
  id: number;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  ctcLpa: number | null;
  feePercent: number | null;
  consultantFeePercent: number | null;
  consultantFeeAmountLpa: number | null;
  feeAcceptanceStatus: string;
  paymentStatus: string;
  paymentTermDays: number;
  dueDate: string;
  consultantAcknowledgedAt: string | null;
}

export default function PlacementsFeeList() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<Set<number>>(new Set());

  function load() {
    setLoading(true);
    fetch('/api/consultant/placements')
      .then(r => r.json())
      .then(d => setPlacements(d.placements ?? []))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function respondToFee(id: number, action: 'accept' | 'reject') {
    setActioning(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/consultant/placements/${id}/fee/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) load();
    } finally {
      setActioning(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function acknowledgePayment(id: number) {
    setActioning(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/consultant/placements/${id}/acknowledge`, { method: 'POST' });
      if (res.ok) load();
    } finally {
      setActioning(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-white/30" /></div>;
  }
  if (placements.length === 0) {
    return (
      <div className="rounded-2xl border p-10 text-center" style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
        <IndianRupee size={24} className="text-white/15 mx-auto mb-3" />
        <p className="text-sm font-bold text-white/30">No placements yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
      <div className="px-6 py-4 border-b" style={{ borderColor: '#ffffff0d' }}>
        <h3 className="font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>Placements &amp; Fees</h3>
      </div>
      <div className="divide-y" style={{ borderColor: '#ffffff06' }}>
        {placements.map(p => {
          const isActioning = actioning.has(p.id);
          return (
            <div key={p.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-bold text-white">{p.candidateName}</p>
                  <p className="text-xs text-white/40 mt-0.5">{p.jobTitle} · {p.companyName}</p>
                </div>
                {p.consultantFeeAmountLpa != null && (
                  <p className="text-sm font-black text-primary shrink-0">₹{p.consultantFeeAmountLpa.toFixed(2)}L</p>
                )}
              </div>
              <p className="text-[11px] text-white/30 mb-3">
                Candidate CTC: {p.ctcLpa != null ? `₹${p.ctcLpa}L` : '—'} · Your fee: {p.consultantFeePercent != null ? `${p.consultantFeePercent}%` : '—'} (platform keeps 2%)
              </p>

              {p.feeAcceptanceStatus === 'pending' && (
                <div className="flex items-center gap-2">
                  <button disabled={isActioning} onClick={() => respondToFee(p.id, 'reject')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-40">
                    {isActioning ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />} Reject Fee
                  </button>
                  <button disabled={isActioning} onClick={() => respondToFee(p.id, 'accept')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-40">
                    {isActioning ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Accept Fee
                  </button>
                </div>
              )}

              {p.feeAcceptanceStatus === 'accepted' && p.paymentStatus !== 'paid' && (
                <p className="text-[11px] text-white/40 italic">Fee accepted — payment due by {new Date(p.dueDate).toLocaleDateString('en-IN')}</p>
              )}

              {p.feeAcceptanceStatus === 'rejected' && (
                <p className="text-[11px] text-red-400/70 italic">Fee rejected</p>
              )}

              {p.paymentStatus === 'paid' && (
                p.consultantAcknowledgedAt ? (
                  <p className="text-[11px] text-green-400 flex items-center gap-1"><CheckCircle2 size={11} /> Remuneration Paid — acknowledged</p>
                ) : (
                  <button disabled={isActioning} onClick={() => acknowledgePayment(p.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-500 disabled:opacity-40">
                    {isActioning ? <Loader2 size={11} className="animate-spin" /> : null} Acknowledge Payment Received
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
