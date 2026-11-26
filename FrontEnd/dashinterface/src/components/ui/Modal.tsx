import { X } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Dialog, Heading, Modal as AriaModal, ModalOverlay } from 'react-aria-components'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  /** Also the dialog's accessible name. */
  title: string
  /**
   * Stacked with a 12px gap (`flex flex-col gap-3`). The gap applies to direct children only, so a
   * `<form>` wrapping the fields needs `className="flex flex-col gap-3"` itself.
   */
  children: ReactNode
  /** Rendered in a right-aligned bar under the body (e.g. Cancel / Save buttons). */
  footer?: ReactNode
  /** When false (e.g. `!saving`), Escape and backdrop clicks do nothing and the close button is hidden. Defaults to true. */
  isDismissable?: boolean
  /** Panel width: 420 / 640 / 880px. Defaults to `'md'`. */
  size?: 'sm' | 'md' | 'lg'
  /** Applied to the panel (the overlay itself is a full-screen backdrop). */
  className?: string
  style?: CSSProperties
}

const widths = { sm: 'max-w-[420px]', md: 'max-w-[640px]', lg: 'max-w-[880px]' }

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  isDismissable = true,
  size = 'md',
  className,
  style,
}: ModalProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      isDismissable={isDismissable}
      isKeyboardDismissDisabled={!isDismissable}
      className="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-black/45 p-4"
    >
      <AriaModal
        className={cn(
          'flex max-h-full w-full flex-col rounded-card border border-line-soft bg-surface shadow-popover',
          widths[size],
          className,
        )}
        style={style}
      >
        <Dialog className="flex min-h-0 flex-1 flex-col outline-hidden">
          <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3">
            <Heading slot="title" className="m-0 text-title font-bold text-fg">
              {title}
            </Heading>
            {isDismissable && (
              <Button variant="ghost" size="sm" icon={<X size={16} aria-hidden="true" />} aria-label="Close" onClick={onClose} />
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 pb-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3">{footer}</div>}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  )
}
