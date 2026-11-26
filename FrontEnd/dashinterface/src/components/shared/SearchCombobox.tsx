/**
 * Generic searchable dropdown combobox.
 *
 * Shows all items when focused; narrows as the user types (matches on label
 * and sublabel). Selecting an item writes item.label into the input and
 * calls onChange with item.label.
 *
 * Used for Customer Name and Contact Person fields in New Inquiry.
 */

import { ComboBox, type ComboBoxItem } from '../ui'

export interface SearchItem {
  label: string       // Primary text shown in dropdown and placed in input on select
  sublabel?: string   // Secondary info (e.g. city, email) shown below label in dropdown
}

interface SearchComboboxProps {
  items: SearchItem[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  /** Names the input from a visible label (e.g. Field's). When set, the placeholder-based aria-label is dropped so the name is exactly the label. */
  'aria-labelledby'?: string
  style?: React.CSSProperties
  autoFocus?: boolean
}

// The label is the stored value; the sublabel becomes the option description. Labels must be
// unique, non-empty keys, so later duplicates and empty labels are dropped.
function toComboBoxItems(items: SearchItem[]): ComboBoxItem[] {
  const seen = new Set<string>()
  const out: ComboBoxItem[] = []
  for (const item of items) {
    if (!item.label || seen.has(item.label)) continue
    seen.add(item.label)
    out.push({ value: item.label, description: item.sublabel })
  }
  return out
}

export default function SearchCombobox({
  items, value, onChange, placeholder, id, 'aria-labelledby': ariaLabelledby, style, autoFocus,
}: SearchComboboxProps) {
  return (
    <ComboBox
      items={toComboBoxItems(items)}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-label={ariaLabelledby ? undefined : placeholder}
      aria-labelledby={ariaLabelledby}
      id={id}
      style={style}
      autoFocus={autoFocus}
      menuTrigger="focus"
    />
  )
}
