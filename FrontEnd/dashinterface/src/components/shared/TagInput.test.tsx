import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import TagInput from './TagInput'

const liners = ['MAERSK', 'MSC', 'CMA CGM', 'maersk']
const scac: Record<string, string> = { MAERSK: 'MAEU', MSC: 'MSCU' }
const formatLabel = (v: string) => (scac[v] ? `${v} – ${scac[v]}` : v)

function Harness({
  initial = [],
  onChange = () => {},
  withFormat = false,
}: {
  initial?: string[]
  onChange?: (v: string[]) => void
  withFormat?: boolean
}) {
  const [values, setValues] = useState(initial)
  return (
    <TagInput
      values={values}
      onChange={(next) => {
        onChange(next)
        setValues(next)
      }}
      suggestions={liners}
      placeholder="Type to add liners..."
      formatLabel={withFormat ? formatLabel : undefined}
    />
  )
}

describe('TagInput', () => {
  it('Enter adds tag', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'ONE{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(['ONE'])
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('Enter does not submit a surrounding form', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    const user = userEvent.setup()
    render(
      <form onSubmit={onSubmit}>
        <Harness />
      </form>,
    )
    await user.type(screen.getByRole('combobox'), 'ONE{Enter}')
    await user.keyboard('{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Enter adds the highlighted suggestion', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'cma')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(['CMA CGM'])
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('clicking a suggestion adds it', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'ms')
    await user.click(screen.getByRole('option', { name: 'MSC' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(['MSC'])
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('shows de-duplicated suggestions on focus, without chosen values', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['MSC']} />)
    await user.click(screen.getByRole('combobox'))
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual(['MAERSK', 'CMA CGM'])
  })

  it('Backspace on empty input removes last tag', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness initial={['MSC', 'MAERSK']} onChange={onChange} />)
    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{Backspace}')
    expect(onChange).toHaveBeenLastCalledWith(['MSC'])
  })

  it('Backspace with text only edits the text', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness initial={['MSC']} onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'ab{Backspace}')
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox')).toHaveValue('a')
  })

  it('formatLabel used for chips', () => {
    render(<Harness initial={['MAERSK', 'ONE']} withFormat />)
    expect(screen.getByRole('row', { name: 'MAERSK – MAEU' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'ONE' })).toBeInTheDocument()
  })

  it('formatLabel used for suggestions, and matches the formatted text', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness withFormat onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'mscu')
    await user.click(screen.getByRole('option', { name: 'MSC – MSCU' }))
    expect(onChange).toHaveBeenLastCalledWith(['MSC'])
  })

  it('duplicate not added', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness initial={['MSC']} onChange={onChange} />)
    await user.type(screen.getByRole('combobox'), 'msc{Enter}')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('remove button removes the tag and is named by its label', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness initial={['MAERSK', 'MSC']} withFormat onChange={onChange} />)
    const remove = screen.getByRole('button', { name: 'Remove MAERSK – MAEU' })
    expect(remove).toHaveClass('size-6')
    await user.click(remove)
    expect(onChange).toHaveBeenLastCalledWith(['MSC'])
  })

  it('Delete on a focused tag removes it', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness initial={['MAERSK', 'MSC']} onChange={onChange} />)
    await user.click(screen.getByRole('row', { name: 'MSC' }))
    await user.keyboard('{Delete}')
    expect(onChange).toHaveBeenLastCalledWith(['MAERSK'])
  })

  it('placeholder shows only while there are no tags, and names the input', () => {
    const { unmount } = render(<Harness />)
    expect(screen.getByRole('combobox', { name: 'Type to add liners...' })).toHaveAttribute('placeholder', 'Type to add liners...')
    unmount()
    render(<Harness initial={['MSC']} />)
    expect(screen.getByRole('combobox', { name: 'Type to add liners...' })).toHaveAttribute('placeholder', '')
  })

  it('has no inline outline style that would hide the focus ring', () => {
    render(<Harness />)
    expect(screen.getByRole('combobox').style.outline).toBe('')
  })
})
