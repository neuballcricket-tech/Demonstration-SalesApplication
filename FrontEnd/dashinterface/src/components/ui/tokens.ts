// Design tokens for places that need a JS value (charts, runtime styles).
// Keep in sync with the @theme block in src/styles/app.css.
export const COLOR = { primary: '#2c2c82', primaryHover: '#24246e', primaryStrong: '#1f1f6b', primarySubtle: '#eef0fb', accent: '#0c7690', accentOnDark: '#5eead4', text: '#111827', label: '#374151', muted: '#6b7280', border: '#c7cad6', danger: '#b91c1c', success: '#15803d', warning: '#b45309' } as const

export const CHART_SERIES = [COLOR.primary, COLOR.accent, '#7c3aed', '#b45309', '#15803d', '#b91c1c'] as const
