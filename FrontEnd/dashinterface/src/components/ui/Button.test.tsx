import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('onClick receives a MouseEvent and stopPropagation blocks the parent', async () => {
    const parent = vi.fn()
    const onClick = vi.fn((e: React.MouseEvent) => e.stopPropagation())
    render(<div onClick={parent}><Button onClick={onClick}>Go</Button></div>)
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick.mock.calls[0][0].nativeEvent).toBeInstanceOf(MouseEvent)
    expect(parent).not.toHaveBeenCalled()
  })

  it('defaults to type=button so it does not submit a form', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(<form onSubmit={onSubmit}><Button>Go</Button></form>)
    const btn = screen.getByRole('button', { name: 'Go' })
    expect(btn).toHaveAttribute('type', 'button')
    await userEvent.click(btn)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('type=submit still submits', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(<form onSubmit={onSubmit}><Button type="submit">Go</Button></form>)
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('isPending disables, sets aria-busy and swallows clicks', async () => {
    const onClick = vi.fn()
    render(<Button isPending icon={<span data-testid="icon" />} onClick={onClick}>Save</Button>)
    const btn = screen.getByRole('button', { name: 'Save' })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('has marker classes and defaults secondary/md', () => {
    render(<Button>Go</Button>)
    expect(screen.getByRole('button')).toHaveClass('ui-button', 'ui-button--secondary', 'ui-button--md')
  })

  it('variant and size map to marker classes and heights', () => {
    render(<Button variant="danger" size="lg">Go</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('ui-button--danger', 'ui-button--lg', 'h-10', 'focus-visible:border-danger')
  })

  it('merges className and forwards ref', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref} className="extra" style={{ width: 50 }}>Go</Button>)
    expect(ref.current).toBe(screen.getByRole('button'))
    expect(ref.current).toHaveClass('extra', 'ui-button')
    expect(ref.current).toHaveStyle({ width: '50px' })
  })

  it('logs in dev when an icon-only button has no aria-label', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Button icon={<span />} />)
    expect(spy).toHaveBeenCalled()
    spy.mockClear()
    render(<Button icon={<span />} aria-label="Close" />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
