/**
 * ConsultantInvoicePanel: the consultant raises an invoice for a placement.
 * Shows the auto-calculated 80/20 split, a GST toggle, Generate / Save changes,
 * and Submit (with a Yes / No confirmation). Once submitted it is locked.
 */
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

type InvoiceStatus = 'draft' | 'submitted' | 'approved' | 'sent_back' | 'sent_to_employer';

interface InvoiceRow {
  status: InvoiceStatus;
  adminRemarks: string | null;
  gstEnabled: boolean;
  gstRatePct: number;
  feeAmountLpa: number;
  platformAmountLpa: number;
  consultantAmountLpa: number;
  gstAmountLpa: number;
  totalAmountLpa: number;
  invoiceNumber: string | null;
  submittedAt: string | null;
}

interface Preview {
  feeAmountLpa: number;
  platformAmountLpa: number;
  consultantAmountLpa: number;
  gstAmountLpa: number;
  totalAmountLpa: number;
  platformSharePct: number;
  consultantSharePct: number;
}

interface DraftResponse {
  placement: { candidateName: string; jobTitle: string; companyName: string; offerCtcLpa: number | null };
  ctcOffered: boolean;
  invoice: InvoiceRow | null;
  preview: Preview | null;
  gstRatePct: number;
}

const rupees = (lpa: number) => `₹${Math.round(lpa * 100000).toLocaleString('en-IN')}`;

export default function ConsultantInvoicePanel({ placementId }: { placementId: number }) {
  const [data, setData] = useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [gst, setGst] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/consultant/placements/${placementId}/invoice-draft`, { credentials: 'include' })
      .then(r => r.json())
      .then((d: DraftResponse & { error?: string }) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        if (d.invoice) setGst(d.invoice.gstEnabled);
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [placementId]);

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/consultant/placements/${placementId}/invoice-draft/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gstEnabled: gst }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error || 'Could not generate the invoice.'); return; }
      load();
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/consultant/placements/${placementId}/invoice-draft/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmed: true }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error || 'Could not submit the invoice.'); return; }
      setConfirming(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="py-4 flex justify-center"><Loader2 size={16} className="animate-spin text-white/30" /></div>;
  if (!data) return error ? <p className="text-[11px] text-red-400 py-2">{error}</p> : null;

  if (!data.ctcOffered) {
    return (
      <div className="rounded-xl border p-4 mt-3" style={{ borderColor: '#ffffff0d', background: '#080808' }}>
        <p className="text-xs text-white/40">The employer has not entered the CTC offered yet. You can generate the invoice once they do.</p>
      </div>
    );
  }

  const invoice = data.invoice;
  // Locked while TRICCI reviews or after it has gone to the employer. Editable in draft and after send-back.
  const locked = invoice ? ['submitted', 'approved', 'sent_to_employer'].includes(invoice.status) : false;
  const lockedLabel: Record<string, string> = {
    submitted: 'Submitted — awaiting TRICCI review',
    approved: 'Approved by TRICCI — will be sent to the employer',
    sent_to_employer: 'Sent to employer — awaiting payment',
  };
  const amounts = invoice
    ? { ...invoice, platformSharePct: 100 - (data.preview?.consultantSharePct ?? 80), consultantSharePct: data.preview?.consultantSharePct ?? 80 }
    : data.preview;

  return (
    <div className="rounded-xl border p-4 mt-3 space-y-3" style={{ borderColor: '#ffffff0d', background: '#080808' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-white">Invoice to employer</p>
        {locked && invoice && <span className="text-[11px] text-green-400 flex items-center gap-1"><CheckCircle2 size={11} /> {lockedLabel[invoice.status]}</span>}
      </div>

      {invoice?.status === 'sent_back' && (
        <div className="rounded-lg border p-3 text-xs text-amber-300" style={{ borderColor: '#f59e0b33', background: '#f59e0b0d' }}>
          <p className="font-bold mb-1">TRICCI sent this invoice back for changes</p>
          <p className="text-amber-200/80 whitespace-pre-wrap">{invoice.adminRemarks}</p>
          <p className="text-white/40 mt-2">Edit the invoice, save, then submit again.</p>
        </div>
      )}

      {amounts && (
        <div className="text-[12px] text-white/70 space-y-1">
          <div className="flex justify-between"><span>Placement fee (before GST)</span><span>{rupees(amounts.feeAmountLpa)}</span></div>
          <div className="flex justify-between text-white/40"><span>TRICCI platform share ({amounts.platformSharePct}%)</span><span>{rupees(amounts.platformAmountLpa)}</span></div>
          <div className="flex justify-between text-white/40"><span>Your share ({amounts.consultantSharePct}%)</span><span>{rupees(amounts.consultantAmountLpa)}</span></div>
          <div className="flex justify-between"><span>GST {gst ? `(${data.gstRatePct}%)` : '(not charged)'}</span><span>{rupees(amounts.gstAmountLpa)}</span></div>
          <div className="flex justify-between font-bold text-white border-t pt-1" style={{ borderColor: '#ffffff0d' }}><span>Total payable by employer</span><span>{rupees(amounts.totalAmountLpa)}</span></div>
        </div>
      )}

      {!locked && (
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input type="checkbox" checked={gst} onChange={e => setGst(e.target.checked)} />
          I charge GST on this invoice
        </label>
      )}

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      {!locked && (
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={generate}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/80 text-xs font-semibold hover:bg-white/5 disabled:opacity-40">
            {invoice ? 'Save changes' : 'Generate invoice'}
          </button>
          {invoice && (
            <button disabled={busy} onClick={() => setConfirming(true)}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-40">
              Submit invoice
            </button>
          )}
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="rounded-2xl border p-6 max-w-sm w-full" style={{ background: '#0d0d0d', borderColor: '#ffffff1a' }}>
            <p className="text-sm font-bold text-white mb-2">Submit this invoice?</p>
            <p className="text-xs text-white/50 mb-5">Once submitted, the invoice cannot be edited. It will go to TRICCI admin for approval.</p>
            <div className="flex justify-end gap-2">
              <button disabled={busy} onClick={() => setConfirming(false)}
                className="px-4 py-2 rounded-lg border border-white/10 text-white/70 text-xs font-semibold hover:bg-white/5">No</button>
              <button disabled={busy} onClick={submit}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-40">
                {busy ? 'Submitting…' : 'Yes, submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
