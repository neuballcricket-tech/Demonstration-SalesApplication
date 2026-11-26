import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from 'react-aria-components'
import { useState } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { todayISO } from '../../lib/date'
import { DatePicker } from './DatePicker'
import { Field } from './Field'

const wrap = (ui: React.ReactNode) => <I18nProvider locale="en-GB">{ui}</I18nProvider>

function Harness({ initial, onChange }: { initial: string; onChange: (v: string) => void }) {
  const [v, setV] = useState(initial)
  return (
    <DatePicker
      aria-label="Date"
      value={v}
      onChange={(next) => {
        setV(next)
        onChange(next)
      }}
    />
  )
}

const clearSegment = async (user: ReturnType<typeof userEvent.setup>, seg: HTMLElement, presses: number) => {
  await user.click(seg)
  await user.keyboard('{Backspace}'.repeat(presses))
}

const segments = () => screen.getAllByRole('spinbutton')
const segmentTexts = () => segments().map((s) => s.textContent)

describe('DatePicker', () => {
  it('displays dd/mm/yyyy', () => {
    render(wrap(<DatePicker aria-label="Date" value="2026-11-26" onChange={() => {}} />))
    expect(segmentTexts()).toEqual(['26', '11', '2026'])
  })

  it('picking a day emits ISO', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(wrap(<DatePicker aria-label="Date" value="2026-11-26" onChange={onChange} />))
    await user.click(screen.getByRole('button', { name: /calendar/i }))
    const grid = screen.getByRole('grid')
    await user.click(within(grid).getByText('15'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('2026-11-15')
  })

  it('typing segments emits ISO', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(wrap(<Harness initial="" onChange={onChange} />))
    await user.click(segments()[0])
    await user.keyboard('01122026')
    expect(onChange).toHaveBeenLastCalledWith('2026-12-01')
  })

  it('clear emits an empty string', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(wrap(<Harness initial="2026-11-26" onChange={onChange} />))
    const [day, month, year] = segments()
    await clearSegment(user, day, 2)
    await clearSegment(user, month, 2)
    await clearSegment(user, year, 4)
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('does not emit an invalid string for a partially typed date', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(wrap(<DatePicker aria-label="Date" value="" onChange={onChange} />))
    await user.click(segments()[0])
    await user.keyboard('0112')
    expect(onChange).not.toHaveBeenCalled()
  })

  it("does not emit '' when only one segment of a complete date is cleared", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(wrap(<Harness initial="2026-11-26" onChange={onChange} />))
    await clearSegment(user, segments()[0], 2)
    // The first Backspace leaves day "2" (a complete date, so it is emitted like a native input);
    // the second empties the day only, which must not emit '' while month and year are still filled.
    expect(onChange.mock.calls).toEqual([['2026-11-02']])
  })

  it('accepts a datetime string and does not call onChange on mount', () => {
    const onChange = vi.fn()
    render(wrap(<DatePicker aria-label="Date" value="2026-11-26T10:00:00Z" onChange={onChange} />))
    expect(segmentTexts()).toEqual(['26', '11', '2026'])
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each([['abc'], [null], [undefined], ['']])('tolerates an invalid value (%s)', (value) => {
    const onChange = vi.fn()
    render(wrap(<DatePicker aria-label="Date" value={value} onChange={onChange} />))
    expect(segmentTexts().join('')).toBe('ddmmyyyy')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('disables days outside minValue/maxValue', async () => {
    const user = userEvent.setup()
    render(wrap(<DatePicker aria-label="Date" value="2026-11-15" minValue="2026-11-10" maxValue="2026-11-20" onChange={() => {}} />))
    await user.click(screen.getByRole('button', { name: /calendar/i }))
    const grid = screen.getByRole('grid')
    expect(within(grid).getByRole('button', { name: /, 9 November 2026$/ })).toHaveAttribute('aria-disabled', 'true')
    expect(within(grid).getByRole('button', { name: /, 21 November 2026$/ })).toHaveAttribute('aria-disabled', 'true')
    expect(within(grid).getByRole('button', { name: /, 12 November 2026$/ })).not.toHaveAttribute('aria-disabled')
  })

  it('ignores an invalid minValue', async () => {
    const user = userEvent.setup()
    render(wrap(<DatePicker aria-label="Date" value="2026-11-15" minValue="nope" onChange={() => {}} />))
    await user.click(screen.getByRole('button', { name: /calendar/i }))
    expect(within(screen.getByRole('grid')).getByRole('button', { name: /, 1 November 2026$/ })).not.toHaveAttribute('aria-disabled')
  })

  it('is controlled', () => {
    const { rerender } = render(wrap(<DatePicker aria-label="Date" value="2026-11-26" onChange={() => {}} />))
    rerender(wrap(<DatePicker aria-label="Date" value="2027-01-02" onChange={() => {}} />))
    expect(segmentTexts()).toEqual(['02', '01', '2027'])
  })

  it('applies className and style to the root', () => {
    const { container } = render(wrap(<DatePicker aria-label="Date" value="" onChange={() => {}} className="w-40" style={{ opacity: 0.5 }} />))
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass('w-40')
    expect(root.style.opacity).toBe('0.5')
  })

  it('marks the field group with ui-control and does not force a cursor', () => {
    render(wrap(<DatePicker aria-label="Date" value="" onChange={() => {}} />))
    const group = screen.getByRole('group')
    expect(group).toHaveClass('ui-control')
    expect(group.className).not.toMatch(/cursor-/)
    expect(screen.getByRole('button', { name: /calendar/i }).className).not.toMatch(/cursor-/)
  })

  it('is named by Field label and described by its hint', () => {
    render(
      wrap(
        <Field label="Valid until" hint="Pick a date">
          {(ids) => <DatePicker {...ids} value="" onChange={() => {}} />}
        </Field>,
      ),
    )
    const group = screen.getByRole('group', { name: /valid until/i })
    expect(group).toHaveAccessibleDescription('Pick a date')
  })

  it('shows the invalid state from Field error', () => {
    render(
      wrap(
        <Field label="Valid until" error="Required">
          {(ids) => <DatePicker {...ids} value="" onChange={() => {}} />}
        </Field>,
      ),
    )
    const group = screen.getByRole('group', { name: /valid until/i })
    expect(group.parentElement).toHaveAttribute('data-invalid')
    expect(group).toHaveAccessibleDescription('Required')
  })
})

describe('todayISO', () => {
  beforeAll(() => {
    vi.stubEnv('TZ', 'Asia/Colombo')
  })
  afterAll(() => {
    vi.unstubAllEnvs()
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
