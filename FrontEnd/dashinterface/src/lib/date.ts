import { getLocalTimeZone, today } from '@internationalized/date'

/** Today's date in the user's local timezone as `'YYYY-MM-DD'` (unlike `toISOString()`, which is UTC). */
export const todayISO = (): string => today(getLocalTimeZone()).toString()
