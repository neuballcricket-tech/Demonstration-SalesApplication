import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Select, type Option, type OptionGroup } from './Select'

const options: Option[] = [
  { value: 'air', label: 'Air Freight' },
  { value: 'ocean', label: 'Ocean Exports' },
  { value: 'road', label: 'Road Haulage', disabled: true },
]


describe('Select', () => {
  it("shows placeholder when value is ''", () => {
    render(<Select aria-label="Service" value="" onChange={() => {}} options={options} placeholder="Pick…" />)
    expect(screen.getByRole('button')).toHaveTextContent('Pick…')
  })

  it('selects with mouse', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Select aria-label="Service" value="" onChange={onChange} options={options} placeholder="Pick…" />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('option', { name: 'Ocean Exports' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('ocean')
  })

  it('selects with keyboard', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Select aria-label="Service" value="" onChange={onChange} options={options} placeholder="Pick…" />)
    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('ocean')
  })

  it('closes on Escape without onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Select aria-label="Service" value="" onChange={onChange} options={options} placeholder="Pick…" />)
    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('is controlled', () => {
    const { rerender } = render(<Select aria-label="Service" value="" onChange={() => {}} options={options} placeholder="Pick…" />)
    rerender(<Select aria-label="Service" value="air" onChange={() => {}} options={options} placeholder="Pick…" />)
    expect(screen.getByRole('button')).toHaveTextContent('Air Freight')
  })

  it('works with state and shows the chosen label', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [v, setV] = useState('')
      return <Select aria-label="Service" value={v} onChange={setV} options={options} placeholder="Pick…" />
    }
    render(<Harness />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('option', { name: 'Air Freight' }))
    expect(screen.getByRole('button')).toHaveTextContent('Air Freight')
  })

  it('keeps an unknown value: shows the raw string, no onChange, no throw', () => {
    const onChange = vi.fn()
    render(<Select aria-label="Service" value="LEGACY" onChange={onChange} options={options} placeholder="Pick…" />)
    expect(screen.getByRole('button')).toHaveTextContent('LEGACY')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not select a disabled option', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Select aria-label="Service" value="" onChange={onChange} options={options} />)
    await user.click(screen.getByRole('button'))
    const road = screen.getByRole('option', { name: 'Road Haulage' })
    expect(road).toHaveAttribute('aria-disabled', 'true')
    await user.click(road)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('disables the trigger with isDisabled', () => {
    render(<Select aria-label="Service" value="" onChange={() => {}} options={options} isDisabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders group headers when open', async () => {
    const groups: OptionGroup[] = [
      { label: 'Sea', options: [{ value: 'fcl', label: 'FCL' }] },
      { label: 'Sky', options: [{ value: 'air', label: 'Air' }] },
    ]
    const user = userEvent.setup()
    render(<Select aria-label="Mode" value="" onChange={() => {}} options={groups} />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Sea')).toBeInTheDocument()
    expect(screen.getByText('Sky')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'FCL' })).toBeInTheDocument()
  })

  it('has the shared control look and size modifier on the trigger; className goes on the root', () => {
    render(<Select aria-label="Service" value="" onChange={() => {}} options={options} controlSize="sm" className="extra" />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('ui-control', 'ui-control--sm', 'h-7', 'rounded-control')
    expect(btn.parentElement).toHaveClass('extra')
  })

  it('renders a visible label and an id on the trigger', () => {
    render(<Select label="Service" id="svc" value="" onChange={() => {}} options={options} />)
    expect(screen.getByRole('button', { name: /service/i })).toHaveAttribute('id', 'svc')
  })

  it('marks the trigger invalid', () => {
    render(<Select aria-label="Service" value="" onChange={() => {}} options={options} isInvalid />)
    const btn = screen.getByRole('button')
    expect(btn.parentElement).toHaveAttribute('data-invalid')
    expect(btn).toHaveClass('group-data-invalid:border-danger', 'group-data-invalid:focus-visible:border-danger')
  })
})
