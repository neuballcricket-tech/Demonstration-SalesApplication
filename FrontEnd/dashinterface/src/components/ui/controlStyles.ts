import { tv } from '../../lib/cn'

export type ControlSize = 'sm' | 'md' | 'lg'

export const control = tv({
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

export const controlModifier = (size: ControlSize) => (size === 'md' ? null : `ui-control--${size}`)
