import type { ComponentProps, CSSProperties, ReactElement } from 'react'
import { Focusable, Tooltip as AriaTooltip, TooltipTrigger } from 'react-aria-components'
import { cn } from '../../lib/cn'

export interface TooltipProps {
  content: string
  /** One focusable element that forwards its ref and spreads extra props (e.g. our `Button`). */
  children: ReactElement
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Applied to the tooltip bubble. */
  className?: string
  style?: CSSProperties
}

export function Tooltip({ content, children, placement = 'top', className, style }: TooltipProps) {
  return (
    <TooltipTrigger delay={400}>
      {/* RAC types this as an intrinsic element; at runtime any element that forwards its ref and spreads props works. */}
      <Focusable>{children as ComponentProps<typeof Focusable>['children']}</Focusable>
      <AriaTooltip
        placement={placement}
        offset={6}
        className={cn('rounded-control bg-fg px-2 py-1 text-label text-white', className)}
        style={style}
      >
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  )
}
