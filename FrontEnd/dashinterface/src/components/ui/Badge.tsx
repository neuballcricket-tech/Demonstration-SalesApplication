import type { CSSProperties, ReactNode } from 'react'
import { cn, tv } from '../../lib/cn'

const badge = tv({
  base: 'inline-flex items-center whitespace-nowrap rounded-control border px-1.5 py-0.5 text-label font-semibold',
  variants: {
    tone: {
      neutral: 'border-line bg-disabled text-fg-label',
      info: 'border-info-line bg-info-bg text-info-fg',
      success: 'border-success-line bg-success-bg text-success-fg',
      warning: 'border-warning-line bg-warning-bg text-warning-fg',
      danger: 'border-danger-line bg-danger-bg text-danger',
      orange: 'border-orange-line bg-orange-bg text-orange-fg',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export interface BadgeProps {
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'orange'
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Badge({ tone = 'neutral', children, className, style }: BadgeProps) {
  return (
    <span className={cn('ui-badge', `ui-badge--${tone}`, badge({ tone }), className)} style={style}>
      {children}
    </span>
  )
}
