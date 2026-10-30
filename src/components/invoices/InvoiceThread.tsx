/**
 * Invoice thread shared by admin, consultant and employer.
 * Shows the invoice amounts and the messages. The employer can approve the invoice,
 * or ask for a change (a query). Admin and consultant can reply.
 */
import { useEffect, useState, useCallback } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

type ViewerRole = 'admin' | 'consultant' | 'employer';

interface Msg { id: number; authorRole: string; kind: string; body: string; createdAt: string; mine: boolean }
interface ThreadData {
  viewerRole: ViewerRole;
  placement: { candidateName: string; jobTitle: string; companyName: string };
  invoice: {
    status: string; invoiceNumber: string | null; gstEnabled: boolean; gstRatePct: number;
    feeAmountLpa: number; gstAmountLpa: number; totalAmountLpa: number; adminRemarks: string | null;
  };
  messages: Msg[];
}

const rupees = (lpa: number) => `₹${Math.round(lpa * 100000).toLocaleString('en-IN')}`;
const when = (v: string) => new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const ROLE_NAME: Record<string, string> = { admin: 'TRICCI', consultant: 'Consultant', employer: 'Employer' };
const STATUS_TEXT: Record<string, string> = {
  submitted: 'Waiting for TRICCI to review',
  approved: 'Approved by TRICCI, not yet sent to the employer',
  sent_back: 'Sent back for changes. The consultant is updating it.',
  sent_to_employer: 'Waiting for your approval',
  employer_approved: 'You have approved this invoice',
  paid: 'Paid',
};

export default function InvoiceThread({ placementId, viewerRole, onChanged }: { placementId: number; viewerRole: ViewerRole; onChanged?: () => void }) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetch(`/api/invoices/${placementId}/thread`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError('Could not load the invoice.'))
      .finally(() => setLoading(false));
  }, [placementId]);

  useEffect(() => { load(); }, [load]);

  async function send(raiseQuery: boolean) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/invoices/${placementId}/thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, raiseQuery }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error || 'Could not send your message.'); return; }
      setText('');
      load();
      onChanged?.();
    } catch {
      setError('Network error. Your message was not sent.');
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/employer/invoices/${placementId}/approve`, { method: 'POST', credentials: 'include' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error || 'Could not approve the invoice.'); return; }
      load();
      onChanged?.();
    } catch {
      setError('Network error. The invoice was not approved.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="py-4 flex justify-center"><Loader2 size={16} className="animate-spin text-white/30" /></div>;
  if (!data) return error ? <p className="text-xs text-red-400">{error}</p> : null;

  const inv = data.invoice;
  const canEmployerAct = viewerRole === 'employer' && inv.status === 'sent_to_employer';
  const canReply = inv.status !== 'paid';

  return (
    <div className="rounded-xl border border-white/10 p-4 space-y-4">
      <div>
        <p className="text-sm font-bold text-white">{data.placement.candidateName} · {data.placement.jobTitle}</p>
        <p className="text-xs text-white/50">{data.placement.companyName}{inv.invoiceNumber ? ` · ${inv.invoiceNumber}` : ''}</p>
        <p className="text-xs text-white/70 mt-1">{STATUS_TEXT[inv.status] ?? inv.status}</p>
      </div>

      <div className="text-[12px] text-white/70 space-y-1">
        <div className="flex justify-between"><span>Placement fee</span><span>{rupees(inv.feeAmountLpa)}</span></div>
        <div className="flex justify-between"><span>GST {inv.gstEnabled ? `at ${inv.gstRatePct}%` : '(not charged)'}</span><span>{inv.gstEnabled ? rupees(inv.gstAmountLpa) : '—'}</span></div>
        <div className="flex justify-between font-bold text-white border-t border-white/10 pt-1"><span>Total payable</span><span>{rupees(inv.totalAmountLpa)}</span></div>
      </div>

      {canEmployerAct && (
        <div className="rounded-lg border border-primary/30 p-3 space-y-2">
          <p className="text-xs text-white/80">Please check the invoice above. Approve it to continue, or ask for a change.</p>
          <button disabled={busy} onClick={approve} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40">
            Approve invoice
          </button>
        </div>
      )}

      {inv.status === 'employer_approved' && (
        <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 size={12} /> Approved. Payment is next.</p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-white/70">Messages</p>
        {data.messages.length === 0 ? (
          <p className="text-xs text-white/40">No messages yet.</p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {data.messages.map(m => (
              <li key={m.id} className={`rounded-lg p-2 text-xs ${m.kind === 'query' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
                <div className="flex justify-between text-[10px] text-white/50 mb-1">
                  <span>{m.mine ? 'You' : ROLE_NAME[m.authorRole] ?? m.authorRole}{m.kind === 'query' ? ' · query' : ''}</span>
                  <span>{when(m.createdAt)}</span>
                </div>
                <p className="text-white/85 whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canReply && (
        <div className="space-y-2">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={2000}
            placeholder={viewerRole === 'employer' ? 'Write your question or request for a change' : 'Write a reply'}
            className="w-full rounded-lg bg-black/40 border border-white/10 p-2 text-xs text-white" />
          <div className="flex flex-wrap gap-2">
            <button disabled={busy || text.trim().length < 2} onClick={() => send(false)}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-white/80 text-xs font-semibold disabled:opacity-40">
              Send message
            </button>
            {viewerRole === 'employer' && canEmployerAct && (
              <button disabled={busy || text.trim().length < 2} onClick={() => send(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold disabled:opacity-40">
                Ask for a change
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
