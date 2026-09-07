import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, Star, User, ArrowRight } from 'lucide-react';

const ROLES = [
  {
    id: 'company',
    label: 'I am a Company',
    description: 'Looking to hire top talent through verified consultants',
    icon: Building2,
    color: '#E8470A',
    href: '/company',
  },
  {
    id: 'consultant',
    label: 'I am a Consultant',
    description: 'I place candidates and want to grow my earnings',
    icon: Star,
    color: '#6B4FBB',
    href: '/consultant',
  },
  {
    id: 'candidate',
    label: 'I am a Candidate',
    description: 'Looking for my next great opportunity',
    icon: User,
    color: '#22c55e',
    href: '/candidate',
  },
];

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title>TRICCI &mdash; Recruit &bull; Connect &bull; Grow</title>
        <meta name="description" content="TRICCI makes recruitment easy for companies, consultants and candidates across India. Tell us who you are to get started." />
        <link rel="canonical" href="https://tricci.in" />
        <meta property="og:title" content="TRICCI — Recruit • Connect • Grow" />
        <meta property="og:description" content="India&rsquo;s recruitment aggregator — making hiring easy for companies, consultants and candidates." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tricci.in" />
        <meta property="og:image" content="https://tricci.in/api/og?title=TRICCI&subtitle=Who+are+you%3F&type=platform" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="TRICCI — Recruit • Connect • Grow" />
        <meta name="twitter:description" content="India&rsquo;s recruitment aggregator — making hiring easy for companies, consultants and candidates." />
        <meta name="twitter:image" content="https://tricci.in/api/og?title=TRICCI&subtitle=Who+are+you%3F&type=platform" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'TRICCI',
          url: 'https://tricci.in',
          description: 'India\'s recruitment aggregator connecting companies, consultants and candidates.',
        })}</script>
      </Helmet>

      <section className="py-20 md:py-28 bg-background flex flex-col items-center justify-center px-4">
        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1
            className="text-5xl md:text-6xl font-black tracking-tight text-primary mb-3"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            TRICCI
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Recruit &bull; Connect &bull; Grow
          </p>
          <p className="mt-3 text-base text-foreground/70 max-w-md mx-auto">
            India&rsquo;s smartest recruitment aggregator — making hiring easy whether you&rsquo;re hiring, placing, or job-hunting.
            <br className="hidden md:block" /> Who are you?
          </p>
        </motion.div>

        {/* Role cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-3xl">
          {ROLES.map((role, i) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
            >
              <Link
                to={role.href}
                className="group flex flex-col items-center text-center p-8 rounded-2xl border-2 border-border bg-card hover:shadow-xl transition-all duration-300"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300"
                  style={{ backgroundColor: role.color + '15', border: `2px solid ${role.color}30` }}
                >
                  <role.icon size={28} style={{ color: role.color }} />
                </div>
                <h2 className="text-lg font-black text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  {role.label}
                </h2>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  {role.description}
                </p>
                <span
                  className="flex items-center gap-1.5 text-sm font-bold transition-colors"
                  style={{ color: role.color }}
                >
                  Learn more <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Already have account */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-sm text-muted-foreground"
        >
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign in here
          </Link>
        </motion.p>
      </section>
    </>
  );
}
