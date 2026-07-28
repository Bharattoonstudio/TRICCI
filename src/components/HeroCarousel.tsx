import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  {
    id: 'candidates',
    image: '/assets/900A7E9B-1C6C-4E0A-A925-781ED25051B7.png',
    alt: 'TRICCI for Candidates — Finding the Right Job Made Easy',
    label: 'For Candidates',
    tagline: 'Finding the right job is TRICCI.',
    target: '/candidate',
  },
  {
    id: 'consultants',
    image: '/assets/2DB37697-21FB-4D62-A745-B288B1FB977F.png',
    alt: 'TRICCI for Consultants — Growing Your Business Made Easy',
    label: 'For Consultants',
    tagline: 'Placing candidates is TRICCI.',
    target: '/consultant',
  },
  {
    id: 'employers',
    image: '/assets/6ED04CDE-A0E9-4C2D-AFC3-2A2770DE646D.png',
    alt: 'TRICCI for Companies — Hiring Made Easy',
    label: 'For Companies',
    tagline: 'Closing positions is TRICCI.',
    target: '/company',
  },
];

const AUTOPLAY_MS = 15000;

export default function HeroCarousel() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [dir, setDir] = useState<'up' | 'down'>('up');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (next: number, direction: 'up' | 'down') => {
      if (next === current) return;
      setPrev(current);
      setDir(direction);
      setCurrent(next);
    },
    [current],
  );

  const goNext = useCallback(() => {
    goTo((current + 1) % SLIDES.length, 'up');
  }, [current, goTo]);

  const goPrev = useCallback(() => {
    goTo((current - 1 + SLIDES.length) % SLIDES.length, 'down');
  }, [current, goTo]);

  useEffect(() => {
    if (prev === null) return;
    const t = setTimeout(() => setPrev(null), 650);
    return () => clearTimeout(t);
  }, [prev, current]);

  useEffect(() => {
    timerRef.current = setTimeout(goNext, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, goNext]);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '100svh', background: '#0a0a0a' }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-20">
        <div
          key={current}
          className="h-full"
          style={{
            background: '#E8470A',
            animation: `tricciProgress ${AUTOPLAY_MS}ms linear forwards`,
          }}
        />
      </div>

      {/* Slide stack — fullscreen images */}
      {SLIDES.map((s, i) => {
        const isActive = i === current;
        const isPrev = i === prev;

        let translateY = '100%';
        let opacity = 0;
        let zIndex = 0;

        if (isActive) { translateY = '0%'; opacity = 1; zIndex = 2; }
        else if (isPrev) { translateY = dir === 'up' ? '-100%' : '100%'; opacity = 0; zIndex = 1; }

        return (
          <div
            key={s.id}
            className="absolute inset-0"
            style={{
              transform: `translateY(${translateY})`,
              opacity,
              zIndex,
              transition: isActive || isPrev
                ? 'transform 0.65s cubic-bezier(0.4,0,0.2,1), opacity 0.65s ease'
                : 'none',
            }}
          >
            {/* Image fills full screen, cropped to fit */}
            <img
              src={s.image}
              alt={s.alt}
              onClick={() => isActive && navigate(s.target)}
              className="w-full h-full cursor-pointer select-none"
              style={{
                objectFit: 'cover',
                objectPosition: 'center top',
                display: 'block',
              }}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : 'auto'}
              draggable={false}
            />
            {/* Dark gradient overlay at bottom for text legibility */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.75) 100%)' }}
            />
          </div>
        );
      })}

      {/* Bottom bar — overlaid on image */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-4 md:px-10 py-5 gap-4">

        {/* Left arrow */}
        <button
          onClick={goPrev}
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/10 transition-colors backdrop-blur-sm"
          aria-label="Previous slide"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Centre — label + tagline + dots */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <span
            className="text-white font-black text-lg md:text-xl tracking-wide text-center"
            style={{ fontFamily: 'var(--font-heading)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
          >
            {SLIDES[current].label}
          </span>
          <span className="text-white/80 text-sm md:text-base font-medium text-center"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            {SLIDES[current].tagline}
          </span>
          {/* Dot indicators */}
          <div className="flex gap-2 items-center mt-1">
            {SLIDES.map((_, di) => (
              <button
                key={di}
                onClick={() => goTo(di, di > current ? 'up' : 'down')}
                aria-label={`Go to slide ${di + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: di === current ? '24px' : '7px',
                  height: '7px',
                  background: di === current ? '#E8470A' : 'rgba(255,255,255,0.45)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Right arrow */}
        <button
          onClick={goNext}
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white/10 transition-colors backdrop-blur-sm"
          aria-label="Next slide"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Tap to explore hint */}
      <div className="absolute bottom-28 left-0 right-0 flex justify-center z-20 pointer-events-none">
        <span
          className="px-4 py-2 rounded-full text-white/80 text-xs font-medium border border-white/20 backdrop-blur-sm"
          style={{ background: 'rgba(0,0,0,0.35)' }}
        >
          Tap image to explore →
        </span>
      </div>

      <style>{`
        @keyframes tricciProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
