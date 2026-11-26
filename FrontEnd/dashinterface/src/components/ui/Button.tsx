import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn, tv } from '../../lib/cn'

const button = tv({
  base: 'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control text-control font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
  variants: {
    variant: {
      primary: 'bg-primary text-white hover:bg-primary-hover',
      secondary: 'border border-line bg-surface text-fg hover:bg-surface-hover',
      ghost: 'bg-transparent text-primary hover:bg-primary-subtle',
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

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isPending?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', isPending = false, icon, type = 'button', className, children, disabled, ...rest },
  ref,
) {
  if (import.meta.env.DEV && icon && !children && !rest['aria-label'] && !rest['aria-labelledby']) {
    console.error('Button: an icon-only button needs an aria-label.')
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isPending}
      aria-busy={isPending || undefined}
      className={cn(
        'ui-button',
        `ui-button--${variant}`,
        `ui-button--${size}`,
        button({ variant, size }),
        className,
      )}
      {...rest}
    >
      {isPending ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> : icon}
      {children}
    </button>
  )
})
