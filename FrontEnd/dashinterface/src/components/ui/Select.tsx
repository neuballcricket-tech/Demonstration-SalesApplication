import { Check, ChevronDown } from 'lucide-react'
import type { AriaAttributes, CSSProperties } from 'react'
import {
  Button,
  Header,
  Label,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  Select as AriaSelect,
  SelectValue,
} from 'react-aria-components'
import { cn } from '../../lib/cn'
import { control, controlModifier } from './controlStyles'

export type Option = { value: string; label: string; disabled?: boolean }
export type OptionGroup = { label: string; options: Option[] }

export interface SelectProps {
  /** `''` means no selection. */
  value: string
  onChange: (value: string) => void
  /**
   * Include an option with `value: ''` (e.g. "All" or "— None —") to let users pick the empty value again.
   * Without one, `''` shows the `placeholder` and cannot be re-selected.
   */
  options: Array<Option | OptionGroup>
  placeholder?: string
  label?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
  isDisabled?: boolean
  isInvalid?: boolean
  isRequired?: boolean
  controlSize?: 'sm' | 'md'
  /** Lands on the trigger button, so a `<label htmlFor>` (e.g. from `Field`) points at it. */
  id?: string
  name?: string
  /** Applied to the root element, so width/flex classes size the whole control. */
  className?: string
  style?: CSSProperties
}

// RAC cannot use '' as an item key, so an empty-value option is keyed by this sentinel internally.
const EMPTY_KEY = '__ui-select-empty__'
const toKey = (value: string) => (value === '' ? EMPTY_KEY : value)

const isGroup = (o: Option | OptionGroup): o is OptionGroup => 'options' in o

const itemClass =
  'flex items-center justify-between gap-2 rounded-option px-2 py-1.5 text-control text-fg focus:bg-primary-subtle selected:font-semibold disabled:text-fg-muted'

function Item({ option }: { option: Option }) {
  return (
    <ListBoxItem id={toKey(option.value)} textValue={option.label} isDisabled={option.disabled} className={itemClass}>
      {({ isSelected }) => (
        <>
          <span className="truncate">{option.label}</span>
          {isSelected && <Check size={16} aria-hidden="true" className="shrink-0 text-primary" />}
        </>
      )}
    </ListBoxItem>
  )
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  label,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
  isDisabled,
  isInvalid,
  isRequired,
  controlSize = 'md',
  id,
  name,
  className,
  style,
}: SelectProps) {
  const known = options.some((o) => (isGroup(o) ? o.options.some((x) => x.value === value) : o.value === value))
  // A value that matches no option (e.g. legacy data) is shown as raw text; it is never rewritten.
  const unknown = value !== '' && !known

  return (
    <AriaSelect
      value={known ? toKey(value) : null}
      onChange={(key) => {
        if (key !== null) onChange(key === EMPTY_KEY ? '' : String(key))
      }}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      isDisabled={isDisabled}
      isInvalid={isInvalid || ariaInvalid === true || ariaInvalid === 'true'}
      isRequired={isRequired}
      name={name}
      className={cn('group flex flex-col gap-1', className)}
      style={style}
    >
      {label && <Label className="text-label font-semibold text-fg-label">{label}</Label>}
      <Button
        id={id}
        className={cn(
          'ui-control',
          controlModifier(controlSize),
          control({ controlSize }),
          'flex items-center justify-between gap-2 text-left group-data-invalid:border-danger group-data-invalid:focus-visible:border-danger',
        )}
      >
        <SelectValue className={({ isPlaceholder }) => cn('truncate', isPlaceholder && !unknown && 'text-fg-muted')}>
          {({ defaultChildren }) => (unknown ? value : defaultChildren)}
        </SelectValue>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-fg-muted" />
      </Button>
      <Popover
        placement="bottom start"
        className="z-(--z-popover) w-(--trigger-width) rounded-card border border-line-popover bg-surface shadow-popover"
      >
        <ListBox className="max-h-70 overflow-auto p-1">
          {options.map((o) =>
            isGroup(o) ? (
              <ListBoxSection key={o.label}>
                <Header className="px-2 py-1 text-label font-semibold text-fg-muted">{o.label}</Header>
                {o.options.map((x) => (
                  <Item key={x.value} option={x} />
                ))}
              </ListBoxSection>
            ) : (
              <Item key={o.value} option={o} />
            ),
          )}
        </ListBox>
      </Popover>
    </AriaSelect>
  )
}
