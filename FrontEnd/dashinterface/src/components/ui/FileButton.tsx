import { Upload } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Button as AriaButton, FileTrigger } from 'react-aria-components'
import { cn } from '../../lib/cn'
import type { ButtonProps } from './Button'
import { buttonStyles } from './buttonStyles'

export interface FileButtonProps {
  onSelect: (files: File[]) => void
  accept?: string
  multiple?: boolean
  children: ReactNode
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  isDisabled?: boolean
  /** Shown next to the button, e.g. the name of the file already chosen. */
  fileName?: string
  'aria-label'?: string
  'aria-describedby'?: string
  /** Lands on the button. */
  id?: string
  /** Applied to the root element (button plus file name). */
  className?: string
  style?: CSSProperties
}

export function FileButton({
  onSelect,
  accept,
  multiple,
  children,
  variant = 'secondary',
  size = 'md',
  isDisabled,
  fileName,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  id,
  className,
  style,
}: FileButtonProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)} style={style}>
      <FileTrigger
        acceptedFileTypes={accept?.split(',').map((t) => t.trim())}
        allowsMultiple={multiple}
        onSelect={(list) => onSelect(list ? Array.from(list) : [])}
      >
        <AriaButton
          id={id}
          isDisabled={isDisabled}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedby}
          className={cn(
            'ui-button',
            `ui-button--${variant}`,
            `ui-button--${size}`,
            buttonStyles({ variant, size }),
            (variant === 'primary' || variant === 'ghost') && 'border-none',
            'data-disabled:cursor-not-allowed data-disabled:opacity-60',
          )}
        >
          <Upload size={14} aria-hidden="true" />
          {children}
        </AriaButton>
      </FileTrigger>
      {fileName && <span className="truncate text-control text-fg-muted">{fileName}</span>}
    </div>
  )
}
