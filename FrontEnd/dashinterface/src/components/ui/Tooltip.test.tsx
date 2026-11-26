import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { X } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

const renderTip = (props: Partial<Parameters<typeof Tooltip>[0]> = {}) =>
  render(
    <Tooltip content="Remove row" {...props}>
      <Button variant="ghost" size="sm" icon={<X size={16} aria-hidden="true" />} aria-label="Remove" />
    </Tooltip>,
  )

describe('Tooltip', () => {
  it('is hidden until the trigger is focused', () => {
    renderTip()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows on keyboard focus and describes the trigger', async () => {
    const user = userEvent.setup()
    renderTip()
    await user.tab()
    const trigger = screen.getByRole('button', { name: 'Remove' })
    expect(trigger).toHaveFocus()
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Remove row')
    expect(trigger).toHaveAccessibleDescription('Remove row')
    expect(tip).toHaveClass('z-(--z-tooltip)', 'bg-fg', 'text-white', 'text-label', 'rounded-control')
  })

  it('hides on Escape', async () => {
    const user = userEvent.setup()
    renderTip()
    await user.tab()
    await screen.findByRole('tooltip')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
  })

  it('hides when focus leaves the trigger', async () => {
    const user = userEvent.setup()
    renderTip()
    await user.tab()
    await screen.findByRole('tooltip')
    await user.tab()
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
  })

  it('keeps the trigger click handler working', async () => {
    const user = userEvent.setup()
    let clicks = 0
    render(
      <Tooltip content="Remove row">
        <Button aria-label="Remove" onClick={() => clicks++}>
          x
        </Button>
      </Tooltip>,
    )
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(clicks).toBe(1)
  })

  it('applies placement, className and style to the tooltip', async () => {
    const user = userEvent.setup()
    renderTip({ placement: 'bottom', className: 'max-w-40', style: { opacity: 0.5 } })
    await user.tab()
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveAttribute('data-placement', 'bottom')
    expect(tip).toHaveClass('max-w-40')
    expect(tip.style.opacity).toBe('0.5')
  })
})
