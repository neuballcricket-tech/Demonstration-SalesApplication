import { describe, expect, it } from 'vitest'
import { cn, tv } from './cn'

describe('cn', () => {
  it('later class wins', () => {
    expect(cn('h-8', 'h-10')).toBe('h-10')
  })

  it("custom font-size and colour tokens don't collide", () => {
    expect(cn('text-label', 'text-fg-label')).toBe('text-label text-fg-label')
    expect(cn('text-control', 'text-label')).toBe('text-label')
    expect(cn('text-fg', 'text-danger')).toBe('text-danger')
  })

  it('custom radius and shadow tokens conflict within their own group', () => {
    expect(cn('rounded-card', 'rounded-control')).toBe('rounded-control')
    expect(cn('shadow-popover', 'shadow-focus')).toBe('shadow-focus')
  })

  it('falsy inputs ignored', () => {
    expect(cn('h-8', false, null, undefined, '', 0, 'text-fg')).toBe('h-8 text-fg')
  })
})

describe('tv (project tailwind-variants)', () => {
  it('keeps both text-label and text-fg-label', () => {
    const label = tv({ base: 'text-label', variants: { tone: { muted: 'text-fg-label' } } })
    expect(label({ tone: 'muted' }).split(' ').sort()).toEqual(['text-fg-label', 'text-label'])
  })

  it('still merges conflicting custom tokens', () => {
    const box = tv({ base: 'rounded-card text-control' })
    expect(box({ class: 'rounded-control text-label' })).toBe('rounded-control text-label')
  })
})
