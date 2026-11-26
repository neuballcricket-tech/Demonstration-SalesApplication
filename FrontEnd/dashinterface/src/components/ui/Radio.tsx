import type { AriaAttributes, CSSProperties, ReactNode } from 'react'
import { Label, Radio as AriaRadio, RadioGroup as AriaRadioGroup } from 'react-aria-components'
import { cn } from '../../lib/cn'
import { labelClass } from './controlStyles'

export interface RadioGroupProps {
  value: string
  onChange: (value: string) => void
  /** Visible group label. Without it, pass `aria-label` or `aria-labelledby`. */
  label?: string
  orientation?: 'horizontal' | 'vertical'
  children: ReactNode
  isDisabled?: boolean
  isInvalid?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
  id?: string
  name?: string
  /** Applied to the root element. */
  className?: string
  style?: CSSProperties
}

export interface RadioProps {
  value: string
  children: ReactNode
  isDisabled?: boolean
  /** Applied to the root `<label>`. */
  className?: string
}

export function RadioGroup({
  value,
  onChange,
  label,
  orientation = 'vertical',
  children,
  isInvalid,
  'aria-invalid': ariaInvalid,
  className,
  ...rest
}: RadioGroupProps) {
  return (
    <AriaRadioGroup
      value={value}
      onChange={onChange}
      orientation={orientation}
      isInvalid={isInvalid || ariaInvalid === true || ariaInvalid === 'true'}
      className={cn('group flex flex-col gap-1', className)}
      {...rest}
    >
      {label && <Label className={labelClass}>{label}</Label>}
      <div className={cn('flex gap-x-4 gap-y-2', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap')}>
        {children}
      </div>
    </AriaRadioGroup>
  )
}

export function Radio({ value, children, isDisabled, className }: RadioProps) {
  return (
    <AriaRadio
      value={value}
      isDisabled={isDisabled}
      className={cn('group/radio inline-flex items-center gap-2 text-control text-fg data-disabled:opacity-60', className)}
    >
      {({ isSelected, isInvalid }) => (
        <>
          <span
            aria-hidden="true"
            className={cn(
              'flex size-4 shrink-0 items-center justify-center rounded-full border bg-surface',
              isInvalid ? 'border-danger' : isSelected ? 'border-primary' : 'border-line',
              'group-data-focus-visible/radio:shadow-focus',
              !isInvalid && 'group-data-focus-visible/radio:border-primary',
            )}
          >
            {isSelected && <span className={cn('size-2 rounded-full', isInvalid ? 'bg-danger' : 'bg-primary')} />}
          </span>
          {children}
        </>
      )}
    </AriaRadio>
  )
}
