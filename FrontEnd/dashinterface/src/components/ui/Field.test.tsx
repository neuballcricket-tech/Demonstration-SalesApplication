import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Field } from './Field'

describe('Field', () => {
  it('label is associated with the control', async () => {
    render(<Field label="Client">{ids => <input {...ids} />}</Field>)
    const input = screen.getByLabelText('Client')
    expect(input.tagName).toBe('INPUT')
    await userEvent.click(screen.getByText('Client'))
    expect(input).toHaveFocus()
  })

  it('label has an id referenced by aria-labelledby, and keeps htmlFor', () => {
    render(<Field label="Client">{ids => <input {...ids} />}</Field>)
    const input = screen.getByLabelText('Client')
    const label = screen.getByText('Client')
    expect(label).toHaveAttribute('for', input.id)
    expect(label.id).not.toBe('')
    expect(input).toHaveAttribute('aria-labelledby', label.id)
  })

  it('error sets aria-invalid and aria-describedby', () => {
    render(<Field label="Client" error="Required">{ids => <input {...ids} />}</Field>)
    const input = screen.getByLabelText('Client')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const described = document.getElementById(input.getAttribute('aria-describedby') ?? '')
    expect(described).toHaveTextContent('Required')
  })

  it('hint is described and no aria-invalid without error', () => {
    render(<Field label="Client" hint="Legal name">{ids => <input {...ids} />}</Field>)
    const input = screen.getByLabelText('Client')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')).toHaveTextContent('Legal name')
  })

  it('required shows an aria-hidden asterisk', () => {
    render(<Field label="Client" required>{ids => <input {...ids} />}</Field>)
    const star = screen.getByText('*')
    expect(star).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies className and style to the root', () => {
    const { container } = render(
      <Field label="Client" className="extra" style={{ width: 120 }}>{ids => <input {...ids} />}</Field>,
    )
    expect(container.firstElementChild).toHaveClass('extra')
    expect(container.firstElementChild).toHaveStyle({ width: '120px' })
  })

  it('label is uppercase and tracked', () => {
    render(<Field label="Valid until">{(ids) => <input {...ids} />}</Field>)
    expect(screen.getByText('Valid until')).toHaveClass('text-label', 'font-semibold', 'uppercase', 'tracking-label')
  })
})
