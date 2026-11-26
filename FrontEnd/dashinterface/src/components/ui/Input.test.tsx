import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Badge } from './Badge'
import { Input, NumberInput, Textarea } from './Input'

describe('Input', () => {
  it('has ui-control marker, size modifier, merges className and forwards ref', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} controlSize="lg" className="extra" aria-label="x" />)
    expect(ref.current).toBe(screen.getByLabelText('x'))
    expect(ref.current).toHaveClass('ui-control', 'ui-control--lg', 'extra', 'h-10')
  })

  it('keeps the navy border on focus, but red when invalid', () => {
    render(<><Input aria-label="a" /><NumberInput aria-label="b" /><Textarea aria-label="c" /></>)
    for (const label of ['a', 'b', 'c']) {
      expect(screen.getByLabelText(label)).toHaveClass(
        'focus-visible:border-primary',
        'aria-invalid:border-danger',
        'aria-invalid:focus-visible:border-danger',
      )
    }
  })

  it('md has no size modifier class', () => {
    render(<Input aria-label="x" />)
    expect(screen.getByLabelText('x').className).not.toMatch(/ui-control--(sm|md|lg)/)
  })

  it('native size attribute still works', () => {
    render(<Input aria-label="x" size={5} />)
    expect(screen.getByLabelText('x')).toHaveAttribute('size', '5')
  })
})

describe('NumberInput', () => {
  it('is type=number with decimal inputMode and fires onChange as the native value changes', async () => {
    const values: string[] = []
    render(<NumberInput aria-label="n" onChange={e => values.push(e.target.value)} />)
    const input = screen.getByLabelText('n')
    expect(input).toHaveAttribute('type', 'number')
    expect(input).toHaveAttribute('inputmode', 'decimal')
    await userEvent.type(input, '12.5')
    // A native number input reports no value change for the incomplete '12.' (its value
    // stays '12'), so React fires onChange for '1', '12' and '12.5' only.
    expect(values).toEqual(['1', '12', '12.5'])
  })

  it('empty value is an empty string', async () => {
    const onChange = vi.fn()
    render(<NumberInput aria-label="n" defaultValue="3" onChange={e => onChange(e.target.value)} />)
    await userEvent.clear(screen.getByLabelText('n'))
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('hides spinners', () => {
    render(<NumberInput aria-label="n" />)
    expect(screen.getByLabelText('n').className).toContain('[appearance:textfield]')
  })
})

describe('Textarea', () => {
  it('renders a ui-control textarea and forwards ref', () => {
    const ref = createRef<HTMLTextAreaElement>()
    render(<Textarea ref={ref} aria-label="t" controlSize="sm" />)
    expect(ref.current?.tagName).toBe('TEXTAREA')
    expect(ref.current).toHaveClass('ui-control', 'ui-control--sm')
  })
})

describe('Badge', () => {
  it('renders children with tone classes and merges className', () => {
    render(<Badge tone="danger" className="extra">Late</Badge>)
    const el = screen.getByText('Late')
    expect(el).toHaveClass('bg-danger-bg', 'text-danger', 'extra')
  })

  it('defaults to neutral', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toHaveClass('ui-badge', 'ui-badge--neutral')
  })
})
