import { Check, Minus } from 'lucide-react'
import type { AriaAttributes, CSSProperties, ReactNode } from 'react'
import { Checkbox as AriaCheckbox } from 'react-aria-components'
import { cn } from '../../lib/cn'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** The visible label. Without it, pass `aria-label`. */
  children?: ReactNode
  isDisabled?: boolean
  isIndeterminate?: boolean
  isInvalid?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
  /** Lands on the `<input>`. */
  id?: string
  name?: string
  /** Applied to the root `<label>`. */
  className?: string
  style?: CSSProperties
}

export function Checkbox({
  checked,
  onChange,
  children,
  isDisabled,
  isIndeterminate,
  isInvalid,
  'aria-invalid': ariaInvalid,
  className,
  style,
  ...rest
}: CheckboxProps) {
  return (
    <AriaCheckbox
      isSelected={checked}
      onChange={onChange}
      isDisabled={isDisabled}
      isIndeterminate={isIndeterminate}
      isInvalid={isInvalid || ariaInvalid === true || ariaInvalid === 'true'}
      className={cn('group inline-flex items-center gap-2 text-control text-fg data-disabled:opacity-60', className)}
      style={style}
      {...rest}
    >
      {({ isSelected, isIndeterminate: indeterminate, isInvalid: invalid }) => (
        <>
          <span
            aria-hidden="true"
            className={cn(
              'flex size-4 shrink-0 items-center justify-center rounded-control border bg-surface text-white',
              invalid ? 'border-danger' : 'border-line',
              (isSelected || indeterminate) && (invalid ? 'bg-danger' : 'border-primary bg-primary'),
              'group-data-focus-visible:shadow-focus',
              !invalid && 'group-data-focus-visible:border-primary',
            )}
          >
            {indeterminate ? <Minus size={12} strokeWidth={3} /> : isSelected ? <Check size={12} strokeWidth={3} /> : null}
          </span>
          {children}
        </>
      )}
    </AriaCheckbox>
  )
}
