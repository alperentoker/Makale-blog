/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FFFFFF',
          100: '#FBFBF9', // 2026 Warm linen/bone tactical paper
          150: '#F5F5F0', // Secondary warm substrate
          200: '#ECEAE3', // Subtle drafting surface
          300: '#DDD9CE', // Hairline tactile border
          400: '#C2BCAD',
          700: '#232836', // Elevated dark tactical surface
          750: '#1C212D', // Subtle dark card background
          800: '#171B26', // FLIR vizor elevated surface
          850: '#11141C', // Obsidian instrument deck
          900: '#0E1117', // Deep tactical vizor obsidian
          950: '#07080B', // Pitch black void
        },
        ink: {
          950: '#0A0B0E',
          900: '#111215', // Deep matte carbon ink
          800: '#1F2229',
          700: '#323642',
          600: '#4D5363',
          500: '#697184', // Telemetry annotation grey
          400: '#8E96AA',
          300: '#B6BDCD',
          200: '#DDE2ED',
          100: '#EEF1F7',
          50: '#F8FAFC',
        },
        tactical: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#829AB1',
          500: '#627D98',
          600: '#486581',
          700: '#334E68',
          800: '#102A43',
          900: '#0B1D3A',
          950: '#061024',
          obsidian: '#0E1117',  // Primary tactical visor obsidian
          blue: '#2563EB',      // Primary Telemetry Blue
          blueLight: '#DBEAFE',
          blueDark: '#1D4ED8',
          blueMuted: '#1E3A8A',
          amber: '#D97706',     // Thermal Amber
          amberLight: '#FEF3C7',
          amberDark: '#92400E',
          amberBright: '#F59E0B',// FLIR Ironbow Amber
          emerald: '#10B981',   // Sensor Lock Emerald
          emeraldLight: '#D1FAE5',
          emeraldDark: '#047857',
          cyan: '#06B6D4',      // Optic Reticle Cyan
          cyanLight: '#CFFAFE',
          crimson: '#EF4444',   // Laser Warning Crimson
          crimsonLight: '#FEE2E2',
          violet: '#8B5CF6',    // RF/Spectral Violet
        }
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'Menlo', 'monospace'],
      },
      maxWidth: {
        'prose-editorial': '100%',
        'wide-canvas': '1760px',
      },
      boxShadow: {
        'paper-sm': '0 1px 2px 0 rgba(17, 18, 21, 0.04)',
        'paper': '0 1px 3px 0 rgba(17, 18, 21, 0.06), 0 1px 2px -1px rgba(17, 18, 21, 0.04)',
        'paper-md': '0 4px 6px -1px rgba(17, 18, 21, 0.07), 0 2px 4px -2px rgba(17, 18, 21, 0.05)',
        'paper-lg': '0 10px 15px -3px rgba(17, 18, 21, 0.08), 0 4px 6px -4px rgba(17, 18, 21, 0.04)',
        'tactical-glow-blue': '0 0 20px -3px rgba(37, 99, 235, 0.35)',
        'tactical-glow-amber': '0 0 20px -3px rgba(245, 158, 11, 0.35)',
        'tactical-glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.35)',
        'glass-dock': '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'tactical-card': '0 1px 3px 0 rgba(17, 18, 21, 0.05), 0 1px 2px -1px rgba(17, 18, 21, 0.03)',
        'tactical-card-hover': '0 8px 24px -4px rgba(17, 18, 21, 0.08), 0 2px 6px -2px rgba(17, 18, 21, 0.04)',
      },
      backgroundImage: {
        'thermal-ironbow': 'linear-gradient(135deg, #061024 0%, #1e1b4b 25%, #7c2d12 50%, #d97706 75%, #fef08a 100%)',
        'thermal-amber-glow': 'radial-gradient(ellipse at 50% 0%, rgba(217, 119, 6, 0.12) 0%, transparent 70%)',
        'tactical-radar-glow': 'radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.08) 0%, transparent 65%)',
        'atmospheric-vignette': 'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.03) 0%, transparent 80%)',
      },
      animation: {
        'radar-sweep': 'sweep 4s linear infinite',
        'tactical-pulse': 'tacticalPulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        tacticalPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '72ch',
            color: '#121316',
            lineHeight: '1.78',
            fontSize: '1.125rem',
            p: {
              marginBottom: '1.4em',
            },
            h1: {
              fontFamily: 'Newsreader, Georgia, serif',
              fontWeight: '700',
              letterSpacing: '-0.02em',
              color: '#121316',
            },
            h2: {
              fontFamily: 'Newsreader, Georgia, serif',
              fontWeight: '600',
              letterSpacing: '-0.015em',
              color: '#121316',
              marginTop: '2em',
              marginBottom: '0.8em',
            },
            h3: {
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: '600',
              letterSpacing: '-0.01em',
              color: '#23262F',
              marginTop: '1.6em',
              marginBottom: '0.6em',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
