/**
 * LiveStatsCounters — points 78-79: homepage counters for employers
 * connected, consultants tied up, candidate database size. Fetches fresh
 * (no-cache) on mount and re-polls periodically so numbers reflect new
 * signups without a page reload.
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Building2, Users, UserCheck } from 'lucide-react';

function useInViewOnce<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin: '-50px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

interface LiveStats {
  employersConnected: number;
  consultantsTiedUp: number;
  candidateDatabaseSize: number;
}

function AnimatedNumber({ value, inView }: { value: number; inView: boolean }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const duration = 900;
    const start = performance.now();
    const from = display;
    let raf: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView]);
  return <>{display.toLocaleString('en-IN')}</>;
}

export default function LiveStatsCounters() {
  const [stats, setStats] = useState<LiveStats>({ employersConnected: 0, consultantsTiedUp: 0, candidateDatabaseSize: 0 });
  const { ref, inView } = useInViewOnce<HTMLDivElement>();

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch('/api/stats/live', { cache: 'no-store' })
        .then(r => r.json())
        .then(d => { if (!cancelled) setStats(d); })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 30000); // re-poll every 30s for near-live updates
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const items = [
    { icon: Building2, label: 'Employers Connected', value: stats.employersConnected, color: '#FF6B35' },
    { icon: Users, label: 'Consultants Tied Up', value: stats.consultantsTiedUp, color: '#6B4FBB' },
    { icon: UserCheck, label: 'Candidate Database', value: stats.candidateDatabaseSize, color: '#35c9ff' },
  ];

  return (
    <div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          className="rounded-2xl border p-6 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${item.color}08 0%, transparent 100%)`, borderColor: `${item.color}25` }}
        >
          <item.icon size={20} style={{ color: item.color }} className="mb-3" />
          <p className="text-3xl sm:text-4xl font-black" style={{ fontFamily: 'var(--font-heading)', color: item.color }}>
            <AnimatedNumber value={item.value} inView={inView} />+
          </p>
          <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
