import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn, tv } from '../../lib/cn'
import { control, controlModifier as modifier, type ControlSize } from './controlStyles'

const textarea = tv({
  extend: control,
  variants: {
    controlSize: { sm: 'h-auto min-h-7 py-1', md: 'h-auto min-h-16 py-1.5', lg: 'h-auto min-h-24 py-2' },
  },
})

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  controlSize?: ControlSize
  /** Native `size` attribute (visible character width). */
  size?: number
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { controlSize = 'md', className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn('ui-control', modifier(controlSize), control({ controlSize }), className)} {...rest} />
})

export const NumberInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(function NumberInput(
  { controlSize = 'md', className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="number"
      inputMode="decimal"
      className={cn(
        'ui-control',
        modifier(controlSize),
        control({ controlSize }),
        '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        className,
      )}
      {...rest}
    />
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  controlSize?: ControlSize
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { controlSize = 'md', className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn('ui-control', modifier(controlSize), textarea({ controlSize }), className)} {...rest} />
})
