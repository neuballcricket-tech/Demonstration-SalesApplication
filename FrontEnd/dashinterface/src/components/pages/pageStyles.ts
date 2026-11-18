import type { CSSProperties } from 'react'

// ---------------------------------------------------------------------------
// General Style Guide — shared inline-style constants
// Reference: GENERAL_STYLE_GUIDE.md  /  TrackAndTrace.tsx
// ---------------------------------------------------------------------------

/* ---- Page wrapper ---- */

export const PAGE_WRAPPER: CSSProperties = {
  padding: 24,
  maxWidth: 1200,
  margin: '0 auto',
}

/** Wider variant for pivot-table / data-heavy pages */
export const PAGE_WRAPPER_WIDE: CSSProperties = {
  padding: 24,
  maxWidth: 1400,
  margin: '0 auto',
}

/* ---- Page title ---- */

export const PAGE_TITLE_ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 16,
}

export const PAGE_TITLE_ICON: CSSProperties = { color: '#0f8fa8' }

export const PAGE_TITLE_H2: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--text)',
}

/* ---- Card ---- */

export const CARD: CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 18,
  background: 'var(--bg-card, #fff)',
}

/* ---- Section label (uppercase, inside a card) ---- */

export const SECTION_LABEL: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  letterSpacing: 0.3,
  textTransform: 'uppercase',
  marginBottom: 10,
}

/* ---- Form fields ---- */

export const FIELD_LABEL: CSSProperties = {
  fontSize: 10,
  color: 'var(--text-muted)',
  marginBottom: 3,
  display: 'block',
}

export const INPUT_STYLE: CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  fontSize: 12,
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg-card, #fff)',
  color: 'var(--text)',
  outline: 'none',
}

/* ---- Tables ---- */

export const TABLE_TH: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  padding: '8px 10px',
  textAlign: 'left',
  letterSpacing: 0.3,
}

export const TABLE_TD: CSSProperties = {
  fontSize: 12,
  padding: '8px 10px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text)',
}

/* ---- Empty / loading states ---- */

export const EMPTY_STATE: CSSProperties = {
  textAlign: 'center',
  padding: '40px 16px',
  color: 'var(--text-muted)',
  fontSize: 12,
}

export const LOADING_STATE: CSSProperties = {
  textAlign: 'center',
  padding: 32,
  color: 'var(--text-muted)',
}

/* ---- Button area (right-aligned, below a card) ---- */

export const BUTTON_ROW: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 14,
}

/* ---- Input grid (2-column form layout) ---- */

export const INPUT_GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  marginBottom: 14,
}
