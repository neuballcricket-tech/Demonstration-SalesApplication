import type { CSSProperties } from 'react'
import { COLOR } from '../ui/tokens'

// ---------------------------------------------------------------------------
// General Style Guide - shared inline-style constants
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

export const PAGE_TITLE_ICON: CSSProperties = { color: COLOR.primary }

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
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-fg-label)',
  marginBottom: 4,
  display: 'block',
}

export const INPUT_STYLE: CSSProperties = {
  width: '100%',
  minHeight: 32,
  padding: '6px 10px',
  fontSize: 13,
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-line)',
  background: '#fff',
  color: 'var(--text)',
}

/* ---- Tables ---- */

export const TABLE_TH: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  color: 'var(--color-fg-label)',
  height: 32,
  padding: '0 12px',
  textAlign: 'left',
  letterSpacing: '0.04em',
}

export const TABLE_TD: CSSProperties = {
  fontSize: 13,
  height: 36,
  padding: '0 12px',
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
