/**
 * RAC reports `null` as soon as any segment of a complete date/time is cleared, even though other
 * segments still hold digits. Called from onChange (before React re-renders), this tells whether
 * that `null` came from clearing the last filled segment, i.e. the field is now truly empty.
 */
export function clearedLastSegment(root: HTMLElement | null): boolean {
  if (!root) return false
  return root.querySelectorAll('[role="spinbutton"]:not([data-placeholder])').length <= 1
}
