import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { useRef, useState, useEffect } from 'react';
import LiveStatsCounters from '@/components/marketing/LiveStatsCounters';
import {
  Building2, Star, User, ArrowRight, CheckCircle,
  Briefcase, TrendingUp, Shield, IndianRupee, Zap,
  ChevronDown, Sparkles, Brain, BarChart3, FileText,
  Play, X } from
'lucide-react';

/* ─── brand tokens ──────────────────────────────────────────────────────── */
const ORANGE = '#E8470A';
const VIOLET = '#6B4FBB';
const GREEN = '#16a34a';

const BASE = 'https://tricci.in';
const OG_IMAGE = `${BASE}/api/og?title=TRICCI&subtitle=We+Make+It+Easy&type=platform`;

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${BASE}/#website`,
      name: 'TRICCI',
      url: `${BASE}/`,
      description: "India's first transparent, performance-driven recruitment aggregator.",
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/jobs?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${BASE}/#organization`,
      name: 'TRICCI',
      url: `${BASE}/`,
      description: "India's first transparent, performance-driven recruitment aggregator — We Make It Easy.",
      contactPoint: { '@type': 'ContactPoint', email: 'Connect@Tricci.in', contactType: 'customer support', areaServed: 'IN' },
    },
    {
      '@type': 'WebPage',
      '@id': `${BASE}/#webpage`,
      url: `${BASE}/`,
      name: 'TRICCI — Hire. Place. Get Hired.',
      isPartOf: { '@id': `${BASE}/#website` },
      about: { '@id': `${BASE}/#organization` },
      datePublished: '2025-01-01',
      dateModified: '2026-06-18',
    },
  ],
};

/* ─── hero audience data ─────────────────────────────────────────────────── */
const HERO_AUDIENCES = [
{
  id: 'company',
  tab: 'Companies',
  icon: Building2,
  color: ORANGE,
  eyebrow: 'Hiring Teams',
  headline: ['Start Getting', 'Right Talent.'],
  headlineColor: ORANGE,
  sub: 'The right candidate, at the right time — every time.',
  pills: ['Right talent, right time?', 'Roles open for months?', 'Losing top talent?'],
  pillColor: ORANGE,
  body: 'TRICCI connects you with verified consultants who deeply understand your role and send only qualified candidates. Spend time interviewing — not filtering.',
  cta: { label: 'Post a Role Free', href: '/signup' },
  ctaSecondary: { label: 'See how it works', href: '/company' }
},
{
  id: 'consultant',
  tab: 'Consultants',
  icon: Star,
  color: VIOLET,
  eyebrow: 'Recruitment Consultants',
  headline: ['Grow Your', 'Placement Business.'],
  headlineColor: '#a78bfa',
  sub: 'Access live mandates. Submit candidates. Earn transparently.',
  pills: ['Struggling to find live mandates?', 'Fee disputes slowing you down?', 'Want faster closures?'],
  pillColor: VIOLET,
  body: 'Access verified job mandates from companies across India, track every submission in real time, and earn with full fee transparency — no surprises, ever.',
  cta: { label: 'Start Placing Today', href: '/signup' },
  ctaSecondary: { label: 'Learn more', href: '/consultant' }
},
{
  id: 'candidate',
  tab: 'Candidates',
  icon: User,
  color: GREEN,
  eyebrow: 'Job Seekers',
  headline: ['Find the Right', 'Job, Faster.'],
  headlineColor: '#4ade80',
  sub: 'One profile. Multiple consultant pipelines working for you.',
  pills: ['Applied everywhere, heard nothing?', 'CV not getting shortlisted?', 'Missing the right opportunities?'],
  pillColor: GREEN,
  body: 'Upload your CV once and let our AI Copilot optimise it. Multiple consultants actively pitch you to the right companies — you get real interviews, not silence.',
  cta: { label: 'Find Jobs Now', href: '/jobs' },
  ctaSecondary: { label: 'How it works', href: '/candidate' }
}];


/* ─── other page data ───────────────────────────────────────────────────── */
const AUDIENCES = [
{
  id: 'company',
  label: 'Companies',
  icon: Building2,
  color: ORANGE,
  headline: 'Qualified Candidates.',
  sub: 'Not Just CVs.',
  body: 'Stop sifting through hundreds of irrelevant CVs. TRICCI\'s verified consultants understand your role deeply and send only pre-screened, qualified candidates — so you spend time interviewing, not filtering.',
  points: [
  'Pre-screened candidates matched to your exact role',
  'Multiple consultant pipelines working simultaneously',
  'Fill roles faster — cut time-to-hire dramatically',
  'Compete for top talent before they go elsewhere'],

  href: '/company',
  cta: 'See how it works',
  img: '/assets/hero-main.png'
},
{
  id: 'consultant',
  label: 'Consultants',
  icon: Star,
  color: VIOLET,
  headline: 'Grow Your',
  sub: 'Placement Business.',
  body: 'Access live mandates from verified companies across India. Submit candidates, track every deal in real time, and earn transparently with no surprises.',
  points: [
  'Access live mandates from verified companies',
  'Submit candidates and track every placement',
  'Transparent earnings — no surprises',
  'Fast turnaround, fair fee-share model'],

  href: '/consultant',
  cta: 'Start placing',
  img: '/airo-assets/images/pages/home/hero-consultant'
},
{
  id: 'candidate',
  label: 'Candidates',
  icon: User,
  color: GREEN,
  headline: 'Find the Right',
  sub: 'Job, Faster.',
  body: 'One profile, multiple consultant pipelines working for you. AI-powered CV optimisation, real-time job alerts matched to your skills, and one-click apply.',
  points: [
  'One profile, multiple consultant pipelines',
  'AI-powered CV optimisation with TIC Copilot',
  'Real-time job alerts matched to your skills',
  'One-click apply, full application tracking'],

  href: '/candidate',
  cta: 'Find jobs',
  img: '/airo-assets/images/pages/home/hero-candidates'
}];


const AI_TABS = [
{
  id: 'matching',
  icon: Brain,
  color: ORANGE,
  tag: 'AI Matching',
  title: 'Smart Candidate–Role Matching',
  desc: 'Our AI engine analyses job requirements and candidate profiles to surface the best-fit matches — cutting time-to-shortlist dramatically for every role.',
  img: '/airo-assets/images/pages/home/ai-feature-matching',
  imgAlt: 'AI matching technology for recruitment'
},
{
  id: 'dashboard',
  icon: BarChart3,
  color: VIOLET,
  tag: 'Live Dashboards',
  title: 'Real-Time Visibility for Every Side',
  desc: 'Companies, consultants and candidates each get a live dashboard — pipeline status, fee tracking, application progress, all in one transparent place.',
  img: '/airo-assets/images/pages/home/ai-feature-dashboard',
  imgAlt: 'Real-time recruitment analytics dashboard'
},
{
  id: 'cv',
  icon: FileText,
  color: GREEN,
  tag: 'TIC Copilot',
  title: 'AI-Powered CV Optimisation',
  desc: 'Candidates upload their CV and our AI Copilot rewrites, scores and tailors it for each role — giving them a real edge in every application they send.',
  img: '/airo-assets/images/pages/home/ai-feature-cv',
  imgAlt: 'AI CV optimisation technology'
}];


const WHY = [
{ icon: CheckCircle, color: ORANGE, title: 'Pre-Screened Candidates Only', desc: 'No more sifting through hundreds of irrelevant CVs. Every candidate is vetted by a specialist consultant before you see them.' },
{ icon: Zap, color: VIOLET, title: 'Fill Roles Faster', desc: 'Multiple consultants work your role simultaneously — more pipelines, faster shortlists, quicker closures.' },
{ icon: TrendingUp, color: ORANGE, title: 'Compete for Top Talent', desc: 'Top candidates get multiple offers fast. TRICCI\'s network moves quickly so you don\'t lose them to a competitor.' },
{ icon: Shield, color: VIOLET, title: 'Verified Consultant Network', desc: 'Every consultant is vetted and specialised. You get domain experts who understand your role, not generalists.' },
{ icon: Briefcase, color: GREEN, title: 'All Roles, All Industries', desc: 'From tech to manufacturing, junior to CXO — TRICCI covers every sector and every level across India.' },
{ icon: IndianRupee, color: GREEN, title: 'Pay Only on Success', desc: 'No retainers, no upfront fees. A clear percentage only after a successful hire — zero financial risk.' }];


const STEPS = [
{ n: '01', color: ORANGE, icon: Building2, title: 'Sign Up Free', desc: 'Create your account as a company, consultant or candidate in under 2 minutes.' },
{ n: '02', color: VIOLET, icon: Briefcase, title: 'Post or Browse', desc: 'Companies post roles. Consultants pick mandates. Candidates apply with one click.' },
{ n: '03', color: GREEN, icon: TrendingUp, title: 'Hire & Grow', desc: 'Close positions faster. Pay only on success. Track every placement in real time.' }];


const TRUST_ITEMS = [
'Verified Consultants', 'Zero Upfront Cost', 'Real-Time Dashboards',
'AI-Powered Matching', 'Transparent Fee Split', 'Pan-India Coverage',
'Compliance Built In', 'Fast Closures', 'Success-Fee Only'];


/* ─── HeroAudienceSwitcher ──────────────────────────────────────────────── */
function HeroAudienceSwitcher() {
  const [active, setActive] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % HERO_AUDIENCES.length), 10000);
    return () => clearInterval(t);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    if (!videoOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setVideoOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [videoOpen]);

  const aud = HERO_AUDIENCES[active];

  return (
    <>
    <motion.div
      className="relative z-20 text-center px-5 max-w-4xl mx-auto w-full"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15 }}>
      
      {/* ── universal eyebrow ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/8 backdrop-blur-md text-white/70 text-xs font-bold tracking-widest uppercase mb-5">
        
        <Sparkles size={10} className="text-orange-400" />
        India&rsquo;s Recruitment Marketplace
      </motion.div>

      {/* ── dynamic one-line headline ── */}
      <h1 className="sr-only">Hire. Place. Get Hired. — TRICCI India&apos;s Recruitment Marketplace</h1>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.28, ease: 'easeOut' as const }}
        className="flex items-baseline justify-center gap-3 md:gap-6 flex-wrap mb-3"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {[
          { word: 'Hire.', audienceIdx: 0, color: ORANGE },
          { word: 'Place.', audienceIdx: 1, color: '#a78bfa' },
          { word: 'Get Hired.', audienceIdx: 2, color: '#4ade80' },
        ].map(({ word, audienceIdx, color }) => {
          const isActive = active === audienceIdx;
          return (
            <motion.span
              key={word}
              animate={{
                scale: isActive ? 1.15 : 0.82,
                opacity: isActive ? 1 : 0.22,
                filter: isActive ? 'blur(0px)' : 'blur(2px)',
                color: isActive ? color : '#ffffff',
              }}
              transition={{ duration: 0.4, ease: 'easeOut' as const }}
              className="font-black tracking-tight leading-none cursor-pointer"
              style={{ fontSize: 'clamp(3.5rem, 10vw, 7.5rem)', display: 'inline-block' }}
              onClick={() => setActive(audienceIdx)}
            >
              {word}
            </motion.span>
          );
        })}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-base md:text-lg font-semibold text-white/60 mb-6 tracking-wide">
        
        One platform. Three sides. We Make It Easy.
      </motion.p>

      {/* ── audience tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="flex justify-center gap-2 mb-5">
        
        {HERO_AUDIENCES.map((a, i) =>
        <button
          key={a.id}
          onClick={() => setActive(i)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border"
          style={
          active === i ?
          { backgroundColor: a.color, color: '#fff', borderColor: a.color, boxShadow: `0 4px 16px -2px ${a.color}60` } :
          { backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.18)' }
          }>
            <a.icon size={13} />
            {a.tab}
          </button>
        )}
      </motion.div>

      {/* ── per-audience detail card ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={aud.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: 'easeOut' as const }}
          className="rounded-2xl border bg-white/6 backdrop-blur-md px-6 py-5 max-w-2xl mx-auto"
          style={{ borderColor: `${aud.color}45` }}>
          
          {/* audience sub-headline */}
          <p className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-3 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            {aud.headline[0]}{' '}
            <span style={{ color: aud.headlineColor }}>{aud.headline[1]}</span>
          </p>

          {/* pain pills */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-3">
            {aud.pills.map((pill) =>
            <span
              key={pill}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/70 border border-white/15 bg-white/6">
              
                <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: aud.color }} />
                {pill}
              </span>
            )}
          </div>

          <p className="text-sm md:text-base text-white/55 max-w-lg mx-auto leading-relaxed mb-4">
            {aud.body}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to={aud.cta.href}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white transition-all duration-300 hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${aud.color} 0%, ${aud.color}bb 100%)`, boxShadow: `0 6px 18px -4px ${aud.color}50` }}>
              
              {aud.cta.label} <ArrowRight size={13} />
            </Link>
            <Link
              to={aud.ctaSecondary.href}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white/65 border border-white/18 bg-white/5 hover:bg-white/12 transition-all duration-300">
              
              {aud.ctaSecondary.label}
            </Link>
          </div>

          {/* Watch video button */}
          <motion.button
            onClick={() => setVideoOpen(true)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-5 inline-flex items-center gap-2.5 text-white/60 hover:text-white text-xs font-semibold transition-all duration-300 group">
            <span className="flex items-center justify-center w-8 h-8 rounded-full border border-white/25 bg-white/8 group-hover:bg-white/18 group-hover:border-white/40 transition-all duration-300">
              <Play size={12} className="ml-0.5 fill-current" />
            </span>
            Watch how it works
          </motion.button>
        </motion.div>
      </AnimatePresence>

      {/* progress dots */}
      <div className="flex justify-center gap-2 mt-4">
        {HERO_AUDIENCES.map((a, i) =>
        <button
          key={a.id}
          onClick={() => setActive(i)}
          className="h-1 rounded-full transition-all duration-500"
          style={{
            width: active === i ? '24px' : '6px',
            backgroundColor: active === i ? a.color : 'rgba(255,255,255,0.2)'
          }} />

        )}
      </div>
    </motion.div>

    {/* ── Video Modal ── */}
    <AnimatePresence>
      {videoOpen && (
        <motion.div
          key="video-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={() => setVideoOpen(false)}>

          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

          {/* Modal box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' as const }}
            className="relative z-10 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={e => e.stopPropagation()}>

            {/* Close button */}
            <button
              onClick={() => setVideoOpen(false)}
              className="absolute top-3 right-3 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white/70 hover:text-white hover:bg-black/80 transition-all duration-200">
              <X size={14} />
            </button>

            {/* Header bar */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-[#0d0d0d] border-b border-white/8">
              <div className="w-1 h-5 rounded-full" style={{ background: `linear-gradient(180deg, ${ORANGE}, ${VIOLET})` }} />
              <p className="text-white/80 text-sm font-semibold">How TRICCI Works</p>
              <span className="ml-auto text-white/30 text-xs">Press Esc to close</span>
            </div>

            {/* Video */}
            <div className="relative bg-black" style={{ paddingBottom: '56.25%' }}>
              <video
                key={videoOpen ? 'open' : 'closed'}
                className="absolute inset-0 w-full h-full object-contain bg-black"
                controls
                autoPlay
                playsInline
                src="/assets/tricci-explainer.mp4">
                Your browser does not support the video tag.
              </video>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );

}

/* ─── AudienceCard ──────────────────────────────────────────────────────── */
function AudienceCard({ a, i }: {a: typeof AUDIENCES[0];i: number;}) {
  const [hovered, setHovered] = useState(false);
  const isEven = i % 2 === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: i * 0.1, ease: 'easeOut' as const }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group flex flex-col md:flex-row overflow-hidden rounded-3xl border border-border bg-card shadow-sm hover:shadow-2xl transition-all duration-500"
      style={{ boxShadow: hovered ? `0 24px 64px -12px ${a.color}20` : undefined }}>
      
      <div className={`relative w-full md:w-[42%] shrink-0 overflow-hidden ${isEven ? '' : 'md:order-2'}`}>
        <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{ backgroundColor: a.color }} />
        <img
          src={a.img}
          alt={a.label}
          className="w-full h-56 md:h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          width={480}
          height={360} />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white backdrop-blur-md"
          style={{ backgroundColor: `${a.color}cc` }}>
          
          <a.icon size={12} />
          {a.label}
        </div>
      </div>

      <div className={`flex flex-col flex-1 p-7 md:p-10 justify-center ${isEven ? '' : 'md:order-1'}`}>
        <h3 className="text-2xl md:text-3xl font-black text-foreground leading-tight mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
          {a.headline}
        </h3>
        <p className="text-2xl md:text-3xl font-black mb-4 leading-tight" style={{ color: a.color, fontFamily: 'var(--font-heading)' }}>
          {a.sub}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-sm">{a.body}</p>
        <ul className="flex flex-col gap-2 mb-8">
          {a.points.map((p) =>
          <li key={p} className="flex items-start gap-2 text-sm text-foreground/80">
              <CheckCircle size={14} className="shrink-0 mt-0.5" style={{ color: a.color }} />
              {p}
            </li>
          )}
        </ul>
        <div>
          <Link
            to={a.href}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all duration-300 hover:scale-105 hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, ${a.color} 0%, ${a.color}cc 100%)` }}>
            
            {a.cta} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </motion.div>);

}

/* ─── page ──────────────────────────────────────────────────────────────── */
export default function MarketingHomePage() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.62, 0.85]);

  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      <Helmet>
        <title>TRICCI &mdash; We Make It Easy | India&rsquo;s Smartest Recruitment Marketplace</title>
        <meta name="description" content="TRICCI — We Make It Easy. India's recruitment marketplace for companies, consultants and candidates. Get pre-screened candidates, access live mandates, and find the right job — faster." />
        <link rel="canonical" href={BASE} />
        <meta property="og:title" content="TRICCI — We Make It Easy" />
        <meta property="og:description" content="India's recruitment marketplace for companies, consultants and candidates. We Make It Easy." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={BASE} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="TRICCI — We Make It Easy" />
        <meta name="twitter:description" content="India's recruitment marketplace for companies, consultants and candidates." />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </Helmet>

      {/* ══════════════════════════════════════════════════════════════
           1. HERO — cinematic video + audience switcher
        ══════════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative h-screen min-h-[680px] max-h-[1000px] overflow-hidden flex items-center justify-center">
        <motion.div className="absolute inset-0 z-0" style={{ scale: videoScale }}>
          <img
            src="/assets/hero-main.png"
            alt="TRICCI recruitment platform — India's smartest hiring marketplace"
            className="w-full h-full object-cover"
            fetchPriority="high"
            width={1920}
            height={1080}
          />
        </motion.div>
        <motion.div className="absolute inset-0 z-10 bg-gray-950" style={{ opacity: overlayOpacity }} />
        <div className="absolute bottom-0 left-0 w-[600px] h-[500px] z-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at bottom left, rgba(232,71,10,0.28) 0%, transparent 65%)' }} />
        <div className="absolute top-0 right-0 w-[450px] h-[400px] z-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(107,79,187,0.2) 0%, transparent 65%)' }} />

        {/* audience switcher — full hero content */}
        <HeroAudienceSwitcher />



        {/* scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="absolute bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 z-20">
          
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' as const }}>
            <ChevronDown size={20} className="text-white/35" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
           2. TRUST MARQUEE
        ══════════════════════════════════════════════════════════════ */}
      <div className="py-3.5 bg-primary overflow-hidden">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' as const }}
          className="flex gap-8 whitespace-nowrap w-max">
          
          {[...TRUST_ITEMS, ...TRUST_ITEMS].map((item, i) =>
          <span key={i} className="flex items-center gap-3 text-xs font-bold text-white/90 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 shrink-0" />
              {item}
            </span>
          )}
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
           3. TAGLINE STRIP
        ══════════════════════════════════════════════════════════════ */}
      <section className="py-14 bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            
            {[
            { text: 'Right Talent', color: ORANGE },
            { text: 'Right Time', color: VIOLET },
            { text: 'Every Time', color: GREEN }].
            map((item, i) =>
            <span key={item.text} className="flex items-center gap-5">
                <span className="text-2xl md:text-4xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  {item.text}
                </span>
                {i < 2 &&
              <span className="w-2 h-2 rounded-full shrink-0 hidden sm:block" style={{ backgroundColor: item.color }} />
              }
              </span>
            )}
            <span className="text-2xl md:text-4xl font-black" style={{ color: ORANGE, fontFamily: 'var(--font-heading)' }}>
              &mdash; We Make It Easy.
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── Live Stats Counters (points 78-79) ── */}
      <section className="py-16 bg-background border-b border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <LiveStatsCounters />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
           4. AUDIENCE CARDS
        ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14">
            
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3">
              One Platform. Three Sides.
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-foreground mb-3 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Built for Everyone
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-md mx-auto">
              in the hiring chain.
            </p>
          </motion.div>

          <div className="flex flex-col gap-6 max-w-5xl mx-auto">
            {AUDIENCES.map((a, i) => <AudienceCard key={a.id} a={a} i={i} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
           5. AI FEATURES — tabbed panel
        ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-muted/40 border-y border-border overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12">
            
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-3">
              <Sparkles size={12} /> Powered by AI
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-foreground mb-3 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Technology that works
            </h2>
            <p className="text-lg text-muted-foreground font-medium max-w-lg mx-auto">
              TRICCI uses AI at every step to make hiring faster, smarter and more transparent.
            </p>
          </motion.div>

          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 mb-8 justify-center">
              {AI_TABS.map((tab, i) =>
              <button
                key={tab.id}
                onClick={() => setActiveTab(i)}
                className="flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300 border"
                style={
                activeTab === i ?
                { backgroundColor: tab.color, color: '#fff', borderColor: tab.color, boxShadow: `0 8px 24px -4px ${tab.color}40` } :
                { backgroundColor: 'transparent', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--border))' }
                }>
                
                  <tab.icon size={15} />
                  {tab.tag}
                </button>
              )}
            </div>

            <div className="relative rounded-3xl overflow-hidden bg-card border border-border shadow-xl">
              <AnimatePresence mode="wait">
                {AI_TABS.map((tab, i) =>
                activeTab === i ?
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: 'easeOut' as const }}
                  className="flex flex-col md:flex-row">
                  
                      <div className="relative w-full md:w-1/2 shrink-0 overflow-hidden">
                        <img
                      src={tab.img}
                      alt={tab.imgAlt}
                      className="w-full h-64 md:h-[420px] object-cover"
                      loading="lazy"
                      width={600}
                      height={420} />
                    
                        <div className="absolute inset-0 opacity-25"
                    style={{ background: `radial-gradient(ellipse at top left, ${tab.color} 0%, transparent 60%)` }} />
                        <div
                      className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white backdrop-blur-md"
                      style={{ backgroundColor: `${tab.color}dd` }}>
                      
                          <tab.icon size={12} />
                          {tab.tag}
                        </div>
                      </div>
                      <div className="flex flex-col justify-center p-8 md:p-12 w-full md:w-1/2">
                        <div
                      className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 shrink-0 self-start"
                      style={{ background: `${tab.color}12`, border: `1.5px solid ${tab.color}30` }}>
                      
                          <tab.icon size={26} style={{ color: tab.color }} />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-foreground mb-4 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                          {tab.title}
                        </h3>
                        <p className="text-base text-muted-foreground leading-relaxed mb-8">{tab.desc}</p>
                        <Link
                      to="/signup"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white self-start transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${tab.color} 0%, ${tab.color}cc 100%)` }}>
                      
                          Get started free <ArrowRight size={14} />
                        </Link>
                      </div>
                    </motion.div> :
                null
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
           6. WHY TRICCI
        ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-10">
                
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3">Why TRICCI</span>
                <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                  Built to solve what
                </h2>
                <p className="text-lg text-muted-foreground font-medium">job portals can&rsquo;t.</p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {WHY.map((w, i) =>
                <motion.div
                  key={w.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease: 'easeOut' as const }}
                  whileHover={{ y: -4, transition: { duration: 0.18 } }}
                  className="p-5 rounded-2xl border border-border bg-card hover:border-primary/20 hover:shadow-lg transition-all duration-300 cursor-default">
                  
                    <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${w.color}10`, border: `1.5px solid ${w.color}25` }}>
                    
                      <w.icon size={18} style={{ color: w.color }} />
                    </div>
                    <h3 className="font-black text-foreground mb-1 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>{w.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{w.desc}</p>
                  </motion.div>
                )}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: 'easeOut' as const }}
              className="w-full lg:w-[380px] shrink-0">
              
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="/airo-assets/images/pages/home/social-proof-companies"
                  alt="Companies hiring through TRICCI"
                  className="w-full h-80 lg:h-[520px] object-cover"
                  loading="lazy"
                  width={380}
                  height={520} />
                
                <div className="absolute inset-0 opacity-15"
                style={{ background: `radial-gradient(ellipse at bottom right, ${ORANGE} 0%, transparent 60%)` }} />
                <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-white/60 shadow-lg">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Platform promise</p>
                  <p className="text-sm font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                    ₹0 upfront &bull; 100% success-fee &bull; Pan-India
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
           7. HOW IT WORKS
        ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-muted/40 border-t border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16">
            
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3">Simple Process</span>
            <h2 className="text-3xl md:text-5xl font-black text-foreground mb-3 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Three steps.
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground font-medium">That&rsquo;s all it takes.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-[52px] left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-0.5 rounded-full"
            style={{ background: `linear-gradient(to right, ${ORANGE}55, ${VIOLET}55, ${GREEN}55)` }} />

            {STEPS.map((s, i) =>
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15, ease: 'easeOut' as const }}
              className="flex flex-col items-center text-center">
              
                <div
                className="relative w-[104px] h-[104px] rounded-3xl flex flex-col items-center justify-center mb-6 bg-card border-2 z-10 shadow-lg"
                style={{ borderColor: s.color }}>
                
                  <span className="text-2xl font-black leading-none mb-1" style={{ color: s.color, fontFamily: 'var(--font-heading)' }}>
                    {s.n}
                  </span>
                  <s.icon size={20} style={{ color: s.color, opacity: 0.7 }} />
                  <div className="absolute inset-0 rounded-3xl" style={{ boxShadow: `inset 0 0 24px ${s.color}10` }} />
                </div>
                <h3 className="text-xl font-black text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">{s.desc}</p>
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-14 text-center">
            
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-sm text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/30"
              style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, #c73d09 100%)` }}>
              
              Start for Free &mdash; It&rsquo;s Easy <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
           8. CTA BANNER
        ══════════════════════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden bg-background">
        <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 30% 50%, ${ORANGE}0f 0%, transparent 55%), radial-gradient(ellipse at 70% 50%, ${VIOLET}0a 0%, transparent 55%)` }} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}>
            
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 mx-auto"
              style={{ background: `${ORANGE}12`, border: `1.5px solid ${ORANGE}30` }}>
              
              <Sparkles size={28} style={{ color: ORANGE }} />
            </div>

            <span className="block text-xs font-bold uppercase tracking-widest mb-4 text-primary">
              Join TRICCI Today
            </span>
            <h2
              className="text-4xl md:text-6xl font-black text-foreground mb-4 leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}>
              
              Ready to make
              <br />
              recruitment <span style={{ color: ORANGE }}>TRICCI</span>?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-3 text-base leading-relaxed">
              Companies, consultants and candidates across India are joining TRICCI every day.
            </p>
            <p className="font-bold text-lg mb-10 text-foreground">We Make It Easy.</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl font-bold text-sm text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/30"
                style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, #c73d09 100%)` }}>
                
                Create Free Account <ArrowRight size={15} />
              </Link>
              <Link
                to="/jobs"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl font-semibold text-sm border border-border bg-card text-foreground hover:bg-muted transition-all duration-300">
                
                Browse Open Jobs
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>);

}