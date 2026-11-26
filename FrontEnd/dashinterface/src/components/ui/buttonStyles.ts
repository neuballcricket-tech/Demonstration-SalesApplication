import { tv } from '../../lib/cn'

export const buttonStyles = tv({
  base: 'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control text-control font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
  variants: {
    variant: {
      primary: 'bg-primary text-white hover:bg-primary-hover',
      secondary: 'border border-line bg-surface text-fg hover:bg-surface-hover focus-visible:border-primary',
      ghost: 'bg-transparent text-primary hover:bg-primary-subtle focus-visible:border-primary',
      danger: 'border border-danger bg-danger text-white hover:opacity-90 focus-visible:border-danger',
    },
    size: {
      sm: 'h-7 px-2.5',
      md: 'h-8 px-3',
      lg: 'h-10 px-4',
    },
  },
  defaultVariants: { variant: 'secondary', size: 'md' },
})
