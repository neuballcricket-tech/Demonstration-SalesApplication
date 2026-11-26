import { parseDate, type DateValue } from '@internationalized/date'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, type AriaAttributes, type CSSProperties } from 'react'
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Label,
  Popover,
} from 'react-aria-components'
import { cn } from '../../lib/cn'
import { control, controlModifier } from './controlStyles'
import { clearedLastSegment } from './segments'

export interface DatePickerProps {
  /** `'YYYY-MM-DD'` (a longer ISO datetime is cut to its date part). `''`, `null`, `undefined` or invalid text shows empty. */
  value: string | null | undefined
  /** Called with `'YYYY-MM-DD'` when a full date is entered or picked, and with `''` when every segment is cleared. */
  onChange: (value: string) => void
  /** `'YYYY-MM-DD'`; invalid text is ignored. */
  minValue?: string
  /** `'YYYY-MM-DD'`; invalid text is ignored. */
  maxValue?: string
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

function parseISODate(value: string | null | undefined): ReturnType<typeof parseDate> | null {
  if (!value) return null
  try {
    return parseDate(value.slice(0, 10))
  } catch {
    return null
  }
}

const navButton =
  'flex size-7 items-center justify-center rounded-control border-none bg-transparent p-0 text-fg-muted hover:bg-primary-subtle disabled:text-fg-muted'

export function DatePicker({
  value,
  onChange,
  minValue,
  maxValue,
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
}: DatePickerProps) {
  const groupRef = useRef<HTMLDivElement>(null)
  return (
    <AriaDatePicker<DateValue>
      value={parseISODate(value)}
      onChange={(date) => {
        if (date) onChange(date.toString())
        else if (clearedLastSegment(groupRef.current)) onChange('')
      }}
      minValue={parseISODate(minValue) ?? undefined}
      maxValue={parseISODate(maxValue) ?? undefined}
      granularity="day"
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
      <Group
        ref={groupRef}
        className={cn(
          'ui-control',
          controlModifier(controlSize),
          control({ controlSize }),
          'flex items-center gap-1 focus-within:border-primary focus-within:shadow-focus data-disabled:bg-disabled group-data-invalid:border-danger group-data-invalid:focus-within:border-danger',
        )}
      >
        <DateInput className="flex flex-1 items-center">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="rounded-option px-0.5 tabular-nums focus:bg-primary focus:text-white focus-visible:shadow-none placeholder-shown:text-fg-muted"
            />
          )}
        </DateInput>
        <Button className="flex size-6 shrink-0 items-center justify-center rounded-option border-none bg-transparent p-0 text-fg-muted">
          <CalendarDays size={16} aria-hidden="true" />
        </Button>
      </Group>
      <Popover
        placement="bottom start"
        className="z-(--z-popover) rounded-card border border-line-popover bg-surface p-2 shadow-popover"
      >
        <Dialog className="outline-hidden">
          <Calendar className="w-56">
            <header className="mb-1 flex items-center justify-between">
              <Button slot="previous" className={navButton}>
                <ChevronLeft size={16} aria-hidden="true" />
              </Button>
              <Heading className="text-control font-semibold text-fg" />
              <Button slot="next" className={navButton}>
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </header>
            <CalendarGrid className="w-full border-collapse">
              <CalendarGridHeader>
                {(day) => <CalendarHeaderCell className="pb-1 text-label font-semibold text-fg-muted">{day}</CalendarHeaderCell>}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    className={({ isToday }) =>
                      cn(
                        'mx-auto flex size-8 items-center justify-center rounded-day text-control text-fg hover:bg-primary-subtle',
                        'outside-month:text-fg-muted disabled:text-fg-muted unavailable:text-fg-muted',
                        isToday && 'ring-1 ring-primary ring-inset',
                        'selected:bg-primary selected:text-white selected:hover:bg-primary',
                      )
                    }
                  />
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  )
}
