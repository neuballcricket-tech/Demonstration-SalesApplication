import { useState, useRef, useMemo } from 'react'
import { X } from 'lucide-react'
import { Button, Tag, TagGroup, TagList, type Key } from 'react-aria-components'
import { ComboBox, type ComboBoxItem } from '../ui'

interface TagInputProps {
  values: string[]
  onChange: (values: string[]) => void
  suggestions: string[]
  placeholder?: string
  /** Optional display formatter — shown in dropdown and tag chips while the
   *  raw suggestion string is stored as the actual value. */
  formatLabel?: (value: string) => string
  /** Lands on the text input, so a `<label htmlFor>` (e.g. from `Field`) points at it. */
  id?: string
  /** Names the input from a visible label, taking precedence over the placeholder-based aria-label. */
  'aria-labelledby'?: string
}

export default function TagInput({ values, onChange, suggestions, placeholder, formatLabel, id, 'aria-labelledby': ariaLabelledby }: TagInputProps) {
  const [input, setInput] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const display = formatLabel ?? ((v: string) => v)
  const inputName = placeholder ?? 'Type to search...'

  // Deduplicate suggestions (they become list keys), dropping empty ones
  const uniqueSuggestions = useMemo(() => {
    const seen = new Set<string>()
    return suggestions.filter(s => {
      const key = s.toLowerCase()
      if (!s || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [suggestions])

  // The ComboBox matches the typed text against both the raw value and the formatted label
  const items: ComboBoxItem[] = uniqueSuggestions
    .filter(s => !values.some(v => v.toLowerCase() === s.toLowerCase()))
    .map(s => ({ value: s, label: display(s) }))

  const focusInput = () => wrapperRef.current?.querySelector('input')?.focus()

  const addValue = (val: string) => {
    const trimmed = val.trim()
    if (!trimmed || values.some(v => v.toLowerCase() === trimmed.toLowerCase())) return
    onChange([...values, trimmed])
    setInput('')
  }

  const removeTags = (keys: Set<Key>) => {
    const next = values.filter((_, i) => !keys.has(String(i)))
    onChange(next)
    // The tag list disappears with its last tag, so keep focus in the field
    if (next.length === 0) focusInput()
  }

  // Capture phase, so Enter is seen before the ComboBox handles it
  const onKeyDownCapture = (e: React.KeyboardEvent) => {
    if (!(e.target instanceof HTMLInputElement)) return
    if (e.key === 'Enter') {
      // Never submit a surrounding form
      e.preventDefault()
      const activeId = e.target.getAttribute('aria-activedescendant')
      const highlighted = activeId ? document.getElementById(activeId)?.dataset.key : undefined
      if (highlighted !== undefined) {
        // Add the highlighted suggestion here rather than through a ComboBox pick, so the list
        // stays open for the next one (a mouse pick closes it)
        e.stopPropagation()
        addValue(highlighted)
      } else {
        addValue(input)
      }
    } else if (e.key === 'Backspace' && !input && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  // Clicking the box outside a tag focuses the input, as with a single field
  const onClick = (e: React.MouseEvent) => {
    if (!(e.target as Element).closest('[role="row"], input, button')) focusInput()
  }

  return (
    <div
      ref={wrapperRef}
      className="flex min-h-8 cursor-text flex-wrap items-center gap-1 rounded-control border border-line bg-surface px-1 focus-within:border-primary focus-within:shadow-focus"
      onKeyDownCapture={onKeyDownCapture}
      onClick={onClick}
    >
      {values.length > 0 && (
        <TagGroup aria-label="Selected values" onRemove={removeTags} className="contents">
          <TagList className="flex flex-wrap gap-1">
            {values.map((v, i) => (
              <Tag
                key={i}
                id={String(i)}
                textValue={display(v)}
                className="inline-flex items-center whitespace-nowrap rounded-control bg-primary-subtle pl-2 text-label font-semibold text-primary"
              >
                {display(v)}
                {/* Named "Remove <label>" by RAC: its "Remove" label plus the tag's text */}
                <Button
                  slot="remove"
                  className="flex size-6 items-center justify-center rounded-control border-0 bg-transparent p-0 text-primary"
                >
                  <X size={12} aria-hidden="true" />
                </Button>
              </Tag>
            ))}
          </TagList>
        </TagGroup>
      )}
      <ComboBox
        items={items}
        value={input}
        onChange={setInput}
        onPick={addValue}
        placeholder={values.length === 0 ? inputName : ''}
        aria-label={inputName}
        aria-labelledby={ariaLabelledby}
        id={id}
        menuTrigger="focus"
        className="min-w-40 flex-1"
        inputClassName="h-7 border-0 bg-transparent px-1 shadow-none"
      />
    </div>
  )
}
