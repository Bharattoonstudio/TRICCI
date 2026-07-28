import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  MapPin, Briefcase, Clock, Users, ChevronLeft, CheckCircle2,
  Building2, Home, ArrowRight, Bookmark, BookOpen, ListChecks
} from 'lucide-react';
import type { Job } from '@/server/api/jobs/GET';
import { trackJobView, trackJobApply } from '@/lib/analytics';
import ShareButtons from '@/components/ShareButtons';
import { useSession } from '@/lib/auth/auth-client';

const BLOG_SIDEBAR = [
  {
    slug: 'how-to-find-senior-jobs-india-without-applying-blindly',
    title: 'How Senior Professionals Find Their Next Role Without Applying Blindly',
    category: 'For Candidates',
  },
  {
    slug: 'why-recruitment-fees-are-broken-in-india',
    title: 'Why Recruitment Fees Are Broken in India',
    category: 'Industry Insights',
  },
  {
    slug: 'independent-recruitment-consultant-guide-india',
    title: 'The Independent Consultant\'s Guide to Earning More',
    category: 'For Consultants',
  },
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

const CATEGORY_LABELS: Record<string, string> = {
  technology: 'Technology',
  product: 'Product',
  data: 'Data & AI',
  sales: 'Sales',
  marketing: 'Marketing',
  finance: 'Finance',
};

function timeAgo(days: number) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const { user, isAuthenticated } = useSession();
  const userRole = (user as { role?: string } | null)?.role ?? '';
  const isCandidate = isAuthenticated && userRole === 'candidate';
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [consultantFee, setConsultantFee] = useState(6);
  // Apply state
  const [applyState, setApplyState] = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/jobs/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => {
        if (data) {
          setJob(data.job);
          trackJobView(data.job.id, data.job.title, data.job.company);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    // Fetch live consultant fee from commission config
    fetch('/api/commission/config')
      .then(r => r.json())
      .then(data => { if (typeof data.consultantFeePct === 'number') setConsultantFee(data.consultantFeePct); })
      .catch(() => { /* keep default 6% */ });
  }, [id]);

  // SOP: Pre-check already-applied status on page load for candidates
  useEffect(() => {
    if (!isCandidate || !id) return;
    fetch('/api/candidate/applications')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const apps = (data.applications ?? []) as Array<{ jobId: string }>;
        const alreadyApplied = apps.some(a => String(a.jobId) === String(id));
        if (alreadyApplied) setApplyState('already');
      })
      .catch(() => { /* non-fatal — button stays idle */ });
  }, [isCandidate, id]);

  async function handleApply() {
    if (!job || applyState === 'loading' || applyState === 'success' || applyState === 'already') return;
    setApplyState('loading');
    trackJobApply(job.id, job.title, job.company);
    try {
      const res = await fetch(`/api/jobs/${job.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.status === 409 || data.error === 'already_applied') {
        setApplyState('already');
      } else if (res.ok) {
        setApplyState('success');
      } else {
        setApplyState('error');
      }
    } catch {
      setApplyState('error');
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-10 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 gap-4 mt-8">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-md">
        <h1 className="text-2xl font-black text-foreground mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          Role not found
        </h1>
        <p className="text-muted-foreground mb-6">This job may have been filled or removed.</p>
        <Link to="/jobs" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
          <ChevronLeft size={14} /> Browse all roles
        </Link>
      </div>
    );
  }

  const canonicalUrl = `https://tricci.in/jobs/${job.id}`;
  const title = `${job.title} at ${job.company} — TRICCI`;
  const description = `${job.title} role in ${job.location} (${job.locationType}). ${job.ctcLabel}. ${job.experience} experience. Apply via TRICCI — India's recruitment aggregator.`;
  const LocationIcon = LOCATION_TYPE_ICONS[job.locationType] ?? Briefcase;
  const catColor = CATEGORY_COLORS[job.category] ?? '#FF6B35';
  const datePosted = new Date(Date.now() - job.postedDays * 86400000).toISOString().split('T')[0];
  const validThrough = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  // Dynamic OG image — encodes job details into the social card
  const ogImageUrl = `https://tricci.in/api/og?${new URLSearchParams({
    title: `${job.title} at ${job.company}`,
    subtitle: `${job.location} · ${job.ctcLabel} · ${job.experience}`,
    tag: job.category,
    type: job.category,
  }).toString()}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: [job.description, ...job.responsibilities, ...job.requirements].join(' '),
    datePosted,
    validThrough,
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
    skills: job.skills.join(', '),
    experienceRequirements: job.experience,
    url: canonicalUrl,
    identifier: {
      '@type': 'PropertyValue',
      name: 'TRICCI',
      value: job.id,
    },
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
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:site_name" content="TRICCI" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImageUrl} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Back */}
        <Link to="/jobs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ChevronLeft size={15} /> All Roles
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main ── */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' as const }}>

              {/* Title block */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: catColor + '18', color: catColor }}>
                    {CATEGORY_LABELS[job.category] ?? job.category}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} /> Posted {timeAgo(job.postedDays)}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight mb-2"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                  {job.title}
                </h1>
                <p className="text-lg text-muted-foreground">{job.company}</p>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {[
                  { icon: MapPin, label: 'Location', value: job.location },
                  { icon: LocationIcon, label: 'Work Type', value: job.locationType.charAt(0).toUpperCase() + job.locationType.slice(1) },
                  { icon: Briefcase, label: 'Experience', value: job.experience },
                  { icon: Users, label: 'Applicants', value: `${job.applicants} so far` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-card border border-border rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={12} className="text-primary/60" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div className="mb-8">
                <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map(skill => (
                    <span key={skill} className="text-sm px-3 py-1.5 rounded-xl bg-muted border border-border text-foreground">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h2 className="text-xl font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                  About the Role
                </h2>
                <p className="text-muted-foreground leading-relaxed">{job.description}</p>
              </div>

              {/* Responsibilities */}
              <div className="mb-8">
                <h2 className="text-xl font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                  Key Responsibilities
                </h2>
                <ul className="space-y-3">
                  {job.responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              <div>
                <h2 className="text-xl font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                  Requirements
                </h2>
                <ul className="space-y-3">
                  {job.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                      <span className="text-muted-foreground text-sm leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interview Rounds */}
              {job.interviewRounds && job.interviewRounds.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-5">
                    <ListChecks size={18} className="text-primary" />
                    <h2 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                      Interview Process
                    </h2>
                    <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                      {job.interviewRounds.length} Round{job.interviewRounds.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />
                    <div className="space-y-4">
                      {job.interviewRounds.map((round, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.07, ease: 'easeOut' as const }}
                          className="flex items-start gap-4 pl-0"
                        >
                          {/* Step circle */}
                          <div className="relative z-10 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center shrink-0">
                            <span className="text-xs font-black text-primary">{i + 1}</span>
                          </div>
                          <div className="flex-1 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                            <p className="text-sm font-bold text-foreground">{round.label}</p>
                            {round.description && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{round.description}</p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' as const }}
              className="sticky top-28 space-y-4">

              {/* CTC card */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Compensation</p>
                <p className="text-2xl font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                  {job.ctcLabel}
                </p>

                {/* Apply button — smart: logged-in candidate gets real apply, guest gets signup */}
                {isCandidate ? (
                  <>
                    {applyState === 'success' || applyState === 'already' ? (
                      <div className="w-full flex items-center justify-center gap-2 bg-green-600/10 text-green-600 border border-green-600/30 font-bold py-3 rounded-xl text-sm">
                        <CheckCircle2 size={15} />
                        {applyState === 'already' ? 'Already Applied' : 'Application Submitted!'}
                      </div>
                    ) : (
                      <button
                        onClick={handleApply}
                        disabled={applyState === 'loading'}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                        {applyState === 'loading' ? (
                          <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Submitting…</>
                        ) : (
                          <>Apply Now <ArrowRight size={15} /></>
                        )}
                      </button>
                    )}
                    {applyState === 'error' && (
                      <p className="text-xs text-red-500 text-center mt-2">Something went wrong. Please try again.</p>
                    )}
                  </>
                ) : (
                  <Link to="/signup"
                    onClick={() => trackJobApply(job.id, job.title, job.company)}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity text-sm">
                    Apply via TRICCI <ArrowRight size={15} />
                  </Link>
                )}
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Free for candidates · No registration fee
                </p>
              </div>

              {/* Share */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Share this role</p>
                <ShareButtons
                  url={canonicalUrl}
                  title={`${job.title} at ${job.company}`}
                  description={`${job.location} · ${job.ctcLabel}`}
                  variant="compact"
                />
              </div>

              {/* Save */}
              <button
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-foreground">
                <Bookmark size={14} />
                Save Role
              </button>

              {/* Consultant CTA — hidden for candidates */}
              {!isCandidate && (
              <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-5">
                <p className="text-sm font-black text-foreground mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
                  Recruitment consultant?
                </p>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Submit a candidate for this role and earn{' '}
                  <strong className="text-foreground">{consultantFee}% of CTC</strong> on successful placement — paid directly to you.
                </p>
                <Link to="/signup?role=consultant"
                  className="w-full flex items-center justify-center gap-2 bg-secondary text-background font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm">
                  Submit a Candidate
                </Link>
              </div>
              )}

              {/* Back to jobs */}
              <Link to="/jobs"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                <ChevronLeft size={14} /> Browse all roles
              </Link>

              {/* From the Blog */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen size={14} className="text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    From the Blog
                  </p>
                </div>
                <ul className="space-y-3">
                  {BLOG_SIDEBAR.map(post => (
                    <li key={post.slug}>
                      <Link to={`/blog/${post.slug}`}
                        className="group block">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 block mb-0.5">
                          {post.category}
                        </span>
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link to="/blog"
                  className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  All articles <ArrowRight size={11} />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
