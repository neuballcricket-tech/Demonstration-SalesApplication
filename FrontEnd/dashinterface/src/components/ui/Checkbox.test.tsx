import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox'

function Controlled({ onChange }: { onChange: (v: boolean) => void }) {
  const [checked, setChecked] = useState(false)
  return (
    <Checkbox
      checked={checked}
      onChange={(v) => {
        setChecked(v)
        onChange(v)
      }}
    >
      Hazardous
    </Checkbox>
  )
}

describe('Checkbox', () => {
  it('click toggles and calls onChange(true)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Controlled onChange={onChange} />)
    const box = screen.getByRole('checkbox', { name: 'Hazardous' })
    expect(box).not.toBeChecked()
    await user.click(box)
    expect(onChange).toHaveBeenCalledWith(true)
    expect(box).toBeChecked()
    await user.click(box)
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('Space toggles when focused', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Controlled onChange={onChange} />)
    await user.tab()
    expect(screen.getByRole('checkbox')).toHaveFocus()
    await user.keyboard(' ')
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('clicking the label text toggles', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Controlled onChange={onChange} />)
    await user.click(screen.getByText('Hazardous'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not toggle when disabled', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Checkbox checked={false} onChange={onChange} isDisabled>Hazardous</Checkbox>)
    await user.click(screen.getByText('Hazardous'))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('exposes the indeterminate state', () => {
    render(<Checkbox checked={false} onChange={() => {}} isIndeterminate aria-label="All" />)
    expect(screen.getByRole('checkbox', { name: 'All' })).toBePartiallyChecked()
  })

  it('forwards className/style to the root and id/name/aria-* to the input', () => {
    const { container } = render(
      <Checkbox
        checked
        onChange={() => {}}
        id="hz"
        name="hazardous"
        aria-label="Hazardous"
        aria-describedby="hint"
        className="extra"
        style={{ marginTop: 3 }}
      />,
    )
    const box = screen.getByRole('checkbox')
    expect(box).toHaveAttribute('id', 'hz')
    expect(box).toHaveAttribute('name', 'hazardous')
    expect(box).toHaveAttribute('aria-describedby', 'hint')
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass('extra')
    expect(root.style.marginTop).toBe('3px')
  })

  it('keeps the visually hidden input positioned inside the control in a scroll container', () => {
    render(
      <div className="overflow-x-auto">
        <Checkbox checked={false} onChange={() => {}} aria-label="Pick" />
      </div>,
    )
    const input = screen.getByRole('checkbox', { name: 'Pick' })
    // RAC wraps the input in an absolutely positioned span; it must resolve against the checkbox root,
    // not escape to the scroller (which widened the page in a scrolling table).
    const hidden = input.parentElement as HTMLElement
    expect(hidden.style.position).toBe('absolute')
    const positioned = (el: HTMLElement | null): HTMLElement | null => {
      for (let n = el; n; n = n.parentElement) if (n.classList.contains('relative') || (n.style.position && n.style.position !== 'static')) return n
      return null
    }
    expect(positioned(hidden.parentElement)).toBe(input.closest('label'))
  })

  it('lets a consumer position class replace the default relative root', () => {
    const { container } = render(<Checkbox checked={false} onChange={() => {}} aria-label="Pick" className="absolute" />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass('absolute')
    expect(root).not.toHaveClass('relative')
  })
})
