import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the custom theme tokens so e.g. `text-label` (font size)
// and `text-fg-label` (colour) are not treated as the same class group.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['label', 'control', 'body', 'title'],
      radius: ['control', 'option', 'day', 'card'],
      shadow: ['popover', 'focus'],
    },
  },
})

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))
