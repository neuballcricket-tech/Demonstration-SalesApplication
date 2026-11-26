import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('later class wins', () => {
    expect(cn('h-8', 'h-10')).toBe('h-10')
  })

  it("custom font-size and colour tokens don't collide", () => {
    expect(cn('text-label', 'text-fg-label')).toBe('text-label text-fg-label')
    expect(cn('text-control', 'text-label')).toBe('text-label')
    expect(cn('text-fg', 'text-danger')).toBe('text-danger')
  })

  it('falsy inputs ignored', () => {
    expect(cn('h-8', false, null, undefined, '', 0, 'text-fg')).toBe('h-8 text-fg')
  })
})
