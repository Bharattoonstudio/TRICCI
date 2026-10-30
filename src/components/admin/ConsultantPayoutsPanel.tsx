/**
 * Admin panel: employer payments, the TRICCI / consultant split, and consultant payouts.
 * "Mark payment done" logs a transfer you have already made from the TRICCI account and
 * emails the consultant a receipt. It does not send money.
 */
import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface Transfer { amountPaise: number; reference: string; paidAt: string }
interface Payout {
  placementId: number;
  candidateName: string | null;
  jobTitle: string | null;
  companyName: string | null;
  consultantName: string | null;
  amountPaise: number;
  platformPaise: number;
  consultantPaise: number;
  gstPaise: number;
  employerPaidAt: string | null;
  paidOutPaise: number;
  duePaise: number;
  transfers: Transfer[];
}
interface Totals { receivedPaise: number; tricciPaise: number; gstPaise: number; consultantPaise: number; paidOutPaise: number; duePaise: number }

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;
const rupeesInput = (paise: number) => String(paise / 100);

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <p className="text-[11px] text-white/50 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-1 ${tone ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

function PayoutRow({ p, onRecorded }: { p: Payout; onRecorded: () => void }) {
  const [amount, setAmount] = useState(rupeesInput(p.duePaise));
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function markDone() {
    setBusy(true);
    setError('');
    const amountPaise = Math.round(Number(amount) * 100);
    try {
      const res = await fetch(`/api/admin/payouts/${p.placementId}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amountPaise, reference }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error || 'Could not record the payment.'); return; }
      setReference('');
      onRecorded();
    } catch {
      setError('Network error. Nothing was recorded.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-white/5 align-top">
      <td className="p-3 text-white">{p.consultantName ?? '—'}</td>
      <td className="p-3 text-white/70">{p.candidateName} · {p.jobTitle} · {p.companyName}</td>
      <td className="p-3 text-white/70">{rupees(p.amountPaise)}</td>
      <td className="p-3 text-white/70">{rupees(p.platformPaise)}</td>
      <td className="p-3 text-white">{rupees(p.consultantPaise)}</td>
      <td className="p-3 text-white/70">{rupees(p.paidOutPaise)}</td>
      <td className="p-3 text-white font-semibold">{rupees(p.duePaise)}</td>
      <td className="p-3">
        {p.duePaise > 0 ? (
          <div className="flex flex-col gap-2 min-w-[230px]">
            <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" aria-label="Amount paid to consultant (₹)"
              className="rounded-lg bg-black/40 border border-white/10 p-2 text-xs text-white" />
            <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Bank UTR or UPI reference"
              className="rounded-lg bg-black/40 border border-white/10 p-2 text-xs text-white" />
            <button disabled={busy || !amount || reference.trim().length < 3} onClick={markDone}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40">
              {busy ? 'Saving…' : 'Mark payment done & email receipt'}
            </button>
            {error && <p className="text-[11px] text-red-400">{error}</p>}
          </div>
        ) : (
          <span className="text-xs text-green-400">Fully paid out</span>
        )}
        {p.transfers.length > 0 && (
          <ul className="mt-2 text-[11px] text-white/40 space-y-0.5">
            {p.transfers.map((t, i) => <li key={i}>{rupees(t.amountPaise)} · {t.reference}</li>)}
          </ul>
        )}
      </td>
    </tr>
  );
}

export default function ConsultantPayoutsPanel() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/payouts', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setPayouts(d.payouts ?? []); setTotals(d.totals ?? null); })
      .catch(() => { setPayouts([]); setTotals(null); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-foreground mb-1">Payments and consultant payouts</h2>
      <p className="text-xs text-white/50 mb-4">Employer has paid TRICCI. Pay the consultant from the TRICCI account, then mark it done here. The consultant gets a receipt email.</p>

      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <Stat label="Received from employers" value={rupees(totals.receivedPaise)} />
          <Stat label="TRICCI share" value={rupees(totals.tricciPaise)} tone="text-primary" />
          <Stat label="GST collected" value={rupees(totals.gstPaise)} />
          <Stat label="Consultant share" value={rupees(totals.consultantPaise)} />
          <Stat label="Paid to consultants" value={rupees(totals.paidOutPaise)} tone="text-green-400" />
          <Stat label="You still need to pay" value={rupees(totals.duePaise)} tone="text-amber-300" />
        </div>
      )}

      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-white/30" /></div>
      ) : payouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No employer payments received yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-xs">
            <thead className="text-left text-white/50">
              <tr>
                <th className="p-3">Consultant</th><th className="p-3">Candidate · Job · Company</th>
                <th className="p-3">Employer paid</th><th className="p-3">TRICCI share</th><th className="p-3">Consultant share</th>
                <th className="p-3">Paid out</th><th className="p-3">Due</th><th className="p-3">Pay consultant</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => <PayoutRow key={p.placementId} p={p} onRecorded={load} />)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
