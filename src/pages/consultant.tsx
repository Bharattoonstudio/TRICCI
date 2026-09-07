import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { IndianRupee, Briefcase, TrendingUp, Users, Shield, Zap, ArrowRight, LogIn } from 'lucide-react';

const BENEFITS = [
  {
    icon: IndianRupee,
    title: 'Earn an Industry-Leading Fee Share',
    desc: "TRICCI gives you one of the highest revenue shares in the industry. You do the placement — you keep the lion's share. TRICCI makes earning easy.",
    image: '/airo-assets/images/consultant/benefit-fee-share',
    alt: 'Consultant celebrating high earnings and commission income',
  },
  {
    icon: Briefcase,
    title: 'Access Live Job Mandates',
    desc: 'Browse verified, active job openings from companies across India. No cold calling, no chasing — just real opportunities ready to work.',
    image: '/airo-assets/images/consultant/benefit-live-mandates',
    alt: 'Recruiter browsing live job listings on a laptop',
  },
  {
    icon: TrendingUp,
    title: 'Grow Your Business',
    desc: "Whether you're a solo recruiter or a small agency, TRICCI gives you the infrastructure to scale — more clients, more placements, more income.",
    image: '/airo-assets/images/consultant/benefit-grow-business',
    alt: 'Business growth and upward trajectory for recruitment agency',
  },
  {
    icon: Users,
    title: 'Submit Candidates Easily',
    desc: 'A clean, simple portal to submit profiles, track status and manage your pipeline. No paperwork, no back-and-forth emails.',
    image: '/airo-assets/images/consultant/benefit-submit-candidates',
    alt: 'Recruiter submitting candidate profiles through an online portal',
  },
  {
    icon: Zap,
    title: 'Fast Turnaround',
    desc: 'Employers on TRICCI are serious about hiring. Expect quick feedback, faster interview cycles and quicker closures — so you get paid sooner.',
    image: '/airo-assets/images/consultant/benefit-fast-turnaround',
    alt: 'HR manager conducting a fast interview and handshake',
  },
  {
    icon: Shield,
    title: 'Transparent & Trustworthy',
    desc: 'Every placement, every fee, every commission — fully visible in your dashboard. No surprises, no disputes. TRICCI keeps it clean.',
    image: '/airo-assets/images/consultant/benefit-transparent-dashboard',
    alt: 'Clear analytics dashboard showing transparent commission tracking',
  },
];

export default function ConsultantPage() {
  return (
    <>
      <Helmet>
        <title>For Consultants — TRICCI Makes Placing Candidates Easy</title>
        <meta name="description" content="TRICCI helps recruitment consultants earn more with an industry-leading fee share, live job mandates and a simple submission portal. Join India's fastest growing recruitment network." />
        <link rel="canonical" href="https://tricci.in/consultant" />
        <meta property="og:title" content="For Consultants — TRICCI Makes Placing Candidates Easy" />
        <meta property="og:description" content="Earn an industry-leading fee share, access live mandates and grow your recruitment business with TRICCI." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tricci.in/consultant" />
        <meta property="og:image" content="https://tricci.in/api/og?title=For+Consultants&subtitle=TRICCI+Makes+Placing+Easy&type=consultant" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="For Consultants — TRICCI Makes Placing Candidates Easy" />
        <meta name="twitter:description" content="Earn an industry-leading fee share, access live mandates and grow your recruitment business with TRICCI." />
        <meta name="twitter:image" content="https://tricci.in/api/og?title=For+Consultants&subtitle=TRICCI+Makes+Placing+Easy&type=consultant" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'TRICCI for Consultants',
          url: 'https://tricci.in/consultant',
          description: 'TRICCI helps recruitment consultants earn more with an industry-leading fee share and live job mandates.',
          provider: { '@type': 'Organization', name: 'TRICCI', url: 'https://tricci.in' },
          areaServed: 'IN',
          serviceType: 'Recruitment Aggregator',
        })}</script>
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, #6B4FBB0D 0%, transparent 70%)' }} />
          <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, #E8470A0A 0%, transparent 70%)' }} />
        </div>
        <div className="container mx-auto px-4 pt-16 pb-14 md:pt-24 md:pb-20 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            {/* Badge */}
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-8 tracking-widest uppercase"
              style={{ background: '#6B4FBB12', color: '#6B4FBB', border: '1px solid #6B4FBB30' }}>
              For Consultants
            </span>

            {/* Bold hook */}
            <h1 className="text-4xl md:text-6xl font-black text-foreground mb-6 leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}>
              Finding Clients<br />
              is <span style={{ color: '#6B4FBB' }}>TRICCI?</span>
            </h1>

            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8">
              <p className="text-3xl md:text-5xl font-black tracking-tight leading-tight"
                style={{ fontFamily: 'var(--font-heading)' }}>
                <span style={{ color: '#6B4FBB' }}>TRICCI</span>{' '}
                <span className="text-foreground" style={{ fontWeight: 400, fontSize: '0.85em' }}>makes it</span>{' '}
                <span className="text-foreground italic" style={{ fontWeight: 900 }}>easy.</span>
              </p>
            </motion.div>

            {/* Story paragraph */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="max-w-2xl mx-auto mb-4 space-y-3 text-left">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Many talented consultants — solo recruiters, freelancers, small agencies — spend more time
                chasing requirements than actually closing positions. Not because they lack skill, but because
                they lack the network and the platform to connect with verified companies.
              </p>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                TRICCI changes that. We give you direct access to live requirements from verified employers
                across India — so you can stop running behind accounts and start focusing on what you do best:
                <strong className="text-foreground"> making placements and earning well.</strong>
              </p>
            </motion.div>

            {/* Sub-line */}
            <motion.p
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.44 }}
              className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-4 leading-relaxed italic">
              Stop chasing requirements. Start closing positions.
            </motion.p>

            {/* More requirements line */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.54 }}
              className="max-w-xl mx-auto mb-10 text-center">
              <p className="text-lg md:text-xl text-muted-foreground italic mb-1">
                More requirements &nbsp;·&nbsp; More placements &nbsp;·&nbsp; More income.
              </p>
              <p className="text-xl md:text-2xl font-black italic"
                style={{ color: '#E8470A', fontFamily: 'var(--font-heading)' }}>
                TRICCI makes it easy.
              </p>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup?role=consultant"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base hover:opacity-90 transition-opacity shadow-lg"
                style={{ background: '#6B4FBB' }}>
                Want to Explore? <ArrowRight size={18} />
              </Link>
              <Link to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-border text-foreground font-bold text-base hover:border-primary hover:text-primary transition-colors">
                <LogIn size={18} /> Existing Customer? Login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
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
              Everything a consultant needs to place more, earn more and stress less.
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
                  {/* Purple icon badge over image */}
                  <div className="absolute bottom-3 left-3 w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
                    style={{ background: '#6B4FBB', border: '2px solid rgba(255,255,255,0.3)' }}>
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

      {/* Bottom CTA */}
      <section className="py-16 bg-white text-center">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Ready to Grow Your Recruitment Business?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join TRICCI's growing network of consultants earning more with less friction.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup?role=consultant"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base hover:opacity-90 transition-opacity shadow-lg"
                style={{ background: '#6B4FBB' }}>
                Want to Explore? <ArrowRight size={18} />
              </Link>
              <Link to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-border text-foreground font-bold text-base hover:border-primary hover:text-primary transition-colors">
                <LogIn size={18} /> Existing Customer? Login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
