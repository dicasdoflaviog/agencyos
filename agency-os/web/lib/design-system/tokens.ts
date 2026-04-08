/**
 * Design tokens — Agency OS
 * Used server-side (API routes) where CSS variables are unavailable.
 * Derived from globals.css + design-system/agency-os/MASTER.md
 */
export const DS = {
  colors: {
    bgBase:        '#0C0C0E',
    bgSurface:     '#131317',
    bgElevated:    '#1C1C22',
    bgOverlay:     '#26262F',
    accent:        '#F59E0B',
    textPrimary:   '#F0F0F5',
    textSecondary: '#A0A0B8',
  },
  fonts: {
    heading: 'DM Sans',
    body:    'Inter',
  },
}

/**
 * Injected into every ATLAS background-image prompt.
 * Images must contain NO text — text is overlaid via CSS in CreativeRenderer.
 */
export const ATLAS_BG_PROMPT_PREFIX =
  `Cinematic dark background, branding colors ${DS.colors.bgBase} deep black and ${DS.colors.accent} amber gold. ` +
  `Minimal abstract textures, professional photography lighting, depth and atmosphere. ` +
  `NO TEXT, NO WORDS, NO TYPOGRAPHY, NO LETTERS anywhere in the image. `
