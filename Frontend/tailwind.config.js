/**
 * @type {import('tailwindcss').Config}
 */
export default {
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#FFFFFF',
          foreground: '#1A1A1A',
          secondary: '#F9F9F9',
          muted: '#F5F5F5',
        },
        brand: {
          DEFAULT: '#000000',
          foreground: '#FFFFFF',
          soft: '#333333',
          light: '#666666',
        },
        muted: {
          DEFAULT: '#E5E5E5',
          foreground: '#737373',
        },
        accent: {
          DEFAULT: '#CFAE5C', // Gold/Tan accent from Noor E Adah
          foreground: '#FFFFFF',
          soft: '#B0954F',
        },
        info: {
          DEFAULT: '#4A5568',
          soft: '#E2E8F0',
        },
        warning: {
          DEFAULT: '#D69E2E',
          soft: '#FEFCBF',
        },
        success: {
          DEFAULT: '#2F855A',
          soft: '#C6F6D5',
        },
        danger: {
          DEFAULT: '#C53030',
          soft: '#FED7D7',
        },
      },
      fontFamily: {
        sans: ['"Outfit"', 'system-ui', 'Segoe UI', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '32px',
        full: '9999px',
      },
      boxShadow: {
        premium: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'premium-hover': '0 10px 30px -4px rgba(0, 0, 0, 0.1)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      },
      transitionTimingFunction: {
        'luxury': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
