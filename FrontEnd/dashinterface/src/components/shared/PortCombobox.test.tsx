import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import PortCombobox from './PortCombobox'

// Stand-in for public/ports.json (UNLOCODE -> "Port/Country").
const PORTS_JSON = { LKGAL: 'Galle/Sri Lanka', NLRTM: 'Rotterdam/Netherlands' }

beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => PORTS_JSON })),
  )
})

function Harness({ initial = '', onChange = () => {} }: { initial?: string; onChange?: (code: string) => void }) {
  const [v, setV] = useState(initial)
  return (
    <>
      <PortCombobox
        value={v}
        onChange={(code) => {
          onChange(code)
          setV(code)
        }}
        placeholder="Origin port"
      />
      <button type="button" onClick={() => setV('')}>
        reset
      </button>
    </>
  )
}

describe('PortCombobox', () => {
  it('is a combobox named by its placeholder, with a default placeholder', () => {
    render(<Harness />)
    expect(screen.getByRole('combobox', { name: 'Origin port' })).toHaveAttribute('placeholder', 'Origin port')
    render(<PortCombobox value="" onChange={() => {}} />)
    expect(screen.getByPlaceholderText('Type port name or UNLOCODE')).toBeInTheDocument()
  })

  it('shows the curated list on focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('combobox'))
    expect((await screen.findAllByRole('option')).length).toBeGreaterThan(30)
  })

  it('lists curated ports as code with label', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByRole('combobox'), 'hamb')
    const option = screen.getByRole('option', { name: 'DEHAM' })
    expect(option).toHaveAccessibleDescription('Hamburg, Germany')
  })

  it('filters with slash format like "Port/Country"', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByRole('combobox'), 'colombo/sri')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['LKCMBColombo, Sri Lanka'])
  })

  it('typing does not call onChange until a port is committed', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'ham')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('typing a known code selects it', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'deham')
    expect(onChange).toHaveBeenLastCalledWith('DEHAM')
    expect(screen.getByRole('combobox')).toHaveValue('DEHAM')
    expect(screen.getByText('✓ Hamburg, Germany')).toBeInTheDocument()
  })

  it('picking a port calls onChange with its code', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'hamb')
    await user.click(screen.getByRole('option', { name: 'DEHAM' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('DEHAM')
    expect(screen.getByRole('combobox')).toHaveValue('DEHAM')
    expect(screen.getByText('✓ Hamburg, Germany')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })

  it('keyboard pick then Tab keeps the code', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'singap')
    await user.keyboard('{ArrowDown}{Enter}')
    await user.tab()
    await new Promise((r) => setTimeout(r, 200))
    expect(onChange).toHaveBeenLastCalledWith('SGSIN')
    expect(screen.getByText('✓ Singapore')).toBeInTheDocument()
  })

  it('clearing the input calls onChange with an empty string', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness initial="LKCMB" onChange={onChange} />)
    await user.clear(screen.getByRole('combobox'))
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('blur resolves a curated "Port/Country" label to its code', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'Colombo/Sri Lanka')
    await user.tab()
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('LKCMB'))
    expect(await screen.findByText('✓ Colombo, Sri Lanka')).toBeInTheDocument()
  })

  it('blur accepts a UNLOCODE from the full ports list', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'lkgal')
    await user.tab()
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('LKGAL'))
    expect(await screen.findByText('✓ Galle/Sri Lanka')).toBeInTheDocument()
  })

  it('blur accepts a "Port/Country" value from the full ports list', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'Galle, Sri Lanka')
    await user.tab()
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('LKGAL'))
  })

  it('unknown port shows the not-recognised message with suggestions', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'hamburg xyz')
    await user.tab()
    expect(await screen.findByText(/Port not recognised\./)).toBeInTheDocument()
    expect(screen.getByText(/Did you mean:/)).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('combobox')).toHaveAccessibleDescription(/Port not recognised\./)
    const deham = screen.getByRole('button', { name: 'DEHAM' })
    // Looks like a link: reset native button chrome, message-sized text
    expect(deham).toHaveClass('border-none', 'bg-transparent', 'p-0', 'text-label', 'text-primary', 'underline')
    await user.click(deham)
    expect(onChange).toHaveBeenLastCalledWith('DEHAM')
    expect(screen.getByText('✓ Hamburg, Germany')).toBeInTheDocument()
    // A mouse click does not pull focus back into the input (which would reopen the list)
    expect(screen.getByRole('combobox')).not.toHaveFocus()
  })

  it('a "Did you mean" button pressed from the keyboard returns focus to the input', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'hamburg xyz')
    await user.tab()
    const deham = await screen.findByRole('button', { name: 'DEHAM' })
    deham.focus()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('DEHAM')
    expect(screen.getByRole('combobox')).toHaveFocus()
  })

  it('shows an external value as its code with the label message, and resets', async () => {
    const user = userEvent.setup()
    render(<Harness initial="LKCMB" />)
    expect(screen.getByRole('combobox')).toHaveValue('LKCMB')
    expect(screen.getByText('✓ Colombo, Sri Lanka')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'reset' }))
    expect(screen.getByRole('combobox')).toHaveValue('')
    expect(screen.queryByText('✓ Colombo, Sri Lanka')).not.toBeInTheDocument()
  })

  it('applies style to the root', () => {
    const { container } = render(<PortCombobox value="" onChange={() => {}} style={{ maxWidth: 200 }} />)
    expect(container.firstElementChild).toHaveStyle({ maxWidth: '200px' })
  })
})
