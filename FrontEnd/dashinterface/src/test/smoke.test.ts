import { describe, expect, it } from 'vitest'

describe('test infrastructure', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('has jsdom and jest-dom matchers wired', () => {
    expect(document.body).toBeInTheDocument()
  })
})
