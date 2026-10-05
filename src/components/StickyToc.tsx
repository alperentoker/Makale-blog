import React, { useEffect, useState } from 'react';
import { TocHeading } from '../types';
import { Crosshair } from 'lucide-react';

interface StickyTocProps {
  headings: TocHeading[];
}

export const StickyToc: React.FC<StickyTocProps> = ({ headings }) => {
  const [activeId, setActiveId] = useState<string>('');
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (window.scrollY / total) * 100)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0% -60% 0%',
        threshold: 0,
      }
    );

    headings.forEach(heading => {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className="hidden xl:block w-80 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 text-xs font-sans select-none scrollbar-none">
      {/* Tactical Radar Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-paper-300 dark:border-paper-800 text-[10px] font-mono tracking-wider">
        <div className="flex items-center gap-2 text-ink-900 dark:text-paper-100 font-bold uppercase">
          <Crosshair className="w-3.5 h-3.5 text-tactical-amber animate-pulse" />
          <span>RADAR // İÇİNDEKİLER</span>
        </div>
        <span className="text-tactical-blue font-semibold">%{Math.round(scrollProgress)}</span>
      </div>

      {/* Optical Scanning Track */}
      <nav className="relative pl-3 space-y-1">
        {/* Background Track Line */}
        <div className="absolute left-[7px] top-1 bottom-1 w-[1.5px] bg-paper-300 dark:bg-paper-800" />
        
        {/* Active Laser Scanning Indicator */}
        <div 
          className="absolute left-[7px] top-1 w-[1.5px] bg-gradient-to-b from-tactical-blue to-tactical-amber transition-all duration-150"
          style={{ height: `${scrollProgress}%` }}
        />

        {headings.map(h => {
          const isActive = activeId === h.id;
          return (
            <a
              key={h.id}
              href={`#${h.id}`}
              onClick={e => {
                e.preventDefault();
                const target = document.getElementById(h.id);
                if (target) {
                  const offset = 80;
                  const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;
                  window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth',
                  });
                  history.pushState(null, '', `#${h.id}`);
                }
              }}
              className={`group flex items-start py-1.5 transition-all relative ${
                h.level === 3 ? 'pl-5 text-[11px]' : 'pl-3 font-medium text-xs'
              } ${
                isActive
                  ? 'text-tactical-blue dark:text-tactical-amber font-semibold'
                  : 'text-ink-600 dark:text-ink-400 hover:text-ink-950 dark:hover:text-paper-100'
              }`}
            >
              {/* Tactical Pip / Dot */}
              <span
                className={`absolute left-[-2px] top-[9px] w-[7px] h-[7px] rounded-full transition-all ${
                  isActive
                    ? 'bg-tactical-amber shadow-[0_0_8px_rgba(245,158,11,0.8)] scale-125 ring-2 ring-tactical-amber/30'
                    : 'bg-paper-400 dark:bg-paper-700 opacity-40 group-hover:opacity-100 group-hover:bg-tactical-blue'
                }`}
              />

              <span className="leading-snug line-clamp-2">
                {h.text}
              </span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
};
