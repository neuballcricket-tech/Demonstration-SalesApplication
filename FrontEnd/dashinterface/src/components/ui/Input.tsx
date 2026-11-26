import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn, tv } from '../../lib/cn'

type ControlSize = 'sm' | 'md' | 'lg'

const control = tv({
  base: 'w-full rounded-control border border-line bg-surface px-2 text-control text-fg placeholder:text-fg-muted disabled:bg-disabled focus-visible:border-primary aria-invalid:border-danger aria-invalid:focus-visible:border-danger',
  variants: {
    controlSize: {
      sm: 'h-7',
      md: 'h-8',
      lg: 'h-10',
    },
  },
  defaultVariants: { controlSize: 'md' },
})

const textarea = tv({
  extend: control,
  variants: {
    controlSize: { sm: 'h-auto min-h-7 py-1', md: 'h-auto min-h-16 py-1.5', lg: 'h-auto min-h-24 py-2' },
  },
})

const modifier = (size: ControlSize) => (size === 'md' ? null : `ui-control--${size}`)

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
