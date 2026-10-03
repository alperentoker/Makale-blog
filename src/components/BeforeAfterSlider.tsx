import React, { useState, useRef, useCallback } from 'react';
import { Maximize2, SplitSquareVertical, Sliders } from 'lucide-react';
import { BeforeAfterMedia } from '../types';

interface BeforeAfterSliderProps {
  media: BeforeAfterMedia;
  onOpenLightbox?: (url: string, title: string, caption?: string) => void;
}

type PaletteMode = 'standard' | 'ironbow' | 'contrast';

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  media,
  onOpenLightbox,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [palette, setPalette] = useState<PaletteMode>('standard');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const width = rect.width;
      const percentage = Math.max(0, Math.min(100, (x / width) * 100));
      setSliderPosition(percentage);
    },
    []
  );

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const getFilterStyle = (): string => {
    if (palette === 'ironbow') {
      return 'contrast(1.3) saturate(1.8) hue-rotate(180deg)';
    }
    if (palette === 'contrast') {
      return 'contrast(1.6) brightness(1.1)';
    }
    return 'none';
  };

  return (
    <figure className="my-12 w-full select-none">
      {/* TACTICAL VIZOR RETICLE FRAME */}
      <div className="reticle-box relative border border-paper-300 dark:border-paper-800 rounded-lg bg-paper-200 dark:bg-paper-950 overflow-hidden shadow-paper-lg group">
        
        {/* Top Vizor HUD Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-paper-300/80 dark:border-white/10 bg-white/60 dark:bg-paper-900/80 backdrop-blur text-[10px] font-mono tracking-wider text-ink-500 dark:text-ink-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-tactical-emerald animate-ping" />
            <span className="font-semibold text-ink-900 dark:text-paper-100 uppercase">
              OPTİK VİZÖR TELEMETRİSİ // DUAL-BAND SENSÖR
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-tactical-blue">FOV: 42° H · 34° V</span>
            <span className="hidden sm:inline">·</span>
            <span className="text-tactical-amber">NUC: AUTO-SYNC</span>
          </div>
        </div>

        {/* Aspect Container with Crosshair Grid */}
        <div
          ref={containerRef}
          className="relative w-full aspect-[16/9] cursor-col-resize overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onClick={handleClick}
          style={{ filter: getFilterStyle() }}
        >
          {/* AFTER Image (Full background) */}
          <img
            src={media.afterUrl}
            alt={media.afterLabel}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />

          {/* BEFORE Image (Clipped with hardware accelerated CSS clipPath) */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
              WebkitClipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
            }}
          >
            <img
              src={media.beforeUrl}
              alt={media.beforeLabel}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          </div>

          {/* Divider Line with HUD Laser Indicator */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_12px_rgba(245,158,11,0.9)] z-20 pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            {/* Center Drag Knob with Reticle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink-950/90 border-2 border-white shadow-tactical-glow-amber flex items-center justify-center text-tactical-amber backdrop-blur-md">
              <SplitSquareVertical className="w-4 h-4 rotate-90" />
            </div>

            {/* Split Percentage Micro-HUD */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/80 border border-white/20 text-white font-mono text-[9px] whitespace-nowrap">
              %{Math.round(sliderPosition)}
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-3 left-3 z-30 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium tracking-wide bg-ink-950/85 text-paper-100 rounded-md backdrop-blur-md border border-white/10 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-paper-300" />
              <span>{media.beforeLabel}</span>
            </span>
          </div>

          <div className="absolute top-3 right-3 z-30 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium tracking-wide bg-tactical-blue/90 text-white rounded-md backdrop-blur-md border border-tactical-blue/40 shadow-tactical-glow-blue">
              <span className="w-1.5 h-1.5 rounded-full bg-tactical-emerald" />
              <span>{media.afterLabel}</span>
            </span>
          </div>

          {/* Fullscreen RAW View Button */}
          {onOpenLightbox && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLightbox(
                  sliderPosition > 50 ? media.beforeUrl : media.afterUrl,
                  sliderPosition > 50 ? media.beforeLabel : media.afterLabel,
                  media.caption
                );
              }}
              className="absolute bottom-3 right-3 z-30 p-2 rounded-md bg-ink-950/80 hover:bg-ink-950 text-white/80 hover:text-white transition-colors border border-white/15 backdrop-blur-md shadow-md opacity-90 group-hover:opacity-100"
              title="RAW Görseli Tam Ekran İncele"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Vizor Palette Simulation Toolbar */}
        <div className="px-4 py-2 border-t border-paper-300/80 dark:border-white/10 bg-white/70 dark:bg-paper-900/80 backdrop-blur flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-tactical-amber" />
            <span className="text-ink-500 dark:text-ink-400 text-[11px]">FLIR PALETİ:</span>
            <div className="flex items-center rounded-md bg-paper-200 dark:bg-paper-800 p-0.5 text-[10px]">
              <button
                onClick={() => setPalette('standard')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  palette === 'standard' ? 'bg-white dark:bg-paper-700 font-bold text-ink-950 dark:text-paper-50 shadow-sm' : 'text-ink-500'
                }`}
              >
                White-Hot
              </button>
              <button
                onClick={() => setPalette('ironbow')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  palette === 'ironbow' ? 'bg-tactical-amber text-ink-950 font-bold shadow-sm' : 'text-ink-500'
                }`}
              >
                Ironbow
              </button>
              <button
                onClick={() => setPalette('contrast')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  palette === 'contrast' ? 'bg-tactical-blue text-white font-bold shadow-sm' : 'text-ink-500'
                }`}
              >
                Yüksek Kontrast
              </button>
            </div>
          </div>

          <span className="text-[10px] text-ink-400 dark:text-ink-500">
            ↔ Sürgüyü yatay kaydırarak tespit farkını kıyaslayın
          </span>
        </div>
      </div>

      {/* Caption & Sürgü Talimatı */}
      <figcaption className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-sans text-ink-600 dark:text-ink-400">
        <span className="leading-relaxed">
          <strong className="text-ink-900 dark:text-paper-100 font-semibold mr-1">
            İnteraktif Kıyaslama:
          </strong>
          {media.caption}
        </span>
        <span className="font-mono text-[11px] text-tactical-blue dark:text-tactical-amber whitespace-nowrap bg-paper-200 dark:bg-paper-800 px-2 py-0.5 rounded">
          FLIR Calibrated Sensor Sync
        </span>
      </figcaption>
    </figure>
  );
};
