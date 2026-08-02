/**
 * PlacementsSettledList — point 54: employer's "Fees Settled" view,
 * mirroring the consultant's placements list — every placement, the
 * consultant's fee acceptance status, and payment/settlement status.
 */
import { useState, useEffect } from 'react';
import { Loader2, IndianRupee, CheckCircle2, Clock } from 'lucide-react';

interface Placement {
  id: number;
  jobTitle: string;
  candidateName: string;
  consultantName: string | null;
  ctcLpa: number | null;
  feePercent: number | null;
  feeAmountLpa: number | null;
  feeAcceptanceStatus: string;
  paymentStatus: string;
  dueDate: string;
}

export default function PlacementsSettledList() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch('/api/employer/placements')
      .then(r => r.json())
      .then(d => {
        setPlacements(d.placements ?? []);
        setTotalPaid(d.totalFeesPaid ?? 0);
        setPendingCount(d.pendingCount ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Fees Settled</p>
          <p className="text-3xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>₹{totalPaid.toFixed(2)}L</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-sm text-muted-foreground mb-1">Pending Settlement</p>
          <p className="text-3xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{pendingCount}</p>
        </div>
      </div>

      {placements.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-16 text-center">
          <IndianRupee size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-foreground">No placements yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {placements.map(p => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.candidateName} — {p.jobTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Consultant: {p.consultantName ?? '—'} · Fee: {p.feeAmountLpa != null ? `₹${p.feeAmountLpa.toFixed(2)}L` : '—'}
                    {p.feeAcceptanceStatus === 'pending' && ' · awaiting consultant acceptance'}
                  </p>
                </div>
                {p.paymentStatus === 'paid' ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-500 shrink-0"><CheckCircle2 size={13} /> Settled</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-yellow-500 shrink-0"><Clock size={13} /> Due {new Date(p.dueDate).toLocaleDateString('en-IN')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
