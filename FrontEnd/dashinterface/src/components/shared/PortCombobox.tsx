/**
 * Two-tier port autocomplete.
 *
 * Tier 1 — curated list of ~40 frequent Colombo-export ports shown as a searchable dropdown.
 *   Matches on UNLOCODE code or city/country label. Always valid.
 *   Accepts "Port/Country" slash format as well as comma format while filtering.
 *
 * Tier 2 — full UN/LOCODE database (public/ports.json, 99k+ entries) used as a fallback
 *   validator when the user types something not in the curated list.
 *   Accepted input formats:
 *     • UNLOCODE:    "NLRTM" → Rotterdam/Netherlands
 *     • Slash style: "Rotterdam/Netherlands" → NLRTM (reverse value lookup)
 *     • Any mix of slashes, commas and spaces is normalised for comparison.
 *   Fetched lazily on first need; UNLOCODE→label and label→UNLOCODE caches held in module scope.
 *
 * Only the 5-character UNLOCODE is sent to the parent via onChange, and the input shows it once
 * committed, with the port's label in the message below.
 * When input is invalid, similar curated suggestions are shown inline.
 */

import { useState, useRef, useEffect, useId } from 'react'
import { ComboBox } from '../ui'

// ---------------------------------------------------------------------------
// Curated port list
// ---------------------------------------------------------------------------

interface CuratedPort {
  code: string   // 5-char UN/LOCODE
  label: string  // "City, Country" for display
}

const CURATED_PORTS: CuratedPort[] = [
  // Sri Lanka
  { code: 'LKCMB', label: 'Colombo, Sri Lanka' },
  // Middle East
  { code: 'AEJEA', label: 'Jebel Ali, UAE' },
  { code: 'OMSLL', label: 'Salalah, Oman' },
  { code: 'QAHMD', label: 'Hamad Port, Qatar' },
  // Southeast Asia
  { code: 'SGSIN', label: 'Singapore' },
  { code: 'MYPKG', label: 'Port Klang, Malaysia' },
  // India
  { code: 'INNSA', label: 'Nhava Sheva, India' },
  { code: 'INMAA', label: 'Chennai, India' },
  { code: 'INMUN', label: 'Mundra, India' },
  // Europe
  { code: 'NLRTM', label: 'Rotterdam, Netherlands' },
  { code: 'DEHAM', label: 'Hamburg, Germany' },
  { code: 'BEANR', label: 'Antwerp, Belgium' },
  { code: 'GBFXT', label: 'Felixstowe, UK' },
  { code: 'FRLEH', label: 'Le Havre, France' },
  { code: 'ESBCN', label: 'Barcelona, Spain' },
  { code: 'ITGOA', label: 'Genova, Italy' },
  { code: 'GRPIR', label: 'Piraeus, Greece' },
  // China
  { code: 'CNSHA', label: 'Shanghai, China' },
  { code: 'CNNGB', label: 'Ningbo, China' },
  { code: 'CNTAO', label: 'Qingdao, China' },
  { code: 'CNYTN', label: 'Yantian (Shenzhen), China' },
  // Northeast Asia
  { code: 'HKHKG', label: 'Hong Kong' },
  { code: 'TWKHH', label: 'Kaohsiung, Taiwan' },
  { code: 'KRPUS', label: 'Busan, South Korea' },
  { code: 'JPTYO', label: 'Tokyo, Japan' },
  { code: 'JPOSA', label: 'Osaka, Japan' },
  { code: 'JPNGO', label: 'Nagoya, Japan' },
  // USA (standard UN/LOCODEs — absent from ports.json but authoritative)
  { code: 'USLAX', label: 'Los Angeles, USA' },
  { code: 'USLGB', label: 'Long Beach, USA' },
  { code: 'USNYC', label: 'New York, USA' },
  { code: 'USSAV', label: 'Savannah, USA' },
  { code: 'USHOU', label: 'Houston, USA' },
  { code: 'USSEA', label: 'Seattle, USA' },
  // Canada
  { code: 'CAVAN', label: 'Vancouver, Canada' },
  { code: 'CAMTR', label: 'Montreal, Canada' },
  // Oceania
  { code: 'AUMEL', label: 'Melbourne, Australia' },
  { code: 'AUSYD', label: 'Sydney, Australia' },
  { code: 'AUBNE', label: 'Brisbane, Australia' },
  { code: 'NZAKL', label: 'Auckland, New Zealand' },
  // Africa
  { code: 'KEMBA', label: 'Mombasa, Kenya' },
  { code: 'ZADUR', label: 'Durban, South Africa' },
]

// ---------------------------------------------------------------------------
// Full ports.json — fetched lazily, cached in module scope
// ---------------------------------------------------------------------------

let fullPortsCache: Record<string, string> | null = null
// Reverse map: normalised label → UNLOCODE (built once from fullPortsCache)
let reversePortsCache: Map<string, string> | null = null

async function getFullPorts(): Promise<Record<string, string>> {
  if (fullPortsCache) return fullPortsCache
  const res = await fetch('/ports.json')
  if (!res.ok) throw new Error('ports.json not available')
  fullPortsCache = (await res.json()) as Record<string, string>
  return fullPortsCache
}

async function getReversePorts(): Promise<Map<string, string>> {
  if (reversePortsCache) return reversePortsCache
  const allPorts = await getFullPorts()
  reversePortsCache = new Map()
  for (const [code, label] of Object.entries(allPorts)) {
    reversePortsCache.set(normPort(label), code)
  }
  return reversePortsCache
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a port label for loose comparison.
 * Treats "/", "," and whitespace as equivalent separators.
 * "Rotterdam/Netherlands", "Rotterdam, Netherlands", "Rotterdam Netherlands"
 * all normalise to "rotterdam netherlands".
 */
function normPort(s: string): string {
  return s.toLowerCase().replace(/[/,]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function curatedLabel(code: string): string | undefined {
  return CURATED_PORTS.find(p => p.code === code)?.label
}

function filterCurated(query: string): CuratedPort[] {
  const q = query.toLowerCase().trim()
  if (!q) return CURATED_PORTS
  const qNorm = normPort(q)
  return CURATED_PORTS.filter(p => {
    const code = p.code.toLowerCase()
    const label = p.label.toLowerCase()
    return code.includes(q) || label.includes(q) || normPort(p.label).includes(qNorm)
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Validation =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'valid'; label: string }
  | { status: 'invalid'; similar: CuratedPort[] }

interface PortComboboxProps {
  value: string
  onChange: (code: string) => void
  placeholder?: string
  id?: string
  /** Names the input from a visible label (e.g. Field's). When set, the placeholder-based aria-label is dropped so the name is exactly the label. */
  'aria-labelledby'?: string
  style?: React.CSSProperties
}

// The list is already narrowed by filterCurated (which also accepts "Port/Country"), so the
// ComboBox must not filter it again.
const showAll = () => true

export default function PortCombobox({ value, onChange, placeholder, id, 'aria-labelledby': ariaLabelledby, style }: PortComboboxProps) {
  // inputText is what shows in the input:
  //   - While searching: raw query (e.g. "hamb")
  //   - When committed: the UNLOCODE (e.g. "DEHAM"), with its label in the message below
  const [inputText, setInputText] = useState<string>(value)
  const [validation, setValidation] = useState<Validation>({ status: 'idle' })

  const isFocusedRef = useRef(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const messageId = useId()

  // Sync external value changes (e.g., form reset) into display, but don't
  // override the user's live input while they're focused.
  useEffect(() => {
    if (isFocusedRef.current) return
    if (!value) {
      setInputText('')
      setValidation({ status: 'idle' })
    } else {
      const lbl = curatedLabel(value)
      setInputText(value)
      if (lbl) setValidation({ status: 'valid', label: lbl })
    }
  }, [value])

  const suggestions = filterCurated(inputText).map(p => ({ value: p.code, description: p.label }))

  function commitPort(port: CuratedPort) {
    setInputText(port.code)
    setValidation({ status: 'valid', label: port.label })
    onChange(port.code)
  }

  // Called on every keystroke, and with the code when a port is picked from the list.
  function handleInputChange(text: string) {
    setInputText(text)
    setValidation({ status: 'idle' })

    if (!text.trim()) {
      onChange('')
      return
    }

    // Auto-commit if the user typed (or picked) an exact curated UNLOCODE
    const exact = CURATED_PORTS.find(p => p.code === text.trim().toUpperCase())
    if (exact) commitPort(exact)
  }

  async function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    // Focus moving between the input and the "Did you mean" buttons is not a blur of the field
    if (e.currentTarget.contains(e.relatedTarget)) return
    isFocusedRef.current = false

    const raw = inputText.trim()
    if (!raw || validation.status === 'valid') return

    // 1. Extract leading token as a potential UNLOCODE (letters/digits only)
    const potentialCode = raw.split(/[\s—-]+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '')

    // 2. Check curated list by code
    const curatedByCode = CURATED_PORTS.find(p => p.code === potentialCode)
    if (curatedByCode) { commitPort(curatedByCode); return }

    // 3. Check curated list by label using normalised comparison
    //    Accepts "Colombo/Sri Lanka", "Colombo, Sri Lanka", "colombo sri lanka", etc.
    const rawNorm = normPort(raw)
    const curatedByLabel = CURATED_PORTS.find(p => normPort(p.label) === rawNorm)
    if (curatedByLabel) { commitPort(curatedByLabel); return }

    if (raw.length < 3) return

    // 4. Validate against full ports.json
    setValidation({ status: 'validating' })
    try {
      const allPorts = await getFullPorts()

      // 4a. Try as UNLOCODE key (e.g. "NLRTM")
      if (potentialCode.length >= 3) {
        const lbl = allPorts[potentialCode]
        if (lbl) {
          setInputText(potentialCode)
          setValidation({ status: 'valid', label: lbl })
          onChange(potentialCode)
          return
        }
      }

      // 4b. Try as Port/Country value (e.g. "Rotterdam/Netherlands").
      //     Uses the reverse map (built once, then cached) for O(1) lookup.
      const reverseMap = await getReversePorts()
      const codeFromLabel = reverseMap.get(rawNorm)
      if (codeFromLabel) {
        const portLabel = allPorts[codeFromLabel]
        setInputText(codeFromLabel)
        setValidation({ status: 'valid', label: portLabel })
        onChange(codeFromLabel)
        return
      }

      // 4c. Not found — show similar curated suggestions
      const words = raw.toLowerCase().split(/[\s/,]+/).filter(w => w.length >= 2)
      const similar = CURATED_PORTS.filter(p =>
        words.some(w => p.code.toLowerCase().includes(w) || normPort(p.label).includes(w))
      ).slice(0, 5)
      setValidation({ status: 'invalid', similar })
      onChange('')
    } catch {
      // ports.json unavailable — pass a 5-char alphanumeric token through as-is
      if (potentialCode.length === 5) onChange(potentialCode)
      setValidation({ status: 'idle' })
    }
  }

  function pickSimilar(port: CuratedPort, e: React.MouseEvent<HTMLButtonElement>) {
    // A keyboard press leaves focus on the button, which disappears once the port is valid, so
    // return focus to the input. A mouse click (mousedown is prevented) leaves focus where it was.
    const hadFocus = document.activeElement === e.currentTarget
    commitPort(port)
    if (hadFocus) wrapperRef.current?.querySelector('input')?.focus()
  }

  return (
    <div
      ref={wrapperRef}
      className="flex flex-col gap-0.5"
      style={style}
      onFocus={() => { isFocusedRef.current = true }}
      onBlur={handleBlur}
    >
      <ComboBox
        items={suggestions}
        filter={showAll}
        value={inputText}
        onChange={handleInputChange}
        placeholder={placeholder ?? 'Type port name or UNLOCODE'}
        aria-label={ariaLabelledby ? undefined : (placeholder ?? 'Type port name or UNLOCODE')}
        aria-labelledby={ariaLabelledby}
        aria-describedby={validation.status === 'idle' ? undefined : messageId}
        isInvalid={validation.status === 'invalid'}
        id={id}
        menuTrigger="focus"
      />

      <div id={messageId} className="text-label">
        {validation.status === 'validating' && (
          <span className="text-fg-muted">Checking port...</span>
        )}
        {validation.status === 'valid' && (
          <span className="text-success">✓ {validation.label}</span>
        )}
        {validation.status === 'invalid' && (
          <span className="text-danger">
            Port not recognised.
            {validation.similar.length > 0 && (
              <> Did you mean:{' '}
                {validation.similar.map((p, i) => (
                  <span key={p.code}>
                    <button
                      type="button"
                      className="border-none bg-transparent p-0 text-label text-primary underline"
                      onMouseDown={e => e.preventDefault()}
                      onClick={e => pickSimilar(p, e)}
                    >
                      {p.code}
                    </button>
                    {i < validation.similar.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
