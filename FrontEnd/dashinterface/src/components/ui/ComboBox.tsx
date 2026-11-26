import { ChevronDown } from 'lucide-react'
import type { AriaAttributes, CSSProperties } from 'react'
import {
  Button,
  ComboBox as AriaComboBox,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Text,
} from 'react-aria-components'
import { cn } from '../../lib/cn'
import { control, controlModifier } from './controlStyles'

export type ComboBoxItem = { value: string; label?: string; description?: string }

export interface ComboBoxProps {
  /** The input text, as with `<input list>`. */
  value: string
  /** Called with the text on every keystroke, and with `item.value` when an item is picked. */
  onChange: (value: string) => void
  items: ComboBoxItem[]
  /** Keep free text that matches no item. Defaults to true, like a datalist. */
  allowsCustomValue?: boolean
  placeholder?: string
  label?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
  isDisabled?: boolean
  isInvalid?: boolean
  controlSize?: 'sm' | 'md'
  /** Lands on the `<input>`, so a `<label htmlFor>` (e.g. from `Field`) points at it. */
  id?: string
  name?: string
  autoFocus?: boolean
  /** Applied to the root element, so width/flex classes size the whole control. */
  className?: string
  style?: CSSProperties
  onInputChange?: (text: string) => void
  menuTrigger?: 'focus' | 'input'
}

const itemClass =
  'flex flex-col rounded-option px-2 py-1.5 text-control text-fg focus:bg-primary-subtle selected:font-semibold disabled:text-fg-muted'

export function ComboBox({
  value,
  onChange,
  items,
  allowsCustomValue = true,
  placeholder,
  label,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
  isDisabled,
  isInvalid,
  controlSize = 'md',
  id,
  name,
  autoFocus,
  className,
  style,
  onInputChange,
  menuTrigger = 'input',
}: ComboBoxProps) {
  const needle = value.toLowerCase()
  const visible = items.filter((item) =>
    `${item.label ?? item.value} ${item.description ?? ''}`.toLowerCase().includes(needle),
  )

  return (
    <AriaComboBox
      items={visible}
      // The list is filtered above (on label + description), so RAC must not filter again on its text value.
      defaultFilter={() => true}
      inputValue={value}
      onInputChange={(text) => {
        onChange(text)
        onInputChange?.(text)
      }}
      // Controlled, so RAC reports a pick here (not through onInputChange); typing clears the key, which is ignored.
      selectedKey={items.some((i) => i.value === value) ? value : null}
      onSelectionChange={(key) => {
        if (key !== null) onChange(String(key))
      }}
      allowsCustomValue={allowsCustomValue}
      menuTrigger={menuTrigger}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      isDisabled={isDisabled}
      isInvalid={isInvalid || ariaInvalid === true || ariaInvalid === 'true'}
      name={name}
      autoFocus={autoFocus}
      className={cn('group flex flex-col gap-1', className)}
      style={style}
    >
      {label && <Label className="text-label font-semibold text-fg-label">{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          placeholder={placeholder}
          className={cn(
            'ui-control',
            controlModifier(controlSize),
            control({ controlSize }),
            'pr-8 group-data-invalid:border-danger group-data-invalid:focus-visible:border-danger',
          )}
        />
        <Button className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-fg-muted">
          <ChevronDown size={16} aria-hidden="true" />
        </Button>
      </div>
      <Popover
        placement="bottom start"
        className="z-(--z-popover) w-(--trigger-width) rounded-card border border-line-popover bg-surface shadow-popover"
      >
        <ListBox className="max-h-70 overflow-auto p-1">
          {(item: ComboBoxItem) => (
            <ListBoxItem id={item.value} textValue={item.value} className={itemClass}>
              <Text slot="label" className="truncate">
                {item.label ?? item.value}
              </Text>
              {item.description && (
                <Text slot="description" className="truncate text-label text-fg-muted">
                  {item.description}
                </Text>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaComboBox>
  )
}
