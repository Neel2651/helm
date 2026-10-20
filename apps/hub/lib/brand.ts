/**
 * Brand colours that have to exist outside CSS: the manifest, the viewport themeColor and
 * the next/og icon renderer are all build-time values that cannot read a CSS variable.
 * Keep in sync with the tokens in app/globals.css.
 */
export const BRAND = {
  teal: '#0e6e61',
  tealDark: '#0a5a4f',
  paper: '#f6f4ef',
  ink: '#22201b',
  paperDark: '#1a1815',
} as const;
