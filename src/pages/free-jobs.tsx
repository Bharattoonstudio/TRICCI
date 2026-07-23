import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, MapPin, Briefcase, ExternalLink, Loader2, RefreshCw,
  Globe, Filter, X, ChevronLeft, ChevronRight, Zap, Building2,
  Clock, ArrowUpRight, AlertCircle, Sparkles,
} from 'lucide-react';
import type { AggregatedJob } from '@/server/api/jobs/aggregate/GET';

// ─── Source config ────────────────────────────────────────────────────────────

const SOURCES = [
  { id: 'all', label: 'All Sources', color: '#E8470A' },
  { id: 'remotive', label: 'Remotive', color: '#00d4aa', url: 'remotive.com' },
  { id: 'remoteok', label: 'RemoteOK', color: '#ff4742', url: 'remoteok.com' },
  { id: 'arbeitnow', label: 'Arbeitnow', color: '#6B4FBB', url: 'arbeitnow.com' },
  { id: 'themuse', label: 'The Muse', color: '#f5a623', url: 'themuse.com' },
];

const JOB_TYPES = [
  { id: '', label: 'All Types' },
  { id: 'full_time', label: 'Full Time' },
  { id: 'part_time', label: 'Part Time' },
  { id: 'contract', label: 'Contract' },
  { id: 'internship', label: 'Internship' },
];

const POPULAR_SEARCHES = [
  'Software Engineer', 'Product Manager', 'Data Scientist', 'Marketing',
  'Designer', 'DevOps', 'React', 'Python', 'Sales', 'Finance',
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function sourceColor(source: string): string {
  return SOURCES.find(s => s.label === source)?.color ?? '#888';
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, index }: { job: AggregatedJob; index: number }) {
  const color = sourceColor(job.source);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group relative rounded-2xl border overflow-hidden transition-all duration-200 hover:scale-[1.015] hover:shadow-xl"
      style={{ background: `linear-gradient(135deg, ${color}06 0%, #0d0d0d 100%)`, borderColor: `${color}18` }}
    >
      {/* Top accent line */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-white text-base leading-tight truncate group-hover:text-primary transition-colors"
              style={{ fontFamily: 'var(--font-heading)' }}>
              {job.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <Building2 size={12} className="text-white/30 shrink-0" />
              <span className="text-sm text-white/60 font-semibold truncate">{job.company}</span>
            </div>
          </div>
          {/* Source badge */}
          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{ color, borderColor: `${color}30`, background: `${color}12` }}>
            {job.source}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3">
          <div className="flex items-center gap-1 text-xs text-white/40">
            <MapPin size={11} />
            <span>{job.location}</span>
          </div>
          {job.type && (
            <div className="flex items-center gap-1 text-xs text-white/40">
              <Briefcase size={11} />
              <span className="capitalize">{job.type.replace('_', ' ')}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-white/30">
            <Clock size={11} />
            <span>{timeAgo(job.postedAt)}</span>
          </div>
          {job.salary && (
            <div className="flex items-center gap-1 text-xs font-bold" style={{ color }}>
              <Zap size={11} />
              <span>{job.salary}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-white/30 leading-relaxed line-clamp-2 mb-3">
          {job.description || 'Click to view full job description on the source website.'}
        </p>

        {/* Tags */}
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.tags.slice(0, 5).map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/8">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95"
          style={{ background: `linear-gradient(135deg, ${color}22, ${color}10)`, color, border: `1px solid ${color}25` }}
        >
          View Job <ArrowUpRight size={14} />
        </a>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FreeJobsPage() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [source, setSource] = useState('all');
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<AggregatedJob[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [_showFilters, _setShowFilters] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchJobs = useCallback(async (q: string, loc: string, type: string, src: string, pg: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (loc) params.set('location', loc);
      if (type) params.set('type', type);
      if (src && src !== 'all') params.set('source', src);
      params.set('page', String(pg));
      params.set('limit', '20');

      const res = await fetch(`/api/jobs/aggregate?${params}`);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json() as { jobs: AggregatedJob[]; total: number; totalPages: number };
      setJobs(data.jobs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setSearched(true);
    } catch {
      setError('Could not load jobs right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on mount with empty query
  useEffect(() => {
    fetchJobs('', '', '', 'all', 1);
  }, [fetchJobs]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchJobs(query, location, jobType, source, 1);
  }

  function handlePopular(term: string) {
    setQuery(term);
    setPage(1);
    fetchJobs(term, location, jobType, source, 1);
    searchRef.current?.focus();
  }

  function handlePageChange(p: number) {
    setPage(p);
    fetchJobs(query, location, jobType, source, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSourceChange(s: string) {
    setSource(s);
    setPage(1);
    fetchJobs(query, location, jobType, s, 1);
  }

  return (
    <>
      <Helmet>
        <title>Free Jobs — TRICCI | World Job Aggregator</title>
        <meta name="description" content="Search millions of jobs from Remotive, RemoteOK, Arbeitnow, The Muse and more — all in one place. Free for candidates on TRICCI." />
        <link rel="canonical" href="https://tricci.in/free-jobs" />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen" style={{ background: '#080808' }}>

        {/* ── HERO / SEARCH HEADER ── */}
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0d0520 0%, #080808 100%)' }}>
          {/* Grid bg */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(#6B4FBB 1px, transparent 1px), linear-gradient(90deg, #6B4FBB 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, #E8470A 0%, transparent 70%)' }} />

          <div className="relative z-10 max-w-5xl mx-auto px-4 pt-12 pb-10">
            {/* Badge */}
            <div className="flex items-center justify-center mb-5">
              <span className="flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded-full border"
                style={{ color: '#E8470A', borderColor: '#E8470A30', background: '#E8470A10' }}>
                <Sparkles size={12} /> Free for all verified candidates
              </span>
            </div>

            <h1 className="text-center text-4xl md:text-5xl font-black text-white mb-3 leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}>
              World&apos;s Jobs.{' '}
              <span style={{ background: 'linear-gradient(135deg, #E8470A, #6B4FBB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                One Search.
              </span>
            </h1>
            <p className="text-center text-white/40 text-base mb-8 max-w-xl mx-auto">
              Aggregating live jobs from Remotive, RemoteOK, Arbeitnow, The Muse and more.
              Click any job to apply directly on the source site — zero middlemen.
            </p>

            {/* Search form */}
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3 mb-3">
                {/* Keyword */}
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Job title, skill, company…"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                {/* Location */}
                <div className="relative sm:w-52">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Location / Remote"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                {/* Search button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-black text-sm text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #E8470A, #6B4FBB)', boxShadow: '0 0 24px rgba(232,71,10,0.35)' }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  Search
                </button>
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Job type */}
                <div className="relative">
                  <select
                    value={jobType}
                    onChange={e => { setJobType(e.target.value); setPage(1); fetchJobs(query, location, e.target.value, source, 1); }}
                    className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-8 text-xs text-white/70 focus:outline-none focus:border-primary cursor-pointer"
                  >
                    {JOB_TYPES.map(t => <option key={t.id} value={t.id} className="bg-gray-900">{t.label}</option>)}
                  </select>
                  <Filter size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>

                {/* Clear filters */}
                {(query || location || jobType || source !== 'all') && (
                  <button type="button"
                    onClick={() => { setQuery(''); setLocation(''); setJobType(''); setSource('all'); setPage(1); fetchJobs('', '', '', 'all', 1); }}
                    className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-2 rounded-xl border border-white/8 hover:border-white/20">
                    <X size={11} /> Clear
                  </button>
                )}

                <span className="ml-auto text-xs text-white/25">
                  {searched && !loading && `${total.toLocaleString()} jobs found`}
                </span>
              </div>
            </form>

            {/* Popular searches */}
            <div className="max-w-3xl mx-auto mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-white/25 shrink-0">Popular:</span>
              {POPULAR_SEARCHES.map(term => (
                <button key={term} type="button" onClick={() => handlePopular(term)}
                  className="text-xs px-3 py-1 rounded-full border border-white/8 text-white/40 hover:border-primary/40 hover:text-primary transition-all">
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── SOURCE TABS ── */}
        <div className="sticky top-0 z-20 border-b border-white/5" style={{ background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(12px)' }}>
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
              {SOURCES.map(s => (
                <button key={s.id} onClick={() => handleSourceChange(s.id)}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={source === s.id
                    ? { background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40` }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }
                  }>
                  <Globe size={11} />
                  {s.label}
                </button>
              ))}
              <div className="ml-auto shrink-0 flex items-center gap-1.5 text-xs text-white/25">
                <span>Sources: Remotive · RemoteOK · Arbeitnow · The Muse</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RESULTS ── */}
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/5 p-5 animate-pulse" style={{ background: '#111' }}>
                  <div className="h-4 bg-white/5 rounded-lg mb-2 w-3/4" />
                  <div className="h-3 bg-white/5 rounded-lg mb-4 w-1/2" />
                  <div className="h-3 bg-white/5 rounded-lg mb-1 w-full" />
                  <div className="h-3 bg-white/5 rounded-lg w-2/3" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle size={40} className="text-red-500/50 mb-4" />
              <p className="text-white/50 mb-4">{error}</p>
              <button onClick={() => fetchJobs(query, location, jobType, source, page)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90">
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && searched && jobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search size={40} className="text-white/10 mb-4" />
              <p className="text-white/50 text-lg font-bold mb-2">No jobs found</p>
              <p className="text-white/25 text-sm mb-6">Try different keywords or remove filters</p>
              <button onClick={() => { setQuery(''); setLocation(''); setJobType(''); setSource('all'); fetchJobs('', '', '', 'all', 1); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90">
                <X size={14} /> Clear Filters
              </button>
            </div>
          )}

          {/* Job grid */}
          {!loading && !error && jobs.length > 0 && (
            <>
              {/* Results header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-white font-black text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                    {total.toLocaleString()} Jobs Found
                  </p>
                  <p className="text-white/30 text-xs mt-0.5">
                    Aggregated from {SOURCES.filter(s => s.id !== 'all').length} free sources · Click any job to apply on the source site
                  </p>
                </div>
                <button onClick={() => fetchJobs(query, location, jobType, source, page)}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-2 rounded-xl border border-white/8 hover:border-white/20">
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={`${query}-${source}-${page}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jobs.map((job, i) => (
                    <JobCard key={job.id} job={job} index={i} />
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl border border-white/10 text-white/50 text-sm font-bold hover:border-white/20 hover:text-white/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft size={15} /> Prev
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      let p: number;
                      if (totalPages <= 7) p = i + 1;
                      else if (page <= 4) p = i + 1;
                      else if (page >= totalPages - 3) p = totalPages - 6 + i;
                      else p = page - 3 + i;
                      return (
                        <button key={p} onClick={() => handlePageChange(p)}
                          className="w-9 h-9 rounded-xl text-sm font-bold transition-all"
                          style={p === page
                            ? { background: 'linear-gradient(135deg, #E8470A, #6B4FBB)', color: '#fff' }
                            : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
                          }>
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl border border-white/10 text-white/50 text-sm font-bold hover:border-white/20 hover:text-white/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}

              {/* Source attribution */}
              <div className="mt-10 pt-6 border-t border-white/5">
                <p className="text-center text-xs text-white/20 mb-3">Jobs sourced from</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {[
                    { name: 'Remotive', url: 'https://remotive.com', color: '#00d4aa' },
                    { name: 'RemoteOK', url: 'https://remoteok.com', color: '#ff4742' },
                    { name: 'Arbeitnow', url: 'https://www.arbeitnow.com', color: '#6B4FBB' },
                    { name: 'The Muse', url: 'https://www.themuse.com', color: '#f5a623' },
                  ].map(s => (
                    <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold hover:opacity-80 transition-opacity"
                      style={{ color: s.color }}>
                      <ExternalLink size={10} /> {s.name}
                    </a>
                  ))}
                </div>
                <p className="text-center text-xs text-white/15 mt-3">
                  TRICCI aggregates publicly available job listings. Clicking &quot;View Job&quot; takes you directly to the source website.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── UPGRADE NUDGE ── */}
        <div className="max-w-5xl mx-auto px-4 pb-16">
          <div className="rounded-2xl border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0d0520, #0a0a0a)', borderColor: '#E8470A20' }}>
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-10"
              style={{ background: 'radial-gradient(circle, #E8470A 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="relative z-10 text-center sm:text-left">
              <p className="font-black text-white text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                Want recruiters to find <em>you</em>?
              </p>
              <p className="text-sm text-white/40 mt-1">
                Complete your TRICCI profile and get discovered by 500+ verified consultants with live mandates.
              </p>
            </div>
            <Link to="/candidate/profile"
              className="relative z-10 shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #E8470A, #6B4FBB)', boxShadow: '0 0 24px rgba(232,71,10,0.3)' }}>
              <Sparkles size={15} /> Complete My Profile
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}
