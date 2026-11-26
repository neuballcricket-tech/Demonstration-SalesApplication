import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { buttonStyles } from './buttonStyles'

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
        buttonStyles({ variant, size }),
        className,
      )}
      {...rest}
    >
      {isPending ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> : icon}
      {children}
    </button>
  )
})
