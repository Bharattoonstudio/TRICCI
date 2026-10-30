import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ReceiptText, Loader2, ChevronLeft } from 'lucide-react';
import InvoiceThread from '@/components/invoices/InvoiceThread';

interface Row { placementId: number; status: string; totalAmountLpa: number; candidateName: string | null; jobTitle: string | null; consultantName: string | null }

const STATUS_LABEL: Record<string, string> = {
  sent_to_employer: 'Needs your approval',
  sent_back: 'Changes being made',
  employer_approved: 'Approved',
  paid: 'Paid',
};
const rupees = (lpa: number) => `₹${Math.round(lpa * 100000).toLocaleString('en-IN')}`;

export default function EmployerInvoicesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/employer/invoices', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setRows(d.invoices ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Invoices — TRICCI</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link to="/employer/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft size={15} /> Dashboard
        </Link>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
          <ReceiptText size={22} className="text-primary" /> Invoices
        </h1>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-white/30" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices to review yet. You will see them here once TRICCI sends one to you.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <button key={r.placementId} onClick={() => setSelected(r.placementId)}
                className={`w-full text-left rounded-xl border p-4 hover:bg-white/5 ${selected === r.placementId ? 'border-primary' : 'border-white/10'}`}>
                <p className="text-sm font-bold text-white">{r.candidateName} · {r.jobTitle}</p>
                <p className="text-xs text-white/50">Consultant: {r.consultantName ?? '—'} · {rupees(r.totalAmountLpa)} · {STATUS_LABEL[r.status] ?? r.status}</p>
              </button>
            ))}
          </div>
        )}

        {selected !== null && <InvoiceThread key={selected} placementId={selected} viewerRole="employer" onChanged={load} />}
      </div>
    </div>
  );
}
