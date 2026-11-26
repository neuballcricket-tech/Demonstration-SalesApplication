import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FileButton } from './FileButton'

const hiddenInput = (container: HTMLElement) => container.querySelector('input[type="file"]') as HTMLInputElement

describe('FileButton', () => {
  it('upload calls onSelect with the files', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    const { container } = render(<FileButton onSelect={onSelect}>Attach</FileButton>)
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' })
    await user.upload(hiddenInput(container), file)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith([file])
  })

  it('forwards accept and multiple to the hidden input', () => {
    const { container } = render(
      <FileButton onSelect={() => {}} accept=".pdf,.png" multiple>Attach</FileButton>,
    )
    const input = hiddenInput(container)
    expect(input).toHaveAttribute('accept', '.pdf,.png')
    expect(input).toHaveAttribute('multiple')
  })

  it('multiple files arrive in order', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    const { container } = render(<FileButton onSelect={onSelect} multiple>Attach</FileButton>)
    const files = [new File(['1'], 'a.txt'), new File(['2'], 'b.txt')]
    await user.upload(hiddenInput(container), files)
    expect(onSelect).toHaveBeenCalledWith(files)
  })

  it('renders a button with the label, and shows the file name next to it', () => {
    render(<FileButton onSelect={() => {}} fileName="quote.pdf">Attach</FileButton>)
    expect(screen.getByRole('button', { name: 'Attach' })).toBeInTheDocument()
    expect(screen.getByText('quote.pdf')).toBeInTheDocument()
  })

  it('opens the file picker when the button is pressed', async () => {
    const user = userEvent.setup()
    const { container } = render(<FileButton onSelect={() => {}}>Attach</FileButton>)
    const click = vi.spyOn(hiddenInput(container), 'click')
    await user.click(screen.getByRole('button', { name: 'Attach' }))
    expect(click).toHaveBeenCalled()
  })

  it('a disabled button does not open the picker', async () => {
    const user = userEvent.setup()
    const { container } = render(<FileButton onSelect={() => {}} isDisabled>Attach</FileButton>)
    const click = vi.spyOn(hiddenInput(container), 'click')
    await user.click(screen.getByRole('button', { name: 'Attach' }))
    expect(click).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Attach' })).toBeDisabled()
  })

  it('forwards className/style to the root and aria-label to the button', () => {
    const { container } = render(
      <FileButton onSelect={() => {}} className="extra" style={{ marginTop: 3 }} aria-label="Upload quote">
        Attach
      </FileButton>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass('extra')
    expect(root.style.marginTop).toBe('3px')
    expect(screen.getByRole('button', { name: 'Upload quote' })).toBeInTheDocument()
  })
})
