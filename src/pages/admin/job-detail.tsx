import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Briefcase, Loader2, ChevronLeft } from 'lucide-react';

interface JobDetail {
  id: string;
  title: string;
  company: string;
  department: string | null;
  location: string;
  locationType: string;
  ctcLabel: string;
  experience: string;
  category: string;
  status: string;
  visibility: string;
  feeType: string;
  feePercent: number;
  feeAmountRupees: number | null;
  paymentTermDays: number;
  description: string;
  skills: string[];
  createdAt: string | null;
}

interface Pipeline {
  id: number;
  candidateName: string | null;
  candidateEmail: string | null;
  status: string;
  createdAt: string | null;
}

interface SubmissionRow {
  id: number;
  candidateName: string;
  candidateEmail: string;
  status: string;
  consultantName: string | null;
  consultantEmail: string | null;
  createdAt: string | null;
}

interface JobDetailResponse {
  job: JobDetail;
  poster: { name: string | null; email: string | null };
  applications: Pipeline[];
  submissions: SubmissionRow[];
}

const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-white/50">{label}</dt>
      <dd className="text-sm text-white">{value === null || value === undefined || value === '' ? '—' : value}</dd>
    </div>
  );
}

export default function AdminJobDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<JobDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/jobs/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status === 404 ? 'Job not found.' : 'Could not load job.'))))
      .then((d: JobDetailResponse) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const fee = data
    ? data.job.feeType === 'amount'
      ? `₹${(data.job.feeAmountRupees ?? 0).toLocaleString('en-IN')} fixed`
      : `${data.job.feePercent}% of CTC`
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Helmet>
        <title>Job details — Admin — TRICCI</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft size={15} /> Back to Admin Dashboard
        </button>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-white/30" /></div>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : data ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                <Briefcase size={22} className="text-primary" /> {data.job.title}
              </h1>
              <p className="text-sm text-white/60 mt-1">
                {data.job.company || <span className="text-amber-400">Company name not set</span>} · {data.job.location}
              </p>
            </div>

            <section className="rounded-xl border border-white/10 bg-slate-800/40 p-5">
              <h2 className="text-sm font-bold text-white mb-4">Job</h2>
              <dl className="grid grid-cols-2 gap-4">
                <Field label="Job ID" value={data.job.id} />
                <Field label="Status" value={data.job.status} />
                <Field label="Visibility" value={data.job.visibility} />
                <Field label="Created" value={fmtDate(data.job.createdAt)} />
                <Field label="CTC" value={data.job.ctcLabel} />
                <Field label="Experience" value={data.job.experience} />
                <Field label="Location type" value={data.job.locationType} />
                <Field label="Department" value={data.job.department} />
                <Field label="Category" value={data.job.category} />
                <Field label="Employer fee" value={fee} />
                <Field label="Payment term" value={`${data.job.paymentTermDays} days`} />
                <Field label="Skills" value={data.job.skills?.join(', ')} />
              </dl>
            </section>

            <section className="rounded-xl border border-white/10 bg-slate-800/40 p-5">
              <h2 className="text-sm font-bold text-white mb-4">Posted by</h2>
              <dl className="grid grid-cols-2 gap-4">
                <Field label="Name" value={data.poster.name} />
                <Field label="Email" value={data.poster.email} />
              </dl>
            </section>

            <section className="rounded-xl border border-white/10 bg-slate-800/40 p-5">
              <h2 className="text-sm font-bold text-white mb-3">Description</h2>
              <p className="text-sm text-white/70 whitespace-pre-wrap">{data.job.description || '—'}</p>
            </section>

            <section className="rounded-xl border border-white/10 bg-slate-800/40 p-5">
              <h2 className="text-sm font-bold text-white mb-3">Consultant submissions ({data.submissions.length})</h2>
              {data.submissions.length === 0 ? (
                <p className="text-sm text-white/50">No candidates shared yet.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {data.submissions.map(s => (
                    <li key={s.id} className="py-3 text-sm">
                      <div className="text-white">{s.candidateName} <span className="text-white/50">· {s.status}</span></div>
                      <div className="text-xs text-white/50">Shared by {s.consultantName ?? '—'} ({s.consultantEmail ?? '—'}) · {fmtDate(s.createdAt)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-white/10 bg-slate-800/40 p-5">
              <h2 className="text-sm font-bold text-white mb-3">Direct applications ({data.applications.length})</h2>
              {data.applications.length === 0 ? (
                <p className="text-sm text-white/50">No direct applications yet.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {data.applications.map(a => (
                    <li key={a.id} className="py-3 text-sm">
                      <div className="text-white">{a.candidateName ?? '—'} <span className="text-white/50">· {a.status}</span></div>
                      <div className="text-xs text-white/50">{a.candidateEmail ?? '—'} · {fmtDate(a.createdAt)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
