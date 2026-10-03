import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2 } from 'lucide-react';

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  caption?: string;
  telemetry?: string;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  caption,
  telemetry,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setScale(s => Math.min(4, s + 0.25));
      if (e.key === '-' || e.key === '_') setScale(s => Math.max(0.5, s - 0.25));
      if (e.key === '0') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink-950/95 backdrop-blur-md text-white select-none animate-in fade-in duration-150"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-ink-950/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-tactical-800 text-[11px] font-mono tracking-wider text-blue-200">
            <Maximize2 className="w-3 h-3" />
            <span>YÜKSEK ÇÖZÜNÜRLÜK (RAW)</span>
          </div>
          <h2 className="text-sm font-medium tracking-tight text-white/90 truncate max-w-xl">
            {title}
          </h2>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded border border-white/15 bg-white/5 p-1 gap-1">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
              className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Uzaklaş (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs px-2 text-white/70 min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(4, s + 0.25))}
              className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Yaklaş (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Sıfırla (0)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <a
            href={imageUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-white/15 bg-white/5 hover:bg-white/10 text-white/90 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>İndir</span>
          </a>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors ml-2"
            title="Kapat (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <div
        className={`flex-1 flex items-center justify-center p-6 overflow-hidden ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
        onMouseDown={handleMouseDown}
        onDoubleClick={resetZoom}
      >
        <img
          src={imageUrl}
          alt={title}
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            maxHeight: '80vh',
            maxWidth: '90vw',
          }}
          className="object-contain shadow-2xl rounded-sm border border-white/10 pointer-events-auto"
        />
      </div>

      {/* Bottom Technical Caption */}
      <footer className="px-6 py-3.5 border-t border-white/10 bg-ink-950/80 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
        <div className="text-white/70 max-w-3xl">
          {caption || 'Detaylı inceleme için görseli kaydırabilir veya çift tıklayarak yakınlaştırabilirsiniz.'}
        </div>
        {telemetry && (
          <div className="font-mono text-tactical-amber text-[11px] whitespace-nowrap bg-black/40 px-2.5 py-1 rounded border border-amber-500/20">
            {telemetry}
          </div>
        )}
      </footer>
    </div>
  );
};
