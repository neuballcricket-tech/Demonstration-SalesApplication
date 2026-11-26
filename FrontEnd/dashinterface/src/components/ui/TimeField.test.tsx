import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from 'react-aria-components'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Field } from './Field'
import { TimeField } from './TimeField'

const wrap = (ui: React.ReactNode) => <I18nProvider locale="en-GB">{ui}</I18nProvider>
function Harness({ initial, onChange }: { initial: string; onChange: (v: string) => void }) {
  const [v, setV] = useState(initial)
  return (
    <TimeField
      aria-label="Time"
      value={v}
      onChange={(next) => {
        setV(next)
        onChange(next)
      }}
    />
  )
}

const segments = () => screen.getAllByRole('spinbutton')
const segmentTexts = () => segments().map((s) => s.textContent)

describe('TimeField', () => {
  it('displays 24-hour HH:mm', () => {
    render(wrap(<TimeField aria-label="Time" value="09:30" onChange={() => {}} />))
    expect(segmentTexts()).toEqual(['09', '30'])
  })

  it('typing emits HH:mm', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(wrap(<Harness initial="" onChange={onChange} />))
    await user.click(segments()[0])
    await user.keyboard('1445')
    expect(onChange).toHaveBeenLastCalledWith('14:45')
  })

  it('clear emits an empty string', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(wrap(<Harness initial="09:30" onChange={onChange} />))
    for (const seg of segments()) {
      await user.click(seg)
      await user.keyboard('{Backspace}{Backspace}')
    }
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('does not emit for a partially typed time', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(wrap(<TimeField aria-label="Time" value="" onChange={onChange} />))
    await user.click(segments()[0])
    await user.keyboard('14')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clears a partially filled time when focus leaves the field', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(wrap(<Harness initial="09:30" onChange={onChange} />))
    await user.click(segments()[1])
    await user.keyboard('{Backspace}{Backspace}')
    await user.tab()
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(segmentTexts().join('')).toBe('––––')
  })

  it('does not emit on blur for a complete time', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(wrap(<Harness initial="09:30" onChange={onChange} />))
    await user.click(segments()[0])
    await user.tab()
    await user.tab()
    expect(onChange).not.toHaveBeenCalled()
    expect(segmentTexts()).toEqual(['09', '30'])
  })

  it.each([['abc'], ['']])('tolerates an invalid value (%s) without onChange', (value) => {
    const onChange = vi.fn()
    render(wrap(<TimeField aria-label="Time" value={value} onChange={onChange} />))
    expect(segmentTexts().join('')).toBe('––––')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('is controlled', () => {
    const { rerender } = render(wrap(<TimeField aria-label="Time" value="09:30" onChange={() => {}} />))
    rerender(wrap(<TimeField aria-label="Time" value="23:05" onChange={() => {}} />))
    expect(segmentTexts()).toEqual(['23', '05'])
  })

  it('applies className/style to the root and marks the group ui-control', () => {
    const { container } = render(wrap(<TimeField aria-label="Time" value="" onChange={() => {}} className="w-24" style={{ opacity: 0.5 }} />))
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass('w-24')
    expect(root.style.opacity).toBe('0.5')
    expect(screen.getByRole('group')).toHaveClass('ui-control')
  })

  it('is named by Field label and described by its hint', () => {
    render(
      wrap(
        <Field label="Pickup time" hint="24-hour">
          {(ids) => <TimeField {...ids} value="" onChange={() => {}} />}
        </Field>,
      ),
    )
    const group = screen.getByRole('group', { name: /pickup time/i })
    expect(group).toHaveAccessibleDescription('24-hour')
  })

  it('shows the invalid state from Field error', () => {
    render(
      wrap(
        <Field label="Pickup time" error="Required">
          {(ids) => <TimeField {...ids} value="" onChange={() => {}} />}
        </Field>,
      ),
    )
    const group = screen.getByRole('group', { name: /pickup time/i })
    expect(group.parentElement).toHaveAttribute('data-invalid')
    expect(group).toHaveAccessibleDescription('Required')
  })
})
