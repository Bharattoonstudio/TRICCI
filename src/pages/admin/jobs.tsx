import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Loader2, ChevronLeft } from 'lucide-react';

interface AdminJobRow {
  id: string;
  title: string;
  company: string;
  location: string;
  status: string;
  visibility: string;
  ctcLabel: string;
  createdAt: string | null;
  posterName: string | null;
  applications: number;
  submissions: number;
  consultantsAccepted: number;
}

const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function AdminJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<AdminJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/jobs', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then(d => setJobs(d.jobs ?? []))
      .catch(() => setError('Could not load jobs.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Helmet>
        <title>Jobs — Admin — TRICCI</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft size={15} /> Back to Admin Dashboard
        </button>

        <h1 className="text-2xl font-black text-white flex items-center gap-2 mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
          <Briefcase size={22} className="text-primary" /> All Jobs
        </h1>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-white/30" /></div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-white/50 py-8">No jobs posted yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-white/50">
                <tr>
                  <th className="p-3">Job</th><th className="p-3">Company</th><th className="p-3">Posted by</th>
                  <th className="p-3">Status</th><th className="p-3">Applied / Shared / Accepted</th><th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} onClick={() => navigate(`/admin/jobs/${encodeURIComponent(j.id)}`)}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 text-white">{j.title}<div className="text-xs text-white/50">{j.location} · {j.ctcLabel}</div></td>
                    <td className="p-3 text-white/70">{j.company || <span className="text-amber-400">(not set)</span>}</td>
                    <td className="p-3 text-white/70">{j.posterName ?? '—'}</td>
                    <td className="p-3 text-white/80">{j.status}</td>
                    <td className="p-3 text-white/70">{j.applications} / {j.submissions} / {j.consultantsAccepted}</td>
                    <td className="p-3 text-white/50">{fmtDate(j.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8">
          <Link to="/admin" className="text-sm text-white/60 hover:text-white">Admin Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
