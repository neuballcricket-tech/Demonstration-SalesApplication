import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import { createTV } from 'tailwind-variants/config'

// Teach tailwind-merge the custom theme tokens so e.g. `text-label` (font size)
// and `text-fg-label` (colour) are not treated as the same class group.
export const twMergeConfig = {
  extend: {
    theme: {
      text: ['label', 'control', 'body', 'title'],
      radius: ['control', 'option', 'day', 'card'],
      shadow: ['popover', 'focus'],
    },
  },
}

const twMerge = extendTailwindMerge(twMergeConfig)

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))

// Project `tv`: use this instead of importing `tv` from 'tailwind-variants',
// so variant classes are merged with the same token config as `cn()`.
export const tv = createTV({ twMergeConfig })
