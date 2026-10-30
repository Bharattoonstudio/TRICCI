/**
 * Admin control: collect GST from the employer on this invoice. Ticking it fills in GST
 * as placement fee × rate and shows the calculation. Changing it updates the amount the
 * employer will pay. Only available until the invoice has gone to the employer.
 */
import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface InvoiceDetail {
  status: string;
  gstEnabled: boolean;
  gstRatePct: number;
  feeAmountLpa: number;
  gstAmountLpa: number;
  totalAmountLpa: number;
}

const rupees = (lpa: number) => `₹${Math.round(lpa * 100000).toLocaleString('en-IN')}`;

export default function InvoiceGstControl({ placementId, status, onChanged }: { placementId: number; status: string; onChanged: () => void }) {
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetch(`/api/admin/invoices/${placementId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setInv(d.invoice ?? null))
      .catch(() => setInv(null));
  }, [placementId]);

  useEffect(() => { load(); }, [load, status]);

  async function setGst(enabled: boolean) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/invoices/${placementId}/gst`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gstEnabled: enabled }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error || 'Could not update GST.'); return; }
      load();
      onChanged();
    } catch {
      setError('Network error. GST was not changed.');
    } finally {
      setBusy(false);
    }
  }

  if (!inv) return <div className="py-2"><Loader2 size={14} className="animate-spin text-white/30" /></div>;
  const editable = ['submitted', 'approved', 'sent_back'].includes(inv.status);

  return (
    <div className="rounded-lg border border-white/10 p-3 space-y-2">
      <label className="flex items-center gap-2 text-xs text-white/80">
        <input type="checkbox" checked={inv.gstEnabled} disabled={!editable || busy} onChange={e => setGst(e.target.checked)} />
        Collect GST from employer
        {busy && <Loader2 size={12} className="animate-spin text-white/40" />}
      </label>
      <div className="text-[11px] text-white/60 space-y-0.5">
        <p>Placement fee: {rupees(inv.feeAmountLpa)}</p>
        <p>GST at {inv.gstRatePct}% of fee: {inv.gstEnabled ? rupees(inv.gstAmountLpa) : 'not collected'}</p>
        <p className="text-white font-semibold">Employer pays: {rupees(inv.totalAmountLpa)}</p>
      </div>
      {!editable && <p className="text-[11px] text-white/40">Locked: the invoice has gone to the employer.</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
