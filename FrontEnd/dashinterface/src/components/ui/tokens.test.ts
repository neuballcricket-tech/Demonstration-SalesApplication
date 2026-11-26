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
})
