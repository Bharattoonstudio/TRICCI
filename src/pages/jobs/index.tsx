import { Helmet } from '@dr.pogodin/react-helmet';
import { trackJobSearch } from '@/lib/analytics';
import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, MapPin, Briefcase, Clock, Users, ChevronRight,
  SlidersHorizontal, X, Building2, Home, Filter, BookOpen, Lock
} from 'lucide-react';
import type { Job } from '@/server/api/jobs/GET';
import ShareButtons from '@/components/ShareButtons';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'technology', label: 'Technology' },
  { id: 'product', label: 'Product' },
  { id: 'data', label: 'Data & AI' },
  { id: 'sales', label: 'Sales' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'finance', label: 'Finance' },
];

const LOCATIONS = [
  { id: 'all', label: 'All Locations' },
  { id: 'bengaluru', label: 'Bengaluru' },
  { id: 'mumbai', label: 'Mumbai' },
  { id: 'delhi', label: 'Delhi NCR' },
  { id: 'pune', label: 'Pune' },
  { id: 'hyderabad', label: 'Hyderabad' },
];

const LOCATION_TYPES = [
  { id: 'all', label: 'All Types' },
  { id: 'onsite', label: 'On-site' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'remote', label: 'Remote' },
];

const LOCATION_TYPE_ICONS: Record<string, React.ElementType> = {
  onsite: Building2,
  hybrid: Briefcase,
  remote: Home,
};

const CATEGORY_COLORS: Record<string, string> = {
  technology: '#35c9ff',
  product: '#FF6B35',
  data: '#a78bfa',
  sales: '#ffd035',
  marketing: '#34d399',
  finance: '#f87171',
};

function timeAgo(days: number) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const BLOG_TEASERS = [
  {
    slug: 'how-to-find-senior-jobs-india-without-applying-blindly',
    title: 'How Senior Professionals in India Find Their Next Role (Without Applying Blindly)',
    category: 'For Candidates',
  },
  {
    slug: 'independent-recruitment-consultant-guide-india',
    title: 'The Independent Recruitment Consultant\'s Guide to Earning More in India',
    category: 'For Consultants',
  },
  {
    slug: 'india-senior-hiring-trends-2026',
    title: 'Senior Hiring Trends in India: What Employers Need to Know in 2026',
    category: 'Industry Insights',
  },
  {
    slug: 'why-recruitment-fees-are-broken-in-india',
    title: 'Why Recruitment Fees Are Broken in India (And How to Fix Them)',
    category: 'Industry Insights',
  },
];

function JobCard({ job, index }: { job: Job; index: number }) {
  const LocationIcon = LOCATION_TYPE_ICONS[job.locationType] ?? Briefcase;
  const catColor = CATEGORY_COLORS[job.category] ?? '#FF6B35';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' as const }}
    >
      <Link to={`/jobs/${job.id}`} className="block group">
        <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: catColor + '18', color: catColor }}>
                  {CATEGORIES.find(c => c.id === job.category)?.label ?? job.category}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={10} />
                  {timeAgo(job.postedDays)}
                </span>
                {job.companyHidden && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 flex items-center gap-1">
                    <Lock size={9} /> Confidential
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-foreground group-hover:text-primary transition-colors leading-tight"
                style={{ fontFamily: 'var(--font-heading)' }}>
                {job.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-3 mb-4">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin size={12} className="text-primary/60" />
              {job.location}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LocationIcon size={12} className="text-primary/60" />
              <span className="capitalize">{job.locationType}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase size={12} className="text-primary/60" />
              {job.experience}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users size={12} className="text-primary/60" />
              {job.applicants} applicants
            </span>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.skills.slice(0, 4).map(skill => (
              <span key={skill} className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border">
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border">
                +{job.skills.length - 4}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-base font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              {job.ctcLabel}
            </span>
            <div className="flex items-center gap-3">
              {/* Share — stop propagation so the card link doesn't fire */}
              <div onClick={e => e.preventDefault()}>
                <ShareButtons
                  url={`https://tricci.in/jobs/${job.id}`}
                  title={`${job.title} at ${job.company}`}
                  description={`${job.location} · ${job.ctcLabel}`}
                  variant="inline"
                />
              </div>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
                View Role →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const location = searchParams.get('location') ?? 'all';
  const locationType = searchParams.get('locationType') ?? 'all';

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category !== 'all') params.set('category', category);
      if (location !== 'all') params.set('location', location);
      if (locationType !== 'all') params.set('locationType', locationType);
      const res = await fetch(`/api/jobs?${params}`);
      if (!res.ok) { setFetchError(true); setJobs([]); return; }
      const data = await res.json();
      setJobs(data.jobs ?? []);
      setTotal(data.total ?? 0);
      // Track search when a query term is active
      if (q) trackJobSearch(q, data.total ?? 0);
    } catch {
      setFetchError(true);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [q, category, location, locationType]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === 'all' || value === '') next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  const hasActiveFilters = category !== 'all' || location !== 'all' || locationType !== 'all';

  const canonicalUrl = 'https://tricci.in/jobs';
  const title = 'Job Openings in India — TRICCI Recruitment Marketplace';
  const description = `Browse ${total || 'top'} curated job openings across technology, product, sales, data, and more. Senior roles across Bengaluru, Mumbai, Delhi NCR and other major Indian cities.`;

  const jsonLdJobList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Open Job Positions — TRICCI',
    description: 'Curated senior job openings across India, sourced through TRICCI recruitment aggregator',
    url: canonicalUrl,
    numberOfItems: total,
    itemListElement: jobs.map((job, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://tricci.in/jobs/${job.id}`,
      item: {
        '@type': 'JobPosting',
        title: job.title,
        description: job.description,
        datePosted: new Date(Date.now() - job.postedDays * 86400000).toISOString().split('T')[0],
        validThrough: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        employmentType: 'FULL_TIME',
        hiringOrganization: {
          '@type': 'Organization',
          name: job.company,
          sameAs: 'https://tricci.in',
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: job.location,
            addressCountry: 'IN',
          },
        },
        ...(job.locationType === 'remote' && { jobLocationType: 'TELECOMMUTE' }),
        baseSalary: {
          '@type': 'MonetaryAmount',
          currency: 'INR',
          value: {
            '@type': 'QuantitativeValue',
            minValue: job.ctcMin * 100000,
            maxValue: job.ctcMax * 100000,
            unitText: 'YEAR',
          },
        },
        url: `https://tricci.in/jobs/${job.id}`,
      },
    })),
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content="https://tricci.in/og-image.svg" />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:site_name" content="TRICCI" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://tricci.in/og-image.svg" />
        <meta name="keywords" content="jobs in India, senior jobs Bengaluru, product manager jobs India, engineering manager jobs, data scientist jobs India, VP sales jobs India" />
        <script type="application/ld+json">{JSON.stringify(jsonLdJobList)}</script>
      </Helmet>

      <main>
        {/* ── Hero ── */}
        <section className="border-b border-border bg-card/30">
          <div className="container mx-auto px-4 py-14">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' as const }} className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Live Openings
                </span>
                <span className="text-xs text-muted-foreground">{total} roles available</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4 leading-tight"
                style={{ fontFamily: 'var(--font-heading)' }}>
                Find Your Next<br />
                <span style={{ color: '#FF6B35' }}>Senior Role</span> in India
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Curated opportunities sourced by India's top independent recruitment consultants. Every role is pre-vetted and actively hiring.
              </p>

              {/* Search bar */}
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by title, skill, or company…"
                  value={q}
                  onChange={e => setParam('q', e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all text-sm"
                />
                {q && (
                  <button onClick={() => setParam('q', '')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Body ── */}
        <section className="container mx-auto px-4 py-10">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* ── Sidebar Filters (desktop) ── */}
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-28 space-y-6">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Category</p>
                  <div className="space-y-1">
                    {CATEGORIES.map(cat => (
                      <button key={cat.id} onClick={() => setParam('category', cat.id)}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                          category === cat.id
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Location</p>
                  <div className="space-y-1">
                    {LOCATIONS.map(loc => (
                      <button key={loc.id} onClick={() => setParam('location', loc.id)}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                          location === loc.id
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}>
                        {loc.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Work Type</p>
                  <div className="space-y-1">
                    {LOCATION_TYPES.map(lt => (
                      <button key={lt.id} onClick={() => setParam('locationType', lt.id)}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                          locationType === lt.id
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}>
                        {lt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <button onClick={clearFilters}
                    className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors">
                    <X size={13} /> Clear filters
                  </button>
                )}
              </div>
            </aside>

            {/* ── Main content ── */}
            <div className="flex-1 min-w-0">
              {/* Mobile filter bar */}
              <div className="lg:hidden flex items-center gap-2 mb-5 flex-wrap">
                <button onClick={() => setShowFilters(v => !v)}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
                  <SlidersHorizontal size={14} />
                  Filters
                  {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
                </button>
                {hasActiveFilters && (
                  <button onClick={clearFilters}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl border border-border bg-card transition-colors">
                    <X size={12} /> Clear
                  </button>
                )}
              </div>

              {/* Mobile filter panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="lg:hidden overflow-hidden mb-5">
                    <div className="bg-card border border-border rounded-2xl p-5 grid grid-cols-3 gap-4">
                      {[
                        { label: 'Category', key: 'category', options: CATEGORIES, value: category },
                        { label: 'Location', key: 'location', options: LOCATIONS, value: location },
                        { label: 'Work Type', key: 'locationType', options: LOCATION_TYPES, value: locationType },
                      ].map(({ label, key, options, value: val }) => (
                        <div key={key}>
                          <p className="text-xs font-bold text-muted-foreground mb-2">{label}</p>
                          <div className="space-y-1">
                            {options.map(opt => (
                              <button key={opt.id} onClick={() => setParam(key, opt.id)}
                                className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                                  val === opt.id ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted'
                                }`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results header */}
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-muted-foreground">
                  {loading ? 'Loading…' : `${total} role${total !== 1 ? 's' : ''} found`}
                </p>
                {hasActiveFilters && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {category !== 'all' && (
                      <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                        {CATEGORIES.find(c => c.id === category)?.label}
                        <button onClick={() => setParam('category', 'all')}><X size={10} /></button>
                      </span>
                    )}
                    {location !== 'all' && (
                      <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                        {LOCATIONS.find(l => l.id === location)?.label}
                        <button onClick={() => setParam('location', 'all')}><X size={10} /></button>
                      </span>
                    )}
                    {locationType !== 'all' && (
                      <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full capitalize">
                        {locationType}
                        <button onClick={() => setParam('locationType', 'all')}><X size={10} /></button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Job cards */}
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/4 mb-3" />
                      <div className="h-6 bg-muted rounded w-2/3 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/3 mb-4" />
                      <div className="flex gap-2">
                        {[1, 2, 3].map(j => <div key={j} className="h-7 bg-muted rounded-lg w-20" />)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : fetchError ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Filter size={24} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Unable to load jobs</h3>
                  <p className="text-sm text-muted-foreground mb-4">Something went wrong. Please try again in a moment.</p>
                  <button onClick={fetchJobs} className="text-sm text-primary hover:underline">Retry</button>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Filter size={24} className="text-muted-foreground" />
                  </div>
                  {hasActiveFilters || q ? (
                    <>
                      <h3 className="text-lg font-bold text-foreground mb-2">No roles match your filters</h3>
                      <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or search term.</p>
                      <button onClick={clearFilters} className="text-sm text-primary hover:underline">Clear all filters</button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-foreground mb-2">No open roles right now</h3>
                      <p className="text-sm text-muted-foreground">New positions are added regularly — check back soon or set up a job alert.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job, i) => <JobCard key={job.id} job={job} index={i} />)}
                </div>
              )}

              {/* CTA for consultants */}
              {!loading && jobs.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="mt-10 p-6 rounded-2xl border border-secondary/30 bg-secondary/5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                        Are you a recruitment consultant?
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submit candidates for these roles and earn 68.75% of the placement fee.
                      </p>
                    </div>
                    <Link to="/signup?role=consultant"
                      className="shrink-0 text-sm font-bold px-5 py-2.5 rounded-xl bg-secondary text-background hover:opacity-90 transition-opacity">
                      Join as Consultant
                    </Link>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* ── Recruitment Insights strip ── */}
        <section className="border-t border-border bg-card/30 py-14">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <BookOpen size={18} className="text-primary" />
                <h2 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  Recruitment Insights
                </h2>
              </div>
              <Link to="/blog" className="text-sm font-semibold text-primary hover:underline">
                All articles →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {BLOG_TEASERS.map(post => (
                <Link key={post.slug} to={`/blog/${post.slug}`}
                  className="group block bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-2 block">
                    {post.category}
                  </span>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-3">
                    {post.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
