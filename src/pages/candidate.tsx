import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, FileText, Bell, Zap, Shield, TrendingUp, ArrowRight, LogIn, Sparkles, CheckCircle, Globe, ExternalLink } from 'lucide-react';

const BENEFITS = [
  {
    icon: Search,
    title: 'Find the Right Job Faster',
    desc: 'TRICCI aggregates roles from verified companies across India. Search by role, location, salary and work type — all in one place.',
    image: '/airo-assets/images/candidate/benefit-find-job-faster',
    alt: 'Excited job seeker finding the perfect role on a laptop',
  },
  {
    icon: FileText,
    title: 'AI-Powered CV Optimisation',
    desc: "Upload your CV and let TRICCI's AI Copilot rewrite it for ATS systems. More interviews, less rejection.",
    image: '/airo-assets/images/candidate/benefit-ai-cv',
    alt: 'AI technology optimising a professional resume',
  },
  {
    icon: Bell,
    title: 'Smart Job Alerts',
    desc: 'Set your preferences once and get notified the moment a matching role is posted. Never miss an opportunity.',
    image: '/airo-assets/images/candidate/benefit-job-alerts',
    alt: 'Person receiving an exciting job alert notification',
  },
  {
    icon: Zap,
    title: 'Apply in One Click',
    desc: 'Your profile is ready, your CV is optimised — applying takes seconds. Consultants advocate for you directly.',
    image: '/airo-assets/images/candidate/benefit-one-click-apply',
    alt: 'Candidate applying to a job with a single click online',
  },
  {
    icon: TrendingUp,
    title: 'Track Your Applications',
    desc: 'See exactly where each application stands — submitted, shortlisted, interview scheduled. Full visibility.',
    image: '/airo-assets/images/candidate/benefit-track-applications',
    alt: 'Dashboard showing application tracking and status pipeline',
  },
  {
    icon: Shield,
    title: 'Your Data, Your Control',
    desc: "Toggle your profile visibility on or off at any time. TRICCI keeps your job search private until you're ready.",
    image: '/airo-assets/images/candidate/benefit-data-privacy',
    alt: 'Secure data privacy and profile control settings',
  },
];

export default function CandidatePage() {
  return (
    <>
      <Helmet>
        <title>For Candidates — TRICCI Makes Getting a Job Easy</title>
        <meta name="description" content="Finding the right job is TRICCI. Stop searching — let opportunities find you. AI CV optimisation, smart job alerts and one-click applications." />
        <link rel="canonical" href="https://tricci.in/candidate" />
        <meta property="og:title" content="For Candidates — TRICCI Makes Getting a Job Easy" />
        <meta property="og:description" content="Finding the right job is TRICCI. TRICCI makes it easy." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tricci.in/candidate" />
        <meta property="og:image" content="https://tricci.in/api/og?title=For+Candidates&subtitle=TRICCI+Makes+Job+Search+Easy&type=candidate" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="For Candidates — TRICCI Makes Getting a Job Easy" />
        <meta name="twitter:description" content="Finding the right job is TRICCI. TRICCI makes it easy." />
        <meta name="twitter:image" content="https://tricci.in/api/og?title=For+Candidates&subtitle=TRICCI+Makes+Job+Search+Easy&type=candidate" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'TRICCI for Candidates',
          url: 'https://tricci.in/candidate',
          description: 'TRICCI helps job seekers find the right role faster with AI CV optimisation and smart job alerts.',
          provider: { '@type': 'Organization', name: 'TRICCI', url: 'https://tricci.in' },
          areaServed: 'IN',
          serviceType: 'Job Search Platform',
        })}</script>
      </Helmet>

      {/* ── FREE JOBS AGGREGATOR BANNER ── */}
      <section className="relative overflow-hidden py-10 md:py-14" style={{ background: 'linear-gradient(135deg, #0d0520 0%, #0a0a0a 100%)' }}>
        {/* Grid bg */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(#6B4FBB 1px, transparent 1px), linear-gradient(90deg, #6B4FBB 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] rounded-full opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #E8470A 0%, transparent 70%)' }} />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
            {/* Left: text */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
                style={{ background: 'rgba(232,71,10,0.15)', color: '#E8470A', border: '1px solid rgba(232,71,10,0.3)' }}>
                <Zap size={11} /> NEW — Free for all candidates
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight"
                style={{ fontFamily: 'var(--font-heading)' }}>
                World&apos;s Jobs.{' '}
                <span style={{ background: 'linear-gradient(135deg, #E8470A, #6B4FBB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  One Search.
                </span>
              </h2>
              <p className="text-white/50 text-sm mb-6 max-w-md">
                Browse live jobs from Remotive, RemoteOK, Arbeitnow, The Muse and more — all in one place.
                Click any job to apply directly on the source site. No middlemen, no fees.
              </p>
              {/* Source pills */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
                {[
                  { name: 'Remotive', color: '#00d4aa' },
                  { name: 'RemoteOK', color: '#ff4742' },
                  { name: 'Arbeitnow', color: '#6B4FBB' },
                  { name: 'The Muse', color: '#f5a623' },
                ].map(s => (
                  <span key={s.name} className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border"
                    style={{ color: s.color, borderColor: `${s.color}30`, background: `${s.color}12` }}>
                    <Globe size={10} /> {s.name}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link to="/signup?role=candidate"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-black text-sm text-white transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #E8470A, #6B4FBB)', boxShadow: '0 0 24px rgba(232,71,10,0.35)' }}>
                  <Zap size={15} /> Sign Up &amp; Search Free Jobs
                </Link>
                <Link to="/login"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white/60 border border-white/15 hover:border-white/30 hover:text-white transition-all">
                  Already a member? Login <ExternalLink size={13} />
                </Link>
              </div>
            </div>

            {/* Right: preview card */}
            <div className="shrink-0 w-full md:w-72">
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: '#111' }}>
                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #E8470A, #6B4FBB)' }} />
                <div className="p-4 space-y-3">
                  {[
                    { title: 'Senior React Developer', co: 'Stripe', loc: 'Remote', color: '#00d4aa', src: 'Remotive' },
                    { title: 'Product Manager', co: 'Notion', loc: 'USA / Remote', color: '#ff4742', src: 'RemoteOK' },
                    { title: 'Data Scientist', co: 'SAP', loc: 'Berlin / Remote', color: '#6B4FBB', src: 'Arbeitnow' },
                    { title: 'UX Designer', co: 'Spotify', loc: 'New York', color: '#f5a623', src: 'The Muse' },
                  ].map((j, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: `${j.color}08`, border: `1px solid ${j.color}15` }}>
                      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-black"
                        style={{ background: `${j.color}20`, color: j.color }}>
                        {j.co[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{j.title}</p>
                        <p className="text-[10px] text-white/40">{j.co} · {j.loc}</p>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ color: j.color, background: `${j.color}15` }}>{j.src}</span>
                    </div>
                  ))}
                  <div className="text-center pt-1">
                    <span className="text-xs text-white/25">+ thousands more live jobs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-white">

        {/* Animated background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' as const }}
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, #E8470A 0%, transparent 70%)' }} />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' as const, delay: 2 }}
            className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, #6B4FBB 0%, transparent 70%)' }} />
        </div>

        <div className="container mx-auto px-4 pt-16 pb-14 md:pt-24 md:pb-20 text-center relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

            {/* Badge */}
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-8 tracking-widest uppercase"
              style={{ background: 'rgba(232,71,10,0.1)', color: '#E8470A', border: '1px solid rgba(232,71,10,0.3)' }}>
              <Sparkles size={12} /> For Candidates
            </motion.span>

            {/* H1 — the hook */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-4 text-foreground"
              style={{ fontFamily: 'var(--font-heading)' }}>
              Finding the Right Job<br />
              is{' '}
              <span style={{ color: '#E8470A' }}>TRICCI?</span>
            </h1>

            {/* First tagline hit */}
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-2xl md:text-3xl font-black italic mb-10 text-foreground"
              style={{ fontFamily: 'var(--font-heading)' }}>
              <span style={{ color: '#E8470A' }}>TRICCI</span> makes it easy.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.38 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link to="/signup?role=candidate"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base hover:opacity-90 transition-all shadow-lg hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #E8470A, #ff6b35)' }}>
                Start Your Journey <ArrowRight size={18} />
              </Link>
              <Link to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-border text-foreground font-bold text-base hover:border-primary hover:text-primary transition-colors">
                <LogIn size={18} /> Already a member? Login
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── BEFORE / AFTER — single unified split card ── */}
      <section className="py-12 md:py-16" style={{ background: '#fafafa' }}>
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-8">
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-2">Sound familiar?</p>
            <h2 className="text-3xl md:text-4xl font-black text-foreground"
              style={{ fontFamily: 'var(--font-heading)' }}>
              Before TRICCI &nbsp;&rarr;&nbsp; After TRICCI
            </h2>
          </motion.div>

          {/* Single unified card */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.55 }}
            className="max-w-3xl mx-auto rounded-3xl overflow-hidden shadow-xl border border-border">

            {/* ── Top: split image strip ── */}
            <div className="flex" style={{ height: '180px' }}>

              {/* Left — BEFORE image */}
              <div className="relative w-1/2 overflow-hidden">
                <img
                  src="/airo-assets/images/pages/candidate/frustrated-job-seeker"
                  alt="Frustrated job seeker before TRICCI"
                  className="w-full h-full object-cover"
                  style={{ filter: 'grayscale(40%) brightness(0.85)' }}
                  loading="lazy"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(180,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)' }} />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-black text-white"
                  style={{ background: 'rgba(185,28,28,0.88)', letterSpacing: '0.03em' }}>
                  BEFORE
                </span>
              </div>

              {/* Centre arrow divider */}
              <div className="relative z-10 flex items-center justify-center shrink-0"
                style={{ width: '44px', marginLeft: '-22px', marginRight: '-22px' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                  style={{ background: '#E8470A' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Right — AFTER image */}
              <div className="relative w-1/2 overflow-hidden">
                <img
                  src="/airo-assets/images/pages/candidate/happy-job-seeker"
                  alt="Happy candidate after TRICCI"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(232,71,10,0.15) 0%, rgba(0,0,0,0.45) 100%)' }} />
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-black text-white"
                  style={{ background: 'rgba(232,71,10,0.92)', letterSpacing: '0.03em' }}>
                  AFTER TRICCI
                </span>
              </div>
            </div>

            {/* ── Bottom: split text content ── */}
            <div className="flex divide-x divide-border">

              {/* Left — BEFORE text */}
              <div className="w-1/2 p-4 md:p-5 bg-red-50 space-y-2">
                <p className="text-sm font-bold text-red-700 leading-snug">Still no interview calls?</p>
                <ul className="space-y-1.5">
                  {[
                    '100s of applications, zero replies',
                    'CV blocked by ATS filters',
                    'No idea where it went',
                    'Chasing every portal',
                  ].map(t => (
                    <li key={t} className="flex items-start gap-1.5 text-xs text-red-600">
                      <span className="shrink-0 mt-0.5 font-bold">&times;</span> {t}
                    </li>
                  ))}
                </ul>
                <p className="text-xs font-black italic text-red-600 pt-1">Finding a job is TRICCI?</p>
              </div>

              {/* Right — AFTER text */}
              <div className="w-1/2 p-4 md:p-5 space-y-2" style={{ background: '#fff5f0' }}>
                <p className="text-sm font-bold leading-snug" style={{ color: '#E8470A' }}>Opportunities find YOU.</p>
                <ul className="space-y-1.5">
                  {[
                    'AI CV that clears every ATS',
                    'Consultants advocate for you',
                    'Real-time matching alerts',
                    'Full application visibility',
                  ].map(t => (
                    <li key={t} className="flex items-start gap-1.5 text-xs" style={{ color: '#c13d08' }}>
                      <CheckCircle size={12} className="shrink-0 mt-0.5" style={{ color: '#E8470A' }} /> {t}
                    </li>
                  ))}
                </ul>
                <p className="text-xs font-black italic pt-1" style={{ color: '#E8470A' }}>TRICCI makes it easy.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STOP SEARCHING BANNER ── */}
      <section className="py-14 text-center"
        style={{ background: 'linear-gradient(135deg, #fff5f0 0%, #fef3ff 100%)', borderTop: '1px solid rgba(232,71,10,0.1)', borderBottom: '1px solid rgba(232,71,10,0.1)' }}>
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <p className="text-2xl md:text-4xl font-black text-foreground mb-3 leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}>
              Stop searching for a job.
            </p>
            <p className="text-2xl md:text-4xl font-black mb-6 leading-tight text-foreground"
              style={{ fontFamily: 'var(--font-heading)' }}>
              Let opportunities find <em style={{ color: '#E8470A' }}>you.</em>
            </p>
            <p className="text-xl md:text-2xl font-black italic text-foreground"
              style={{ fontFamily: 'var(--font-heading)' }}>
              <span style={{ color: '#E8470A' }}>TRICCI</span> makes it easy.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="bg-muted/40 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3"
              style={{ fontFamily: 'var(--font-heading)' }}>
              What TRICCI Does for You
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to land your next role — faster and smarter.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {BENEFITS.map((b, i) => (
              <motion.div key={b.title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
                {/* Card image */}
                <div className="relative overflow-hidden" style={{ height: '160px' }}>
                  <img
                    src={b.image}
                    alt={b.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.35) 100%)' }} />
                  {/* Orange icon badge over image */}
                  <div className="absolute bottom-3 left-3 w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
                    style={{ background: '#E8470A', border: '2px solid rgba(255,255,255,0.3)' }}>
                    <b.icon size={16} color="#fff" />
                  </div>
                </div>
                {/* Card text */}
                <div className="p-5">
                  <h3 className="font-bold text-foreground mb-2">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="py-16 text-center" style={{ background: '#ffffff' }}>
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3"
              style={{ fontFamily: 'var(--font-heading)' }}>
              Your Next Job is Waiting.
            </h2>
            <p className="text-xl md:text-2xl font-black italic mb-8"
              style={{ color: '#E8470A', fontFamily: 'var(--font-heading)' }}>
              TRICCI makes it easy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup?role=candidate"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base hover:opacity-90 transition-all shadow-lg hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #E8470A, #ff6b35)' }}>
                Start Your Journey <ArrowRight size={18} />
              </Link>
              <Link to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-border text-foreground font-bold text-base hover:border-primary hover:text-primary transition-colors">
                <LogIn size={18} /> Already a member? Login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
