import { parseTime } from '@internationalized/date'
import { useRef, type AriaAttributes, type CSSProperties } from 'react'
import { DateInput, DateSegment, Label, TimeField as AriaTimeField } from 'react-aria-components'
import { cn } from '../../lib/cn'
import { control, controlModifier } from './controlStyles'

export interface TimeFieldProps {
  /** `'HH:mm'`. `''` or invalid text shows empty. */
  value: string
  /** Called with `'HH:mm'` whenever the segments hold a full time, and with `''` when every segment is cleared
   * or when focus leaves a partly filled field that held a time. */
  onChange: (value: string) => void
  label?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
  isDisabled?: boolean
  isInvalid?: boolean
  isRequired?: boolean
  controlSize?: 'sm' | 'md'
  /** Lands on the field group, so a `<label htmlFor>` (e.g. from `Field`) points at it. */
  id?: string
  name?: string
  autoFocus?: boolean
  /** Applied to the root element, so width/flex classes size the whole control. */
  className?: string
  style?: CSSProperties
}

function parseHHmm(value: string) {
  if (!value) return null
  try {
    return parseTime(value.slice(0, 5))
  } catch {
    return null
  }
}

/**
 * True when focus left `group` while some, but not all, of its segments are filled. RAC keeps the
 * last full time in the controlled value, so the field would show less than the parent holds.
 */
function isPartiallyFilled(group: HTMLElement, nextFocus: EventTarget | null): boolean {
  if (nextFocus instanceof Node && group.contains(nextFocus)) return false
  const all = group.querySelectorAll('[role="spinbutton"]').length
  const filled = group.querySelectorAll('[role="spinbutton"]:not([data-placeholder])').length
  return filled > 0 && filled < all
}

const pad = (n: number) => String(n).padStart(2, '0')

export function TimeField({
  value,
  onChange,
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
  autoFocus,
  className,
  style,
}: TimeFieldProps) {
  const parsed = parseHHmm(value)
  const inputRef = useRef<HTMLDivElement>(null)
  return (
    <AriaTimeField
      value={parsed}
      onChange={(time) => onChange(time ? `${pad(time.hour)}:${pad(time.minute)}` : '')}
      onBlur={() => {
        if (parsed && inputRef.current && isPartiallyFilled(inputRef.current, null)) onChange('')
      }}
      granularity="minute"
      hourCycle={24}
      shouldForceLeadingZeros
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      isDisabled={isDisabled}
      isInvalid={isInvalid || ariaInvalid === true || ariaInvalid === 'true'}
      isRequired={isRequired}
      id={id}
      name={name}
      autoFocus={autoFocus}
      className={cn('group flex flex-col gap-1', className)}
      style={style}
    >
      {label && <Label className="text-label font-semibold text-fg-label">{label}</Label>}
      <DateInput
        ref={inputRef}
        className={cn(
          'ui-control',
          controlModifier(controlSize),
          control({ controlSize }),
          'flex items-center focus-within:border-primary focus-within:shadow-focus data-disabled:bg-disabled group-data-invalid:border-danger group-data-invalid:focus-within:border-danger',
        )}
      >
        {(segment) => (
          <DateSegment
            segment={segment}
            className="rounded-option px-0.5 tabular-nums focus:bg-primary focus:text-white focus-visible:shadow-none placeholder-shown:text-fg-muted"
          />
        )}
      </DateInput>
    </AriaTimeField>
  )
}
