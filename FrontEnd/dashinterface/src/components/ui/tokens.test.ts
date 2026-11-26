import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHART_SERIES, COLOR } from './tokens'

// WCAG 2.x relative luminance and contrast ratio
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('tokens', () => {
  it('matches spec values', () => {
    expect(COLOR.primary).toBe('#2c2c82')
    expect(COLOR.primaryStrong).toBe('#1f1f6b')
    expect(CHART_SERIES[0]).toBe(COLOR.primary)
  })

  it('text tokens meet 4.5:1 on white', () => {
    const keys = ['text', 'label', 'muted', 'accent', 'danger', 'success', 'warning', 'primary'] as const
    for (const key of keys) {
      expect(contrast(COLOR[key], '#ffffff'), key).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('COLOR hex values match the @theme block in app.css', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../styles/app.css'), 'utf8')
    const theme = (name: string) => new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(css)?.[1]
    const pairs: Record<string, string> = {
      primary: COLOR.primary,
      'primary-hover': COLOR.primaryHover,
      'primary-strong': COLOR.primaryStrong,
      'primary-subtle': COLOR.primarySubtle,
      accent: COLOR.accent,
      'accent-on-dark': COLOR.accentOnDark,
      fg: COLOR.text,
      'fg-label': COLOR.label,
      'fg-muted': COLOR.muted,
      line: COLOR.border,
      danger: COLOR.danger,
      success: COLOR.success,
      warning: COLOR.warning,
    }
    for (const [name, hex] of Object.entries(pairs)) {
      expect(theme(name)?.toLowerCase(), name).toBe(hex.toLowerCase())
    }
  })
})
