import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle, Users, TrendingUp, Shield, Clock, IndianRupee, ArrowRight, LogIn } from 'lucide-react';

const BENEFITS = [
  {
    icon: Users,
    title: 'Access Verified Consultants',
    desc: 'TRICCI connects you with a curated network of recruitment consultants who pre-screen every candidate — so you only meet people worth your time.',
    image: '/airo-assets/images/company/benefit-verified-consultants',
    alt: 'Professional consultants meeting and shaking hands',
  },
  {
    icon: TrendingUp,
    title: 'Fill Positions Faster',
    desc: 'Our aggregator model means multiple consultants work your role simultaneously. More pipelines, faster closures — TRICCI makes hiring easy.',
    image: '/airo-assets/images/company/benefit-fill-faster',
    alt: 'Team reviewing candidates and shortlisting resumes',
  },
  {
    icon: IndianRupee,
    title: 'Full Fee Transparency',
    desc: 'No hidden charges. You see exactly what you pay — a clear percentage only when you successfully hire. Zero upfront cost.',
    image: '/airo-assets/images/company/benefit-fee-transparency',
    alt: 'Clear invoice and transparent payment agreement',
  },
  {
    icon: Clock,
    title: 'Save Time, Reduce Effort',
    desc: 'Post once, reach many. Manage all submissions, interviews and offers from a single dashboard — no more juggling emails and spreadsheets.',
    image: '/airo-assets/images/company/benefit-save-time',
    alt: 'Business professional working efficiently on a dashboard',
  },
  {
    icon: Shield,
    title: 'Compliance & Trust',
    desc: 'Every consultant on TRICCI is verified. Candidate data is handled securely. You hire with confidence.',
    image: '/airo-assets/images/company/benefit-compliance-trust',
    alt: 'Digital security shield representing compliance and trust',
  },
  {
    icon: CheckCircle,
    title: 'Only Pay on Success',
    desc: "No placement, no fee. TRICCI's success-based model means your recruitment budget is always well spent.",
    image: '/airo-assets/images/company/benefit-pay-on-success',
    alt: 'Happy team celebrating a successful hire',
  },
];

export default function CompanyPage() {
  return (
    <>
      <Helmet>
        <title>For Companies — TRICCI Makes Hiring Easy</title>
        <meta name="description" content="TRICCI helps Indian companies hire faster through verified consultants, transparent fees and a single dashboard. Post a job free today." />
        <link rel="canonical" href="https://tricci.in/company" />
        <meta property="og:title" content="For Companies — TRICCI Makes Hiring Easy" />
        <meta property="og:description" content="Access verified consultants, fill positions faster and pay only on success. TRICCI makes it easy." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tricci.in/company" />
        <meta property="og:image" content="https://tricci.in/api/og?title=For+Companies&subtitle=TRICCI+Makes+Hiring+Easy&type=employer" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="For Companies — TRICCI Makes Hiring Easy" />
        <meta name="twitter:description" content="Access verified consultants, fill positions faster and pay only on success. TRICCI makes it easy." />
        <meta name="twitter:image" content="https://tricci.in/api/og?title=For+Companies&subtitle=TRICCI+Makes+Hiring+Easy&type=employer" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'TRICCI for Companies',
          url: 'https://tricci.in/company',
          description: 'TRICCI helps Indian companies hire faster through verified consultants, transparent fees and a single dashboard.',
          provider: { '@type': 'Organization', name: 'TRICCI', url: 'https://tricci.in' },
          areaServed: 'IN',
          serviceType: 'Recruitment Aggregator',
        })}</script>
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, #E8470A0D 0%, transparent 70%)' }} />
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, #6B4FBB0A 0%, transparent 70%)' }} />
        </div>
        <div className="container mx-auto px-4 pt-16 pb-14 md:pt-24 md:pb-20 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            {/* For Companies badge */}
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-8 tracking-widest uppercase"
              style={{ background: '#E8470A12', color: '#E8470A', border: '1px solid #E8470A30' }}>
              For Companies
            </span>

            {/* Bold hook */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground mb-6 leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}>
              Closing Positions<br />
              is <span style={{ color: '#E8470A' }}>TRICCI?</span>
            </h1>

            {/* Pain-point questions */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mb-8 space-y-2">
              <p className="text-base md:text-lg text-muted-foreground font-medium">
                Working with multiple agencies and still unable to hire quality talent?
              </p>
              <p className="text-base md:text-lg text-muted-foreground font-medium">
                Running behind consultants or candidates?
              </p>
              <p className="text-base md:text-lg text-muted-foreground font-medium">
                Finding it hard to close the positions?
              </p>
            </motion.div>

            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-4">
              <p className="text-3xl md:text-5xl font-black tracking-tight leading-tight"
                style={{ fontFamily: 'var(--font-heading)' }}>
                <span style={{ color: '#E8470A' }}>TRICCI</span>{' '}
                <span className="text-foreground" style={{ fontWeight: 400, fontSize: '0.85em' }}>makes it</span>{' '}
                <span className="text-foreground italic" style={{ fontWeight: 900 }}>easy.</span>
              </p>
            </motion.div>

            {/* Sub-line */}
            <motion.p
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.42 }}
              className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              Access a growing network of verified recruitment consultants through one platform
              and accelerate your hiring.
            </motion.p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup?role=employer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-white font-bold text-base hover:opacity-90 transition-opacity shadow-lg">
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
              Everything you need to hire smarter — in one place.
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
                  {/* Icon badge over image */}
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

      {/* Bottom CTA */}
      <section className="py-16 bg-white text-center">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Ready to Hire Smarter?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join companies across India who trust TRICCI to close positions faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup?role=employer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-white font-bold text-base hover:opacity-90 transition-opacity shadow-lg">
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
