import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import { useRef } from 'react';
import {
  Target, Zap, Shield, Heart, TrendingUp, Users,
  ArrowRight, Globe, Mail, Quote, Building2, Star, User, Clock,
} from 'lucide-react';

const BASE = 'https://tricci.in';
const canonicalUrl = `${BASE}/about`;
const title = "About TRICCI — India's Transparent Recruitment Marketplace";
const description =
  "TRICCI was built to fix a broken recruitment industry. Learn about our mission, the founder's vision, and how we're making hiring faster, smarter, and more transparent for companies, consultants, and candidates across India.";

/* ─── data ──────────────────────────────────────────────────────────────── */
const STATS = [
  { value: '₹0', label: 'Upfront cost for employers', sub: 'Pay only on success' },
  { value: '6%', label: 'Fee share for consultants', sub: 'Among the highest in India ★' },
  { value: '4 cities', label: 'Active hiring markets', sub: 'Expanding monthly' },
  { value: '100%', label: 'Fee transparency', sub: 'No hidden charges' },
];

const PROBLEMS = [
  {
    title: 'Companies',
    desc: 'Stuck with a handful of consultants covering limited industries and geographies — leading to longer hiring cycles and missed talent.',
    img: '/airo-assets/images/pages/founder/problem-companies',
    alt: 'HR manager overwhelmed with hiring',
    color: '#E8470A',
    icon: Building2,
    tag: 'The Employer Pain',
  },
  {
    title: 'Consultants',
    desc: 'Talented recruiters with strong networks but no access to quality mandates — their potential going completely untapped.',
    img: '/airo-assets/images/pages/founder/problem-consultants',
    alt: 'Recruitment consultant without mandates',
    color: '#6B4FBB',
    icon: Star,
    tag: 'The Recruiter Pain',
  },
  {
    title: 'Candidates',
    desc: 'Job seekers spending valuable time across multiple platforms, unsure if their profiles are reaching the right employers.',
    img: '/airo-assets/images/pages/founder/problem-candidates',
    alt: 'Job seeker frustrated searching online',
    color: '#16a34a',
    icon: User,
    tag: 'The Candidate Pain',
  },
];

const VALUES = [
  {
    icon: Shield,
    color: '#E8470A',
    title: 'Radical Transparency',
    description:
      'Every fee, every metric is visible to all parties. No hidden markups, no opaque pricing. Employers know exactly what they pay; consultants know exactly what they earn.',
  },
  {
    icon: TrendingUp,
    color: '#6B4FBB',
    title: 'Performance First',
    description:
      'We charge nothing until a hire is made. No retainers, no subscriptions for employers. Consultants earn more by placing better — the incentives are finally aligned.',
  },
  {
    icon: Users,
    color: '#16a34a',
    title: 'Consultant Empowerment',
    description:
      'Independent recruiters are the backbone of the industry yet earn the least. TRICCI flips that — the majority of every placement fee goes directly to the consultant who did the work.',
  },
  {
    icon: Heart,
    color: '#a78bfa',
    title: 'Candidate Dignity',
    description:
      'Candidates are people, not inventory. We never charge job seekers, never share their data without consent, and ensure every application gets a response.',
  },
  {
    icon: Zap,
    color: '#f59e0b',
    title: 'Speed Through Trust',
    description:
      'Verified employers, credentialed consultants, and pre-screened candidates mean less time on due diligence and more time on the actual hire.',
  },
  {
    icon: Target,
    color: '#f87171',
    title: 'India-First Design',
    description:
      'Built for the nuances of the Indian job market — regional languages, tier-2 city hiring, CTC structures, notice periods, and the consultant ecosystem that powers it all.',
  },
];

const OFFERS = [
  {
    color: '#E8470A',
    label: 'For Companies',
    img: '/airo-assets/images/pages/founder/offer-companies',
    alt: 'Happy business team celebrating successful hire',
    items: [
      'Faster hiring turnaround times',
      'Access to a Pan-India recruiter network',
      'Wider talent reach across industries and locations',
      'Reduced dependency on limited sourcing channels',
      'Improved hiring efficiency and recruitment outcomes',
    ],
  },
  {
    color: '#6B4FBB',
    label: 'For Consultants & Recruiters',
    img: '/airo-assets/images/pages/founder/offer-consultants',
    alt: 'Consultant presenting growth results',
    items: [
      'Access to active hiring mandates',
      'Opportunities to collaborate with multiple organizations',
      'Increased earning potential',
      'The ability to grow beyond geographical boundaries',
    ],
  },
  {
    color: '#16a34a',
    label: 'For Job Seekers',
    img: '/airo-assets/images/pages/founder/offer-candidates',
    alt: 'Happy professional celebrating job offer',
    items: [
      'Access to relevant opportunities',
      'AI-powered CV enhancement',
      'Better ATS compatibility',
      'Increased visibility among recruiters and employers',
      'Personalized job recommendations',
    ],
  },
];

const VISION_PILLARS = [
  {
    icon: Zap,
    label: 'One Requirement',
    sub: 'Post once, reach hundreds of recruiters instantly across India.',
    color: '#E8470A',
  },
  {
    icon: Globe,
    label: 'Pan-India Reach',
    sub: 'Every industry, function, and geography — covered simultaneously.',
    color: '#6B4FBB',
  },
  {
    icon: Clock,
    label: 'Faster Hiring',
    sub: 'Relevant profiles within hours. Shortlisting can begin in 24 hours.',
    color: '#16a34a',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: title,
  url: canonicalUrl,
  description,
  mainEntity: {
    '@type': 'Organization',
    name: 'TRICCI',
    url: BASE,
    description: "India's first transparent, AI-powered recruitment marketplace connecting employers, independent consultants, and candidates.",
    foundingDate: '2024',
    areaServed: { '@type': 'Country', name: 'India' },
    founder: {
      '@type': 'Person',
      name: 'Ritesh Kumar Bhatia',
      jobTitle: 'Founder',
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' as const },
  }),
};

/* ─── page ──────────────────────────────────────────────────────────────── */
export default function AboutPage() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const overlayOp = useTransform(scrollYProgress, [0, 1], [0.72, 0.9]);

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
        <meta property="og:image" content={`${BASE}/api/og?title=About+TRICCI&subtitle=India%27s+AI-Powered+Recruitment+Marketplace&type=platform`} />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:site_name" content="TRICCI" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={`${BASE}/api/og?title=About+TRICCI&subtitle=India%27s+AI-Powered+Recruitment+Marketplace&type=platform`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* ══════════════════════════════════════════════════════════
          1. HERO — cinematic parallax
      ══════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative h-[70vh] min-h-[520px] max-h-[720px] overflow-hidden flex items-end">
        <motion.div className="absolute inset-0 z-0" style={{ y: bgY }}>
          <img
            src="/airo-assets/images/pages/founder/office-bg"
            alt=""
            className="w-full h-full object-cover scale-110"
            fetchPriority="high"
            width={1440}
            height={720}
          />
        </motion.div>
        <motion.div className="absolute inset-0 z-10 bg-gray-950" style={{ opacity: overlayOp }} />
        <div className="absolute bottom-0 left-0 w-[600px] h-[350px] z-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at bottom left, rgba(232,71,10,0.32) 0%, transparent 65%)' }} />
        <div className="absolute top-0 right-0 w-[450px] h-[350px] z-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(107,79,187,0.22) 0%, transparent 65%)' }} />

        <div className="relative z-20 container mx-auto px-4 pb-16 md:pb-24">
          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' as const }}>
            <span className="inline-block text-xs font-bold uppercase tracking-widest mb-5 px-4 py-2 rounded-full border border-white/20 bg-white/8 backdrop-blur-md text-white/65">
              Our Story &amp; Vision
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-[0.92] tracking-tight mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
              Recruitment was broken.
              <br />
              <span style={{ color: '#E8470A' }}>We&rsquo;re fixing it.</span>
            </h1>
            <p className="text-white/50 text-base md:text-lg max-w-lg leading-relaxed">
              India&rsquo;s first transparent, AI-powered recruitment marketplace — built for
              companies, consultants, and candidates.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          2. STATS BAR
      ══════════════════════════════════════════════════════════ */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden">
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} custom={i} initial="hidden" whileInView="visible"
                viewport={{ once: true }} variants={fadeUp}
                className="bg-background p-6 md:p-8 text-center">
                <p className="text-3xl md:text-4xl font-black mb-1" style={{ color: '#E8470A', fontFamily: 'var(--font-heading)' }}>
                  {stat.value}
                </p>
                <p className="text-sm font-semibold text-foreground mb-0.5">{stat.label}</p>
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. FOUNDER INTRO — portrait + letter
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-background overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">

            {/* founder info card */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, ease: 'easeOut' as const }}
              className="lg:col-span-2 flex flex-col gap-4"
            >
              {/* name card */}
              <div className="relative rounded-3xl overflow-hidden border border-border bg-card p-8">
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
                  style={{ background: 'linear-gradient(90deg, #E8470A, #6B4FBB)' }} />
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white mb-5 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #E8470A 0%, #6B4FBB 100%)' }}>
                  RB
                </div>
                <p className="font-black text-foreground text-2xl leading-tight mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                  Ritesh Kumar Bhatia
                </p>
                <p className="text-sm font-semibold mb-5" style={{ color: '#E8470A' }}>Founder, TRICCI</p>
                <a
                  href="mailto:Connect@Tricci.in"
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-background hover:bg-muted transition-colors text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(232,71,10,0.12)', border: '1px solid rgba(232,71,10,0.3)' }}>
                    <Mail size={13} style={{ color: '#E8470A' }} />
                  </div>
                  Connect@Tricci.in
                </a>
              </div>

              {/* quote card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="p-6 rounded-2xl border border-border bg-card relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                  style={{ background: 'linear-gradient(90deg, #E8470A, #6B4FBB)' }} />
                <Quote size={22} className="mb-3" style={{ color: '#E8470A', opacity: 0.35 }} />
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  &ldquo;If Hiring Is Hard, TRICCI Makes It Easy.&rdquo;
                </p>
                <p className="text-xs font-bold text-foreground mt-3">— Ritesh Kumar Bhatia</p>
              </motion.div>
            </motion.div>

            {/* letter */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, ease: 'easeOut' as const }}
              className="lg:col-span-3"
            >
              <span className="inline-block text-xs font-bold uppercase tracking-widest mb-5 px-3 py-1.5 rounded-full border border-border text-muted-foreground">
                A Message from the Founder
              </span>
              <p className="text-sm font-bold uppercase tracking-widest mb-6" style={{ color: '#E8470A' }}>
                Dear Visitor,
              </p>

              <div className="space-y-5 text-base text-muted-foreground leading-relaxed">
                <p>Thank you for taking the time to visit TRICCI.</p>
                <p>
                  Over the years, I have closely observed the recruitment industry and witnessed a challenge
                  that continues to affect companies, recruitment consultants, and job seekers across India.
                </p>
              </div>

              {/* inline image stamp */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="my-8 rounded-2xl overflow-hidden border border-border shadow-lg relative"
              >
                <img
                  src="/airo-assets/images/pages/founder/offer-companies"
                  alt="Teams collaborating in modern office"
                  className="w-full h-44 object-cover"
                  loading="lazy"
                  width={640}
                  height={176}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-gray-950/65 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-5">
                  <span className="text-xs font-bold text-white/80 uppercase tracking-widest">
                    The Hiring Ecosystem — Reimagined
                  </span>
                </div>
              </motion.div>

              <div className="space-y-5 text-base text-muted-foreground leading-relaxed">
                <p className="text-foreground font-semibold text-lg leading-snug">
                  Despite having an abundance of talent and thousands of recruitment professionals,
                  the hiring ecosystem remains fragmented.
                </p>
                <p>
                  Companies often work with a limited number of consultants who cater to specific industries,
                  skill sets, or geographical regions. As a result, many organizations struggle to access
                  the broader talent market — leading to longer hiring cycles, increased recruitment costs,
                  and missed business opportunities.
                </p>
                <p>
                  At the same time, countless talented recruitment consultants and freelance recruiters
                  possess strong candidate networks but lack access to quality hiring mandates. Job seekers,
                  on the other hand, spend valuable time searching across multiple platforms, often unsure
                  whether their profiles are reaching the right employers.
                </p>
                <p>
                  That realization led to the creation of{' '}
                  <strong className="text-foreground">TRICCI</strong> — India&rsquo;s AI-Powered Recruitment Marketplace
                  built to transform the way hiring happens.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          4. THE PROBLEM — dark section with image-stamp cards
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 relative overflow-hidden" style={{ background: '#0d0d0d' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(232,71,10,0.09) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(107,79,187,0.07) 0%, transparent 60%)' }} />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 max-w-2xl mx-auto"
          >
            <span className="inline-block text-xs font-bold uppercase tracking-widest mb-4 px-3 py-1.5 rounded-full border border-white/10 text-white/40">
              The Core Problem
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              The problem is not a{' '}
              <span style={{ color: '#E8470A' }}>shortage of talent.</span>
            </h2>
            <p className="text-white/45 text-base leading-relaxed">
              The problem is the lack of a unified platform where companies, recruiters,
              consultants, and candidates can connect and collaborate efficiently.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PROBLEMS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' as const }}
                className="group flex flex-col rounded-3xl overflow-hidden border border-white/8 bg-white/3 hover:border-white/18 transition-all duration-300"
              >
                <div className="relative h-44 overflow-hidden shrink-0">
                  <img
                    src={p.img}
                    alt={p.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    width={400}
                    height={176}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/30 to-transparent" />
                  <div
                    className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border"
                    style={{ color: p.color, backgroundColor: `${p.color}20`, borderColor: `${p.color}40` }}
                  >
                    <p.icon size={11} />
                    {p.tag}
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-black text-white text-lg mb-3" style={{ fontFamily: 'var(--font-heading)' }}>{p.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed flex-1">{p.desc}</p>
                  <div className="mt-5 h-0.5 rounded-full opacity-30" style={{ backgroundColor: p.color }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          5. VISION — letter + image stack
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: 'easeOut' as const }}
            >
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-5">The Vision</span>
              <div className="space-y-5 text-base text-muted-foreground leading-relaxed">
                <p className="text-foreground font-semibold text-xl leading-snug">
                  Our mission is to bring Companies, Recruitment Consultants, Freelance Recruiters,
                  and Job Seekers together on a single platform.
                </p>
                <p>
                  Imagine having to sign agreements with multiple recruitment agencies across different
                  cities, industries, and specializations to meet your hiring needs. Now imagine accessing
                  a nationwide network of recruiters through{' '}
                  <strong className="text-foreground">one platform and one ecosystem.</strong>
                </p>
                <p>
                  With TRICCI, organizations can connect with recruitment consultants and freelance
                  recruiters from across India, covering virtually every industry, function, and geography —
                  Technology, Banking, BFSI, Sales, Marketing, Manufacturing, Healthcare, Retail, Logistics,
                  Leadership Hiring, and emerging sectors.
                </p>
              </div>

              {/* pull quote */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-10 relative pl-7"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                  style={{ background: 'linear-gradient(to bottom, #E8470A, #6B4FBB)' }} />
                <p className="text-xl md:text-2xl font-black text-foreground leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>
                  &ldquo;Instead of relying on a handful of consultants, companies can have{' '}
                  <span style={{ color: '#E8470A' }}>hundreds of recruiters</span>{' '}
                  working simultaneously on the same position.&rdquo;
                </p>
                <p className="text-sm text-muted-foreground mt-3">— Ritesh Kumar Bhatia, Founder</p>
              </motion.div>
            </motion.div>

            {/* image stack */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: 'easeOut' as const }}
              className="flex flex-col gap-4"
            >
              <div className="relative rounded-3xl overflow-hidden border border-border shadow-2xl">
                <img
                  src="/airo-assets/images/pages/founder/offer-consultants"
                  alt="Consultant presenting growth results"
                  className="w-full h-64 object-cover"
                  loading="lazy"
                  width={560}
                  height={256}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5">
                  <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Consultants growing with TRICCI</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { img: '/airo-assets/images/pages/founder/offer-candidates', alt: 'Candidate celebrating', label: 'Candidates' },
                  { img: '/airo-assets/images/pages/founder/problem-companies', alt: 'The hiring challenge', label: 'Companies' },
                ].map((s) => (
                  <div key={s.label} className="relative rounded-2xl overflow-hidden border border-border shadow-lg">
                    <img src={s.img} alt={s.alt} className="w-full h-36 object-cover" loading="lazy" width={260} height={144} />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">{s.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          6. VISION PILLARS
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {VISION_PILLARS.map((v, i) => (
              <motion.div
                key={v.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: `${v.color}15`, border: `1.5px solid ${v.color}35` }}>
                  <v.icon size={20} style={{ color: v.color }} />
                </div>
                <div>
                  <p className="font-black text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{v.label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          7. WHAT TRICCI OFFERS — image-top cards
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3">For Everyone</span>
            <h2 className="text-3xl md:text-5xl font-black text-foreground leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              What TRICCI offers
            </h2>
          </motion.div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {OFFERS.map((col, i) => (
              <motion.div
                key={col.label}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' as const }}
                className="group flex flex-col rounded-3xl overflow-hidden border border-border bg-card hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative h-44 overflow-hidden shrink-0">
                  <img
                    src={col.img}
                    alt={col.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    width={400}
                    height={176}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                  <div
                    className="absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md border"
                    style={{ color: col.color, backgroundColor: `${col.color}20`, borderColor: `${col.color}40` }}
                  >
                    {col.label}
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <ul className="space-y-3 flex-1">
                    {col.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: col.color }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 h-0.5 rounded-full opacity-20" style={{ backgroundColor: col.color }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          8. VALUES
      ══════════════════════════════════════════════════════════ */}
      <section className="border-t border-border bg-card/20">
        <div className="container mx-auto px-4 py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, ease: 'easeOut' as const }}
            className="text-center mb-14">
            <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-4">
              What We Stand For
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              Our Values
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {VALUES.map((val, i) => {
              const Icon = val.icon;
              return (
                <motion.div key={val.title} custom={i} initial="hidden" whileInView="visible"
                  viewport={{ once: true }} variants={fadeUp}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: val.color + '18', border: `1.5px solid ${val.color}30` }}>
                    <Icon size={18} style={{ color: val.color }} />
                  </div>
                  <h3 className="text-base font-black text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    {val.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{val.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          9. CLOSING SIGN-OFF — dark
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 relative overflow-hidden" style={{ background: '#0d0d0d' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(107,79,187,0.1) 0%, transparent 60%)' }} />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: 'easeOut' as const }}
            >
              <div className="space-y-5 text-base text-white/50 leading-relaxed">
                <p>TRICCI is not just another job portal.</p>
                <p className="text-white/70">
                  It is a recruitment marketplace designed to connect talent with opportunity,
                  employers with expertise, and recruiters with growth opportunities.
                </p>
                <p>
                  We believe the future of recruitment lies in collaboration, technology, and
                  intelligent matchmaking. By combining Artificial Intelligence with the collective
                  strength of India&rsquo;s recruitment community, we are building a platform that
                  empowers every stakeholder in the hiring journey.
                </p>
                <p className="text-white font-medium text-lg">
                  It is a vision to make recruitment faster, smarter, more accessible,
                  and more effective for everyone.
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 }}
                className="mt-10 p-6 rounded-2xl border relative overflow-hidden"
                style={{ borderColor: 'rgba(232,71,10,0.3)', background: 'rgba(232,71,10,0.07)' }}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: 'linear-gradient(90deg, #E8470A, #6B4FBB)' }} />
                <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Do Remember&hellip;</p>
                <p className="text-xl md:text-2xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                  If Hiring Is Hard,{' '}
                  <span style={{ color: '#E8470A' }}>TRICCI Makes It Easy.</span>
                </p>
              </motion.div>

              <div className="mt-8 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #E8470A 0%, #6B4FBB 100%)' }}>
                  RB
                </div>
                <div>
                  <p className="font-black text-white text-lg" style={{ fontFamily: 'var(--font-heading)' }}>Ritesh Kumar Bhatia</p>
                  <p className="text-sm text-white/50">Founder, TRICCI</p>
                  <p className="text-xs text-white/30 mt-0.5 italic">TRICCI &mdash; India&rsquo;s AI-Powered Marketplace for Recruitment</p>
                </div>
              </div>
            </motion.div>

            {/* image stamps */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: 'easeOut' as const }}
              className="flex flex-col gap-4"
            >
              <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                <img
                  src="/airo-assets/images/pages/founder/offer-companies"
                  alt="Team celebrating success"
                  className="w-full h-56 object-cover"
                  loading="lazy"
                  width={560}
                  height={224}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/20 to-transparent" />
                <div className="absolute bottom-5 left-5">
                  <p className="text-white font-bold text-sm">The Future of Hiring in India</p>
                  <p className="text-white/50 text-xs mt-0.5">Powered by TRICCI</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                  <img src="/airo-assets/images/pages/founder/problem-companies" alt="Before TRICCI" className="w-full h-32 object-cover" loading="lazy" width={260} height={128} />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/85 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#E8470A' }}>Before TRICCI</span>
                  </div>
                </div>
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                  <img src="/airo-assets/images/pages/founder/offer-candidates" alt="After TRICCI" className="w-full h-32 object-cover" loading="lazy" width={260} height={128} />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/85 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#16a34a' }}>After TRICCI</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          10. CTA
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-background border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Ready to experience recruitment<br />
              <span style={{ color: '#E8470A' }}>the way it should be?</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join employers, consultants, and candidates already using TRICCI to hire better, earn more, and find the right fit.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-2xl font-bold text-sm text-white transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/30"
                style={{ background: 'linear-gradient(135deg, #E8470A 0%, #c73d09 100%)' }}
              >
                Join TRICCI Free <ArrowRight size={15} />
              </Link>
              <Link
                to="/jobs"
                className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-2xl font-semibold text-sm border border-border bg-card hover:bg-muted transition-colors text-foreground"
              >
                Browse Open Roles
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
