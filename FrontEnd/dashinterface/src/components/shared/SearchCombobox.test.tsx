import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import SearchCombobox, { type SearchItem } from './SearchCombobox'

const clients: SearchItem[] = [
  { label: 'Acme Ltd', sublabel: 'Colombo' },
  { label: 'Blue Star', sublabel: 'Kandy' },
  { label: 'Acorn Traders' },
]

function Harness({ items = clients, onChange = () => {} }: { items?: SearchItem[]; onChange?: (v: string) => void }) {
  const [v, setV] = useState('')
  return (
    <SearchCombobox
      items={items}
      value={v}
      onChange={(x) => {
        onChange(x)
        setV(x)
      }}
      placeholder="Type or select customer"
    />
  )
}

describe('SearchCombobox', () => {
  it('is a combobox named by its placeholder', () => {
    render(<Harness />)
    expect(screen.getByRole('combobox', { name: 'Type or select customer' })).toBeInTheDocument()
  })

  it('shows all items on focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('combobox'))
    expect(await screen.findAllByRole('option')).toHaveLength(3)
  })

  it('sublabel shown as description', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByRole('combobox'), 'acme')
    const option = screen.getByRole('option', { name: 'Acme Ltd' })
    expect(option).toHaveAccessibleDescription('Colombo')
  })

  it('typing calls onChange with the text', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'Ne')
    expect(onChange).toHaveBeenLastCalledWith('Ne')
  })

  it('filters on label and sublabel', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByRole('combobox'), 'kandy')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option', { name: 'Blue Star' })).toBeInTheDocument()
  })

  it('selecting an item fills its label', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'ac')
    onChange.mockClear()
    await user.click(screen.getByRole('option', { name: 'Acorn Traders' }))
    expect(onChange).toHaveBeenCalledWith('Acorn Traders')
    expect(screen.getByRole('combobox')).toHaveValue('Acorn Traders')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })

  it('selecting with the keyboard fills its label', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'blue')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('Blue Star')
    expect(screen.getByRole('combobox')).toHaveValue('Blue Star')
  })

  it('keeps typed text when items change', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness />)
    await user.type(screen.getByRole('combobox'), 'ac')
    expect(screen.getAllByRole('option')).toHaveLength(2)
    rerender(<Harness items={[{ label: 'Acme Ltd' }, { label: 'Ace Freight' }, { label: 'Acme Ltd', sublabel: 'dup' }]} />)
    expect(screen.getByRole('combobox')).toHaveValue('ac')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Acme Ltd', 'Ace Freight'])
  })

  it('shows the external value and applies id and style to the right elements', () => {
    const { container } = render(
      <SearchCombobox items={clients} value="Acme Ltd" onChange={() => {}} id="cust" style={{ maxWidth: 300 }} />,
    )
    expect(screen.getByRole('combobox')).toHaveValue('Acme Ltd')
    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'cust')
    // The first child is RAC's collection <template>; the root is the RAC ComboBox element
    expect(container.querySelector('[data-rac]')).toHaveStyle({ maxWidth: '300px' })
  })
})
