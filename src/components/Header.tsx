import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { LensLogo } from './LensLogo';

interface HeaderProps {
  currentView: 'archive' | 'article';
  onNavigateArchive: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigateArchive,
  darkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="lens-global-header border-b border-paper-300/80 dark:border-paper-800/80 bg-paper-100/90 dark:bg-paper-900/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between gap-4">
        {/* Brand Monogram and Site Name */}
        <div
          onClick={onNavigateArchive}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <LensLogo className="w-8 h-8 shadow-paper-sm transition-transform group-hover:scale-105 duration-150" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-bold tracking-tight text-ink-950 dark:text-paper-50 leading-none group-hover:text-tactical-blue transition-colors">
                LENS
              </span>
              <span className="w-2 h-2 rounded-full bg-tactical-emerald animate-pulse" title="Sistem Aktif" />
            </div>
            <div className="font-mono text-xs tracking-wider text-ink-500 uppercase mt-1">
              lens.alperentoker.com
            </div>
          </div>
        </div>

        {/* Center / Navigation Links */}
        <nav className="hidden sm:flex items-center gap-7 font-mono text-sm text-ink-600 dark:text-ink-300">
          <button
            onClick={onNavigateArchive}
            className={`hover:text-ink-950 dark:hover:text-paper-100 transition-colors ${
              currentView === 'archive' ? 'text-tactical-blue font-bold' : 'font-medium'
            }`}
          >
            Arşiv
          </button>
        </nav>

        {/* Right Actions: Dark Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-full hover:bg-paper-200 dark:hover:bg-paper-800 text-ink-600 dark:text-ink-300 transition-colors"
            title={darkMode ? 'Açık Mod (Tactical Warm Paper)' : 'Koyu Mod (FLIR Obsidian)'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-tactical-amber" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
