import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Radio, RadioGroup } from './Radio'

function Controlled({ onChange, initial = 'air' }: { onChange: (v: string) => void; initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <RadioGroup
      label="Mode"
      value={value}
      onChange={(v) => {
        setValue(v)
        onChange(v)
      }}
    >
      <Radio value="air">Air</Radio>
      <Radio value="ocean">Ocean</Radio>
      <Radio value="road">Road</Radio>
    </RadioGroup>
  )
}

describe('RadioGroup', () => {
  it('is named by its label and checks the matching radio', () => {
    render(<Controlled onChange={() => {}} />)
    expect(screen.getByRole('radiogroup', { name: 'Mode' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Air' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Ocean' })).not.toBeChecked()
  })

  it('arrow keys move selection and call onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Controlled onChange={onChange} />)
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Air' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(onChange).toHaveBeenLastCalledWith('ocean')
    expect(screen.getByRole('radio', { name: 'Ocean' })).toBeChecked()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('road')
    await user.keyboard('{ArrowUp}')
    expect(onChange).toHaveBeenLastCalledWith('ocean')
  })

  it('click selects a radio, and clicking its label text selects it too', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Controlled onChange={onChange} />)
    await user.click(screen.getByText('Road'))
    expect(onChange).toHaveBeenCalledWith('road')
    expect(screen.getByRole('radio', { name: 'Road' })).toBeChecked()
  })

  it('a disabled group does not change', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <RadioGroup label="Mode" value="air" onChange={onChange} isDisabled>
        <Radio value="air">Air</Radio>
        <Radio value="ocean">Ocean</Radio>
      </RadioGroup>,
    )
    await user.click(screen.getByText('Ocean'))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: 'Ocean' })).toBeDisabled()
  })

  it('a disabled radio is skipped', () => {
    render(
      <RadioGroup label="Mode" value="air" onChange={() => {}}>
        <Radio value="air">Air</Radio>
        <Radio value="ocean" isDisabled>Ocean</Radio>
      </RadioGroup>,
    )
    expect(screen.getByRole('radio', { name: 'Ocean' })).toBeDisabled()
  })

  it('wires aria-describedby and aria-invalid, and forwards className/style/id', () => {
    render(
      <>
        <RadioGroup
          label="Mode"
          value=""
          onChange={() => {}}
          id="mode"
          aria-describedby="err"
          aria-invalid
          className="extra"
          style={{ marginTop: 3 }}
        >
          <Radio value="air">Air</Radio>
        </RadioGroup>
        <p id="err">Pick one</p>
      </>,
    )
    const group = screen.getByRole('radiogroup', { name: 'Mode' })
    expect(group).toHaveAccessibleDescription('Pick one')
    expect(group).toHaveAttribute('aria-invalid', 'true')
    expect(group).toHaveAttribute('id', 'mode')
    expect(group).toHaveClass('extra')
    expect(group.style.marginTop).toBe('3px')
  })

  it('supports aria-label when no visible label is given', () => {
    render(
      <RadioGroup aria-label="Mode" value="air" onChange={() => {}} orientation="horizontal">
        <Radio value="air">Air</Radio>
      </RadioGroup>,
    )
    expect(screen.getByRole('radiogroup', { name: 'Mode' })).toHaveAttribute('aria-orientation', 'horizontal')
  })
})
