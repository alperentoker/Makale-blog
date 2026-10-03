import React from 'react';

interface LensLogoProps {
  className?: string;
  size?: number;
}

export const LensLogo: React.FC<LensLogoProps> = ({ className = 'w-8 h-8', size = 32 }) => {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background container */}
        <rect width="32" height="32" rx="6" className="fill-ink-900 dark:fill-paper-100" />
        
        {/* Outer Optical Lens Ring */}
        <circle
          cx="16"
          cy="16"
          r="9.5"
          className="stroke-paper-100 dark:stroke-ink-900"
          strokeWidth="1.6"
        />
        
        {/* Inner Focal Core */}
        <circle
          cx="16"
          cy="16"
          r="4.2"
          className="stroke-tactical-500"
          strokeWidth="1.6"
        />

        {/* Optical Axis Crosshairs / Alignment Marks */}
        <line x1="16" y1="3" x2="16" y2="5.5" className="stroke-paper-100 dark:stroke-ink-900" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="16" y1="26.5" x2="16" y2="29" className="stroke-paper-100 dark:stroke-ink-900" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="3" y1="16" x2="5.5" y2="16" className="stroke-paper-100 dark:stroke-ink-900" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="26.5" y1="16" x2="29" y2="16" className="stroke-paper-100 dark:stroke-ink-900" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
};
