import { createContext, useContext } from 'react'

/** True inside a `Modal`. Popovers portal to `document.body`, so they read this to layer above the modal. */
export const InModalContext = createContext(false)

/** The z-index class for a popover: above the modal when rendered inside one. */
export function usePopoverLayer(): string {
  return useContext(InModalContext) ? 'z-(--z-popover-modal)' : 'z-(--z-popover)'
}
