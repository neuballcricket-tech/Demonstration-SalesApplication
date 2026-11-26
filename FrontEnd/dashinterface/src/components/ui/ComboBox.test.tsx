import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ComboBox } from './ComboBox'
import { Field } from './Field'

const items = [
  { value: 'LKCMB', label: 'Colombo', description: 'Sri Lanka' },
  { value: 'CNSHA', label: 'Shanghai', description: 'China' },
  { value: 'INCOK', label: 'Cochin', description: 'India' },
  { value: 'free', label: undefined },
]

function Harness({ onChange = () => {}, initial = '', ...rest }: Partial<Parameters<typeof ComboBox>[0]> & { initial?: string }) {
  const [v, setV] = useState(initial)
  return (
    <ComboBox
      aria-label="Port"
      items={items}
      {...rest}
      value={v}
      onChange={(x) => {
        onChange(x)
        setV(x)
      }}
    />
  )
}

describe('ComboBox', () => {
  it('typing calls onChange per keystroke', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'col')
    expect(onChange).toHaveBeenCalledTimes(3)
    expect(onChange).toHaveBeenLastCalledWith('col')
  })

  it('picking an item sets its value', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'col')
    onChange.mockClear()
    await user.click(screen.getByRole('option', { name: /Colombo/ }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('LKCMB')
    expect(screen.getByRole('combobox')).toHaveValue('LKCMB')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })

  it('free text is kept on blur when allowsCustomValue', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'XYZ')
    await user.tab()
    expect(onChange).toHaveBeenLastCalledWith('XYZ')
    expect(screen.getByRole('combobox')).toHaveValue('XYZ')
  })

  it('filters by label, case-insensitively', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByRole('combobox'), 'CO')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['ColomboSri Lanka', 'CochinIndia'])
  })

  it('filters by description', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByRole('combobox'), 'china')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option', { name: /Shanghai/ })).toBeInTheDocument()
  })

  it('also matches the typed text against the value', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByRole('combobox'), 'LKCMB')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option', { name: /Colombo/ })).toBeInTheDocument()
  })

  it('after a pick, the input shows the value and the chevron lists the item', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByRole('combobox'), 'col')
    await user.click(screen.getByRole('option', { name: /Colombo/ }))
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(screen.getByRole('combobox')).toHaveValue('LKCMB')
    await user.click(screen.getByRole('button', { hidden: true }))
    expect(screen.getByRole('option', { name: /Colombo/ })).toBeInTheDocument()
  })

  it('typing text equal to an item value keeps the list open', async () => {
    const user = userEvent.setup()
    const acme = [{ value: 'Acme' }, { value: 'Acme Logistics' }]
    render(<Harness items={acme} />)
    await user.type(screen.getByRole('combobox'), 'Acme')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('can pick the same item again after the parent clears the value', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    function Clearable() {
      const [v, setV] = useState('')
      return (
        <>
          <ComboBox aria-label="Port" items={items} value={v} onChange={(x) => { onChange(x); setV(x) }} />
          <button onClick={() => setV('')}>clear</button>
        </>
      )
    }
    render(<Clearable />)
    await user.type(screen.getByRole('combobox'), 'col')
    await user.click(screen.getByRole('option', { name: /Colombo/ }))
    await user.click(screen.getByRole('button', { name: 'clear' }))
    expect(screen.getByRole('combobox')).toHaveValue('')
    onChange.mockClear()
    await user.type(screen.getByRole('combobox'), 'col')
    await user.click(screen.getByRole('option', { name: /Colombo/ }))
    expect(onChange).toHaveBeenLastCalledWith('LKCMB')
    expect(screen.getByRole('combobox')).toHaveValue('LKCMB')
  })

  it('allowsCustomValue=false: free text reverts to empty on blur', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} allowsCustomValue={false} />)
    await user.type(screen.getByRole('combobox'), 'XYZ')
    await user.tab()
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('allowsCustomValue=false: editing after a pick reverts to the picked value on blur', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} allowsCustomValue={false} />)
    await user.type(screen.getByRole('combobox'), 'sha')
    await user.click(screen.getByRole('option', { name: /Shanghai/ }))
    await user.type(screen.getByRole('combobox'), 'x')
    await user.tab()
    expect(onChange).toHaveBeenLastCalledWith('CNSHA')
    expect(screen.getByRole('combobox')).toHaveValue('CNSHA')
  })

  it('allowsCustomValue=false: a valid value is kept on blur, including an initial one', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} allowsCustomValue={false} initial="LKCMB" />)
    await user.type(screen.getByRole('combobox'), 'x')
    await user.tab()
    expect(onChange).toHaveBeenLastCalledWith('LKCMB')
    expect(screen.getByRole('combobox')).toHaveValue('LKCMB')
  })

  it('falls back to value as the label when label is missing', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'fre')
    await user.click(screen.getByRole('option', { name: 'free' }))
    expect(onChange).toHaveBeenLastCalledWith('free')
  })

  it('Escape closes the list and keeps the text', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByRole('combobox'), 'col')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(screen.getByRole('combobox')).toHaveValue('col')
  })

  it('picks with the keyboard', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'sh')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('CNSHA')
  })

  it('is controlled and shows the value string', () => {
    const { rerender } = render(<ComboBox aria-label="Port" items={items} value="" onChange={() => {}} />)
    rerender(<ComboBox aria-label="Port" items={items} value="LKCMB" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveValue('LKCMB')
  })

  it('keeps the typed text when items change', async () => {
    const user = userEvent.setup()
    function Dynamic() {
      const [v, setV] = useState('')
      const [list, setList] = useState(items)
      return (
        <>
          <ComboBox aria-label="Port" items={list} value={v} onChange={setV} />
          <button onClick={() => setList(items.slice(0, 1))}>swap</button>
        </>
      )
    }
    render(<Dynamic />)
    await user.type(screen.getByRole('combobox'), 'sh')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'swap' }))
    expect(screen.getByRole('combobox')).toHaveValue('sh')
  })

  it('calls onInputChange with the text', async () => {
    const onInputChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onInputChange={onInputChange} />)
    await user.type(screen.getByRole('combobox'), 'ab')
    expect(onInputChange).toHaveBeenLastCalledWith('ab')
  })

  it('opens on focus with menuTrigger="focus"', async () => {
    const user = userEvent.setup()
    render(<Harness menuTrigger="focus" />)
    await user.tab()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('does not open on focus by default', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('has the shared control look; className goes on the root; id and placeholder on the input', () => {
    render(<ComboBox aria-label="Port" id="port" placeholder="Find…" items={items} value="" onChange={() => {}} controlSize="sm" className="extra" />)
    const input = screen.getByRole('combobox')
    expect(input).toHaveClass('ui-control', 'ui-control--sm', 'h-7', 'rounded-control')
    expect(input).toHaveAttribute('id', 'port')
    expect(input).toHaveAttribute('placeholder', 'Find…')
    expect(input.closest('.extra')).not.toBeNull()
    expect(input.className).not.toMatch(/cursor-|outline-none/)
  })

  it('forwards autoFocus', () => {
    render(<ComboBox aria-label="Port" autoFocus items={items} value="" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveFocus()
  })

  it('disables the input with isDisabled', () => {
    render(<ComboBox aria-label="Port" isDisabled items={items} value="" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('renders a visible label', () => {
    render(<ComboBox label="Port" items={items} value="" onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: /port/i })).toBeInTheDocument()
  })

  it('is named by Field label and described by its hint', () => {
    render(
      <Field label="Port" hint="Type to search">
        {(ids) => <ComboBox {...ids} items={items} value="" onChange={() => {}} />}
      </Field>,
    )
    const input = screen.getByRole('combobox', { name: /port/i })
    expect(input).toHaveAccessibleDescription('Type to search')
  })

  it('shows the invalid state from Field error', () => {
    render(
      <Field label="Port" error="Required">
        {(ids) => <ComboBox {...ids} items={items} value="" onChange={() => {}} />}
      </Field>,
    )
    const input = screen.getByRole('combobox', { name: /port/i })
    expect(input).toBeInvalid()
    expect(input).toHaveClass('group-data-invalid:border-danger')
    expect(input).toHaveAccessibleDescription('Required')
  })

  it('marks invalid with isInvalid', () => {
    render(<ComboBox aria-label="Port" isInvalid items={items} value="" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toBeInvalid()
  })
})
