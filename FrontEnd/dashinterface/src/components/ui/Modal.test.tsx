import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { I18nProvider } from 'react-aria-components'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { ComboBox } from './ComboBox'
import { DatePicker } from './DatePicker'
import { Modal } from './Modal'
import { Select } from './Select'

const options = [
  { value: 'air', label: 'Air Freight' },
  { value: 'ocean', label: 'Ocean Exports' },
]

// The backdrop is the overlay element that wraps the dialog panel.
const backdrop = () => screen.getByRole('dialog').closest('.bg-black\\/45') as HTMLElement

describe('Modal', () => {
  it('has role=dialog with accessible name = title', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Edit customer">
        <p>Body</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Edit customer' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Edit customer' })).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Edit customer">
        <p>Body</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Escape calls onClose', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <Modal isOpen onClose={onClose} title="Edit customer">
        <p>Body</p>
      </Modal>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('close button calls onClose', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <Modal isOpen onClose={onClose} title="Edit customer">
        <p>Body</p>
      </Modal>,
    )
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('backdrop click calls onClose', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <Modal isOpen onClose={onClose} title="Edit customer">
        <p>Body</p>
      </Modal>,
    )
    await user.click(backdrop())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('isDismissable={false}: Escape and backdrop click do not call onClose, close button absent', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <Modal isOpen onClose={onClose} title="Saving" isDismissable={false}>
        <p>Body</p>
      </Modal>,
    )
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(backdrop())
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('focus moves into dialog and returns to trigger on close', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open</Button>
          <Modal isOpen={open} onClose={() => setOpen(false)} title="Edit customer">
            <input aria-label="Name" />
          </Modal>
        </>
      )
    }
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
    // Tab stays inside the dialog (focus trap).
    await user.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
    await user.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('locks page scroll while open', () => {
    const { rerender } = render(
      <Modal isOpen onClose={() => {}} title="Edit customer">
        <p>Body</p>
      </Modal>,
    )
    expect(document.documentElement.style.overflow).toBe('hidden')
    rerender(
      <Modal isOpen={false} onClose={() => {}} title="Edit customer">
        <p>Body</p>
      </Modal>,
    )
    expect(document.documentElement.style.overflow).not.toBe('hidden')
  })

  it('renders the footer in a bottom bar', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Edit customer" footer={<Button variant="primary">Save</Button>}>
        <p>Body</p>
      </Modal>,
    )
    const bar = screen.getByRole('button', { name: 'Save' }).parentElement as HTMLElement
    expect(bar).toHaveClass('border-t', 'border-line-soft', 'justify-end', 'gap-2')
  })

  it.each([
    ['sm', 'max-w-[420px]'],
    ['md', 'max-w-[640px]'],
    ['lg', 'max-w-[880px]'],
  ] as const)('size %s sets the panel width', (size, cls) => {
    render(
      <Modal isOpen onClose={() => {}} title="Edit customer" size={size}>
        <p>Body</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog').parentElement).toHaveClass(cls)
  })

  it('applies className and style to the panel', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Edit customer" className="max-w-[500px]" style={{ opacity: 0.5 }}>
        <p>Body</p>
      </Modal>,
    )
    const panel = screen.getByRole('dialog').parentElement as HTMLElement
    expect(panel).toHaveClass('max-w-[500px]')
    expect(panel).not.toHaveClass('max-w-[640px]')
    expect(panel.style.opacity).toBe('0.5')
  })

  it('select inside modal: picking an option calls onChange and keeps the modal open', async () => {
    const onClose = vi.fn()
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <Modal isOpen onClose={onClose} title="Edit customer">
        <Select aria-label="Service" value="" onChange={onChange} options={options} placeholder="Pick…" />
      </Modal>,
    )
    await user.click(screen.getByRole('button', { name: /service/i }))
    const listbox = screen.getByRole('listbox')
    expect(listbox.parentElement).toHaveClass('z-(--z-popover-modal)')
    expect(listbox.parentElement).not.toHaveClass('z-(--z-popover)')
    await user.click(within(listbox).getByRole('option', { name: 'Ocean Exports' }))
    expect(onChange).toHaveBeenCalledWith('ocean')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Escape inside an open Select closes only the Select', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <Modal isOpen onClose={onClose} title="Edit customer">
        <Select aria-label="Service" value="" onChange={() => {}} options={options} placeholder="Pick…" />
      </Modal>,
    )
    await user.click(screen.getByRole('button', { name: /service/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('ComboBox popover inside a modal uses the modal popover layer', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [v, setV] = useState('')
      return <ComboBox aria-label="Port" value={v} onChange={setV} items={[{ value: 'LKCMB', label: 'Colombo' }]} />
    }
    render(
      <Modal isOpen onClose={() => {}} title="Edit customer">
        <Harness />
      </Modal>,
    )
    await user.type(screen.getByRole('combobox'), 'co')
    expect(screen.getByRole('listbox').parentElement).toHaveClass('z-(--z-popover-modal)')
  })

  it('DatePicker popover inside a modal uses the modal popover layer', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider locale="en-GB">
        <Modal isOpen onClose={() => {}} title="Edit customer">
          <DatePicker aria-label="Date" value="2026-11-26" onChange={() => {}} />
        </Modal>
      </I18nProvider>,
    )
    await user.click(screen.getByRole('button', { name: /calendar/i }))
    const calendarDialog = screen.getAllByRole('dialog').find((d) => within(d).queryByRole('grid'))
    expect(calendarDialog?.parentElement).toHaveClass('z-(--z-popover-modal)')
  })

  it('popovers outside a modal keep the normal popover layer', async () => {
    const user = userEvent.setup()
    render(<Select aria-label="Service" value="" onChange={() => {}} options={options} placeholder="Pick…" />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('listbox').parentElement).toHaveClass('z-(--z-popover)')
  })
})
