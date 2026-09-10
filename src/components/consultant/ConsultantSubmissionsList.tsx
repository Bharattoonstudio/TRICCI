/**
 * ConsultantSubmissionsList — displays all CV submissions with duplicate/winner status
 * Shows which submissions are primary (you won) vs duplicate (another consultant submitted first)
 * P0 #1 Fix: Displays duplicate flag & winning consultant status
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2, CheckCircle, AlertCircle, Eye, Trash2, Clock,
  TrendingUp, Trophy, Filter, Search, FileText
} from 'lucide-react';
import ConsultantDocumentsModal from './ConsultantDocumentsModal';

interface Submission {
  id: number;
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateLocation?: string;
  experience?: number; // candidateExperienceYears
  ctcExpected?: number; // candidateExpectedCtcLpa
  ctcCurrent?: number; // candidateCurrentCtcLpa
  cvUrl?: string;
  coverNote?: string;
  status: 'pending' | 'shortlisted' | 'rejected' | 'placed';
  isDuplicate: boolean;
  isWinner: boolean;
  message: string;
  createdAt: string;
  updatedAt: string;
  jobTitle?: string;
  jobCompany?: string;
}

interface ConsultantSubmissionsListProps {
  refresh?: number;
}

export default function ConsultantSubmissionsList({ refresh }: ConsultantSubmissionsListProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'primary' | 'duplicate' | 'pending' | 'shortlisted'>('all');
  const [search, setSearch] = useState('');
  const [docsTarget, setDocsTarget] = useState<Submission | null>(null);

  // Load on mount and when refresh changes
  useEffect(() => {
    loadSubmissions();
  }, [refresh]);

  async function loadSubmissions() {
    setLoading(true);
    setError('');
    try {
      console.log('[ConsultantSubmissionsList] Fetching submissions...');
      const res = await fetch('/api/consultant/submissions');
      const data = await res.json();
      
      console.log('[ConsultantSubmissionsList] Response status:', res.status, 'Data:', data);
      
      if (!res.ok) {
        console.error('[ConsultantSubmissionsList] API error:', data);
        setError(data.error || data.message || 'Failed to load submissions.');
        return;
      }
      
      const submissionsData = data.submissions || [];
      console.log('[ConsultantSubmissionsList] Loaded', submissionsData.length, 'submissions');
      setSubmissions(submissionsData);
    } catch (err) {
      console.error('[ConsultantSubmissionsList] Fetch error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = submissions.filter(sub => {
    if (filter === 'primary' && sub.isDuplicate) return false;
    if (filter === 'duplicate' && !sub.isDuplicate) return false;
    if (filter === 'pending' && sub.status !== 'pending') return false;
    if (filter === 'shortlisted' && sub.status !== 'shortlisted') return false;
    
    const searchLower = search.toLowerCase();
    return (
      sub.candidateName.toLowerCase().includes(searchLower) ||
      sub.candidateEmail.toLowerCase().includes(searchLower) ||
      sub.jobTitle?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: submissions.length,
    primary: submissions.filter(s => !s.isDuplicate).length,
    duplicate: submissions.filter(s => s.isDuplicate).length,
    pending: submissions.filter(s => s.status === 'pending').length,
    shortlisted: submissions.filter(s => s.status === 'shortlisted').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg">
        <Eye size={32} className="mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Select candidates from CV Bank and submit them to job postings.</p>
        <button
          onClick={loadSubmissions}
          className="mt-4 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Total"
          value={stats.total}
          icon={<Eye size={16} className="text-primary" />}
          color="bg-primary/10 border-primary/20"
        />
        <StatCard
          label="Primary"
          value={stats.primary}
          icon={<Trophy size={16} className="text-green-600" />}
          color="bg-green-500/10 border-green-500/20"
        />
        <StatCard
          label="Duplicate"
          value={stats.duplicate}
          icon={<AlertCircle size={16} className="text-amber-600" />}
          color="bg-amber-500/10 border-amber-500/20"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={<Clock size={16} className="text-blue-600" />}
          color="bg-blue-500/10 border-blue-500/20"
        />
        <StatCard
          label="Shortlisted"
          value={stats.shortlisted}
          icon={<TrendingUp size={16} className="text-purple-600" />}
          color="bg-purple-500/10 border-purple-500/20"
        />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search candidate name, email, or job…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 flex-wrap">
          {(['all', 'primary', 'duplicate', 'pending', 'shortlisted'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted border border-border text-foreground hover:bg-muted/80'
              }`}
            >
              <Filter size={12} className="inline mr-1.5" />
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button
            onClick={loadSubmissions}
            disabled={loading}
            className="px-3 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all bg-muted border border-border text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh submissions list"
          >
            {loading ? (
              <>
                <Loader2 size={12} className="inline mr-1.5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                🔄 Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submissions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs">Candidate</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs">Job</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-xs">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs">Submitted</th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-xs">Documents</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No submissions match your filter
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <motion.tr
                    key={sub.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="border-b border-border hover:bg-muted/50 transition-colors group"
                  >
                    {/* Candidate */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground">{sub.candidateName}</p>
                        <p className="text-xs text-muted-foreground">{sub.candidateEmail}</p>
                        {sub.candidateLocation && (
                          <p className="text-xs text-muted-foreground mt-1">📍 {sub.candidateLocation}</p>
                        )}
                      </div>
                    </td>

                    {/* Job */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground">{sub.jobTitle || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{sub.jobCompany || 'N/A'}</p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        sub.status === 'pending' ? 'bg-blue-500/20 text-blue-600' :
                        sub.status === 'shortlisted' ? 'bg-purple-500/20 text-purple-600' :
                        sub.status === 'placed' ? 'bg-green-500/20 text-green-600' :
                        'bg-gray-500/20 text-gray-600'
                      }`}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                    </td>

                    {/* Type (Primary/Duplicate) */}
                    <td className="px-4 py-3 text-center">
                      {sub.isDuplicate ? (
                        <div className="flex items-center justify-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-600 rounded-full w-fit mx-auto">
                          <AlertCircle size={12} />
                          <span className="text-xs font-semibold">Duplicate</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-600 rounded-full w-fit mx-auto">
                          <Trophy size={12} />
                          <span className="text-xs font-semibold">Primary</span>
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        {new Date(sub.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: new Date(sub.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })}
                      </p>
                    </td>

                    {/* Documents */}
                    <td className="px-4 py-3 text-center">
                      {(sub.status === 'shortlisted' || sub.status === 'placed') ? (
                        <button onClick={() => setDocsTarget(sub)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-full border border-blue-500/30 text-blue-500 hover:bg-blue-500/10">
                          <FileText size={11} /> Documents
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <Trophy size={16} className="text-blue-600 mt-0.5" />
          </div>
          <div className="text-xs text-foreground space-y-1">
            <p className="font-semibold">📌 Primary vs Duplicate</p>
            <p>
              <strong>Primary (✅):</strong> You were the first consultant to submit this candidate. You'll be paid if they're placed.
            </p>
            <p>
              <strong>Duplicate (⚠️):</strong> Another consultant already submitted this candidate. You won't earn commission, but you can use this to track overlaps.
            </p>
          </div>
        </div>
      </div>

      {docsTarget && (
        <ConsultantDocumentsModal
          submissionId={docsTarget.id}
          candidateName={docsTarget.candidateName}
          onClose={() => setDocsTarget(null)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`border rounded-lg p-3 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
