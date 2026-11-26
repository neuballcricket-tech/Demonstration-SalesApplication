import { resetLocalTimeZone } from '@internationalized/date'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { todayISO } from './date'

describe('todayISO', () => {
  beforeAll(() => {
    vi.stubEnv('TZ', 'Asia/Colombo')
    // @internationalized/date caches the local timezone, so drop it after changing TZ.
    resetLocalTimeZone()
  })
  afterAll(() => {
    vi.unstubAllEnvs()
    resetLocalTimeZone()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the local timezone, not UTC', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-26T20:00:00Z'))
    expect(todayISO()).toBe('2026-11-27')
  })
})
