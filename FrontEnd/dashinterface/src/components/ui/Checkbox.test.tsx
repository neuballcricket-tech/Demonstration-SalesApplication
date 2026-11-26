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
})
