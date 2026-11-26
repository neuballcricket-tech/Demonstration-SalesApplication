import { parseTime } from '@internationalized/date'
import { useRef, type AriaAttributes, type CSSProperties } from 'react'
import { DateInput, DateSegment, Label, TimeField as AriaTimeField } from 'react-aria-components'
import { cn } from '../../lib/cn'
import { control, controlModifier } from './controlStyles'
import { clearedLastSegment } from './segments'

export interface TimeFieldProps {
  /** `'HH:mm'`. `''` or invalid text shows empty. */
  value: string
  /** Called with `'HH:mm'` when a full time is entered, and with `''` when every segment is cleared. */
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
  const inputRef = useRef<HTMLDivElement>(null)
  return (
    <AriaTimeField
      value={parseHHmm(value)}
      onChange={(time) => {
        if (time) onChange(`${pad(time.hour)}:${pad(time.minute)}`)
        else if (clearedLastSegment(inputRef.current)) onChange('')
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
