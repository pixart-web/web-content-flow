/**
 * Documentation-only design-token mapping for a future Tailwind theme.
 * This file does not initialize, import, or configure Tailwind.
 */
export const webContentFlowTheme = {
  colors: {
    brand: {
      blue: { 50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE", 300: "#93C5FD", 400: "#60A5FA", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8", 800: "#1E40AF", 900: "#1E3A8A", 950: "#172554" },
      indigo: { 50: "#EEF2FF", 100: "#E0E7FF", 200: "#C7D2FE", 300: "#A5B4FC", 400: "#818CF8", 500: "#4F46E5", 600: "#4338CA", 700: "#3730A3", 800: "#312E81", 900: "#1E1B4B", 950: "#111033" },
      purple: { 50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE", 300: "#C4B5FD", 400: "#A78BFA", 500: "#7C3AED", 600: "#6D28D9", 700: "#5B21B6", 800: "#4C1D95", 900: "#3B0764", 950: "#2E1065" }
    },
    neutral: { 0: "#FFFFFF", 50: "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0", 300: "#CBD5E1", 400: "#94A3B8", 500: "#64748B", 600: "#475569", 700: "#334155", 800: "#1E293B", 900: "#0F172A", 950: "#020617" },
    semantic: {
      text: { primary: "var(--color-text-primary)", secondary: "var(--color-text-secondary)", muted: "var(--color-text-muted)", inverse: "var(--color-text-inverse)", link: "var(--color-text-link)" },
      surface: { canvas: "var(--color-surface-canvas)", default: "var(--color-surface-default)", subtle: "var(--color-surface-subtle)", selected: "var(--color-surface-selected)", overlay: "var(--color-surface-overlay)" },
      border: { default: "var(--color-border-default)", strong: "var(--color-border-strong)", selected: "var(--color-border-selected)", focus: "var(--color-border-focus)" },
      action: { primary: "var(--color-action-primary)", primaryHover: "var(--color-action-primary-hover)", primaryActive: "var(--color-action-primary-active)", disabled: "var(--color-action-disabled)" },
      success: { DEFAULT: "#10B981", text: "#047857", surface: "#ECFDF5", border: "#A7F3D0" },
      warning: { DEFAULT: "#F59E0B", text: "#92400E", surface: "#FFFBEB", border: "#FDE68A" },
      error: { DEFAULT: "#EF4444", text: "#B91C1C", surface: "#FEF2F2", border: "#FECACA" },
      info: { DEFAULT: "#3B82F6", text: "#1D4ED8", surface: "#EFF6FF", border: "#BFDBFE" }
    }
  },
  fontFamily: {
    display: ["Poppins", "Avenir Next", "Segoe UI", "sans-serif"],
    sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
    mono: ["SFMono-Regular", "Consolas", "Liberation Mono", "monospace"]
  },
  fontSize: { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "2rem", "4xl": "2.5rem", "5xl": "3.25rem", "6xl": "4rem" },
  spacing: { 0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem", 5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem", 20: "5rem", 24: "6rem", 32: "8rem" },
  borderRadius: { none: "0", sm: "0.375rem", control: "0.5rem", card: "0.75rem", panel: "1rem", overlay: "1rem", full: "9999px" },
  boxShadow: {
    card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
    raised: "0 8px 24px rgba(15, 23, 42, 0.10)",
    overlay: "0 20px 50px rgba(15, 23, 42, 0.18)",
    focus: "var(--shadow-focus)"
  },
  transitionDuration: { fast: "120ms", normal: "180ms", moderate: "240ms", slow: "360ms" },
  transitionTimingFunction: { standard: "cubic-bezier(0.2, 0, 0, 1)", enter: "cubic-bezier(0, 0, 0.2, 1)", exit: "cubic-bezier(0.4, 0, 1, 1)" },
  screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1536px" },
  maxWidth: { prose: "720px", editor: "960px", marketing: "1120px", "marketing-wide": "1280px", app: "1440px" },
  zIndex: { base: "0", sticky: "100", dropdown: "300", overlay: "400", modal: "500", toast: "600", tooltip: "700" }
} as const;

export type WebContentFlowTheme = typeof webContentFlowTheme;
