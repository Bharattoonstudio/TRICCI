import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ReceiptText, RefreshCw, Loader2, ChevronLeft } from 'lucide-react';
import ConsultantPayoutsPanel from '@/components/admin/ConsultantPayoutsPanel';
import InvoiceGstControl from '@/components/admin/InvoiceGstControl';

type InvoiceStatus = 'draft' | 'submitted' | 'approved' | 'sent_back' | 'sent_to_employer' | 'paid';

interface InvoiceListRow {
  placementId: number;
  status: InvoiceStatus;
  totalAmountLpa: number;
  gstEnabled: boolean;
  invoiceNumber: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
  candidateName: string | null;
  jobTitle: string | null;
  companyName: string | null;
  consultantName: string | null;
}

interface Journey {
  jobId: string;
  title: string;
  company: string;
  postedAt: string | null;
  pickedUpAt: string | null;
  consultantsAccepted: number;
  consultantsSubmitting: number;
  candidatesShared: number;
  candidatesInterviewed: number;
  interviewRounds: number;
  selections: number;
  firstSelectedAt: string | null;
}

const STATUSES: Array<'' | InvoiceStatus> = ['', 'submitted', 'approved', 'sent_back', 'sent_to_employer', 'paid', 'draft'];
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  submitted: 'Awaiting review',
  approved: 'Approved',
  sent_back: 'Sent back',
  sent_to_employer: 'Sent to employer',
  paid: 'Paid by employer',
};

const rupees = (lpa: number) => `₹${Math.round(lpa * 100000).toLocaleString('en-IN')}`;
const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

async function postAction(url: string, body?: unknown): Promise<string | null> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? null : (data.error || 'Action failed.');
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [statusFilter, setStatusFilter] = useState<'' | InvoiceStatus>('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : '';
    Promise.all([
      fetch(`/api/admin/invoices${q}`, { credentials: 'include' }).then(r => r.json()),
      fetch('/api/admin/journeys', { credentials: 'include' }).then(r => r.json()),
    ])
      .then(([inv, jn]) => {
        setInvoices(inv.invoices ?? []);
        setJourneys(jn.journeys ?? []);
      })
      .catch(() => setError('Could not load invoices.'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function act(url: string, body?: unknown) {
    setBusy(true);
    setError('');
    const err = await postAction(url, body);
    setBusy(false);
    if (err) { setError(err); return; }
    setRemarks('');
    load();
  }

  const current = invoices.find(i => i.placementId === selected) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Invoices — Admin — TRICCI</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ChevronLeft size={15} /> Admin Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
            <ReceiptText size={22} className="text-primary" /> Consultant Invoices
          </h1>
          <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground" aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {STATUSES.map(s => (
            <button key={s || 'all'} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>
              {s ? STATUS_LABEL[s] : 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-white/30" /></div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8">No invoices in this view.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 mb-10">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-white/50">
                <tr>
                  <th className="p-3">Candidate</th><th className="p-3">Job / Company</th><th className="p-3">Consultant</th>
                  <th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(i => (
                  <tr key={i.placementId} onClick={() => { setSelected(i.placementId); setError(''); }}
                    className={`cursor-pointer border-t border-white/5 hover:bg-white/5 ${selected === i.placementId ? 'bg-white/5' : ''}`}>
                    <td className="p-3 text-white">{i.candidateName ?? '—'}</td>
                    <td className="p-3 text-white/70">{i.jobTitle} · {i.companyName}</td>
                    <td className="p-3 text-white/70">{i.consultantName ?? '—'}</td>
                    <td className="p-3 text-white">{rupees(i.totalAmountLpa)}</td>
                    <td className="p-3 text-white/80">{STATUS_LABEL[i.status]}</td>
                    <td className="p-3 text-white/50">{fmtDate(i.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {current && (
          <div className="rounded-xl border border-white/10 p-5 mb-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-white">{current.candidateName} — {current.jobTitle}</p>
                <p className="text-xs text-white/50">{current.companyName} · consultant {current.consultantName ?? '—'} · {current.invoiceNumber ?? 'no invoice number'}</p>
              </div>
              <span className="text-xs text-white/70">{STATUS_LABEL[current.status]}</span>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <InvoiceGstControl placementId={current.placementId} status={current.status} onChanged={load} />

            {current.status === 'submitted' && (
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => act(`/api/admin/invoices/${current.placementId}/approve`)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40">Approve</button>
              </div>
            )}

            {(current.status === 'submitted' || current.status === 'approved') && (
              <div className="space-y-2">
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} placeholder="Remarks for the consultant (required)"
                  className="w-full rounded-lg bg-black/40 border border-white/10 p-2 text-xs text-white" />
                <button disabled={busy || !remarks.trim()} onClick={() => act(`/api/admin/invoices/${current.placementId}/send-back`, { remarks: remarks.trim() })}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-white/80 text-xs font-semibold disabled:opacity-40">Send back with remarks</button>
              </div>
            )}

            {current.status === 'approved' && (
              <button disabled={busy} onClick={() => act(`/api/admin/invoices/${current.placementId}/send-to-employer`)}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40">Send to employer</button>
            )}
          </div>
        )}

        <ConsultantPayoutsPanel />

        <h2 className="text-lg font-bold text-foreground mb-3">Job journeys</h2>
        {journeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs">
              <thead className="text-left text-white/50">
                <tr>
                  <th className="p-3">Job</th><th className="p-3">Posted</th><th className="p-3">Picked up</th>
                  <th className="p-3">Consultants working</th><th className="p-3">Candidates shared</th>
                  <th className="p-3">Interviewed</th><th className="p-3">Interview rounds</th><th className="p-3">Selected</th><th className="p-3">First selection</th>
                </tr>
              </thead>
              <tbody>
                {journeys.map(j => (
                  <tr key={j.jobId} className="border-t border-white/5">
                    <td className="p-3 text-white">{j.title} · {j.company}</td>
                    <td className="p-3 text-white/70">{fmtDate(j.postedAt)}</td>
                    <td className="p-3 text-white/70">{fmtDate(j.pickedUpAt)}</td>
                    <td className="p-3 text-white/70">{j.consultantsAccepted} accepted · {j.consultantsSubmitting} submitting</td>
                    <td className="p-3 text-white/70">{j.candidatesShared}</td>
                    <td className="p-3 text-white/70">{j.candidatesInterviewed}</td>
                    <td className="p-3 text-white/70">{j.interviewRounds}</td>
                    <td className="p-3 text-white/70">{j.selections}</td>
                    <td className="p-3 text-white/70">{fmtDate(j.firstSelectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
