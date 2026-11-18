# Track & Trace Interface — Style Guide

Reference implementation: **TrackAndTrace.tsx**

The Track & Trace page follows a search-first pattern: a search form card at top, followed by expandable container cards, each containing a vertical event timeline. All inline styles use CSS variables from the design system.

---

## 1. Page Layout

```tsx
<div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
  {/* Page title */}
  {/* Search card */}
  {/* Results summary */}
  {/* Container cards */}
  {/* Empty / initial states */}
</div>
```

| Token | Value |
|-------|-------|
| Padding | `24px` |
| Max width | `1200px` |
| Centering | `margin: '0 auto'` |

---

## 2. Page Title

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
  <Radar size={18} style={{ color: '#0f8fa8' }} />
  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
    Track &amp; Trace
  </h2>
</div>
```

| Token | Value |
|-------|-------|
| Icon size | `18px` |
| Icon colour | `#0f8fa8` (accent) |
| Title font size | `18px` |
| Title font weight | `700` |
| Title colour | `var(--text)` |
| Gap (icon ↔ text) | `8px` |
| Margin bottom | `16px` |

---

## 3. Search Form Card

A bordered rounded card containing a section label, a 2-column grid of inputs, and a right-aligned search button.

```tsx
<div style={{
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 18,
  marginBottom: 20,
  background: 'var(--bg-card, #fff)',
}}>
```

| Token | Value |
|-------|-------|
| Border | `1px solid var(--border)` |
| Border radius | `10px` |
| Padding | `18px` |
| Margin bottom | `20px` |
| Background | `var(--bg-card, #fff)` |

### 3a. Section Label (inside card)

```tsx
<div style={{
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  marginBottom: 10,
  letterSpacing: 0.3,
  textTransform: 'uppercase',
}}>
  SEARCH BY REFERENCE
</div>
```

| Token | Value |
|-------|-------|
| Font size | `11px` |
| Font weight | `700` |
| Colour | `var(--text-secondary)` |
| Letter spacing | `0.3px` |
| Text transform | `uppercase` |
| Margin bottom | `10px` |

### 3b. Input Grid

```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  marginBottom: 14,
}}>
```

| Token | Value |
|-------|-------|
| Columns | `1fr 1fr` (2 equal) |
| Gap | `12px` |
| Margin bottom | `14px` |

### 3c. Input Field (label + input)

```tsx
<div>
  <label style={{
    fontSize: 10,
    color: 'var(--text-muted)',
    marginBottom: 3,
    display: 'block',
  }}>
    Field Label
  </label>
  <input style={{
    width: '100%',
    padding: '7px 10px',
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-card, #fff)',
    color: 'var(--text)',
    outline: 'none',
  }} />
</div>
```

| Token | Value |
|-------|-------|
| Label font size | `10px` |
| Label colour | `var(--text-muted)` |
| Label margin bottom | `3px` |
| Input padding | `7px 10px` |
| Input font size | `12px` |
| Input border radius | `6px` |
| Input border | `1px solid var(--border)` |
| Input background | `var(--bg-card, #fff)` |
| Input text colour | `var(--text)` |

### 3d. Search Button

```tsx
<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
  <button
    className="db-btn primary"
    style={{
      fontSize: 11,
      padding: '6px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: '#0f8fa8',
      borderColor: '#0f8fa8',
    }}
  >
    <Search size={14} />
    Search
  </button>
</div>
```

| Token | Value |
|-------|-------|
| Button class | `db-btn primary` |
| Font size | `11px` |
| Padding | `6px 20px` |
| Icon size | `14px` |
| Icon ↔ label gap | `6px` |
| Background | `#0f8fa8` |
| Border colour | `#0f8fa8` |

---

## 4. Results Summary

A single-line muted summary shown above the container cards.

```tsx
<div style={{
  fontSize: 11,
  color: 'var(--text-muted)',
  marginBottom: 10,
  padding: '0 2px',
}}>
  3 containers · 12 events
</div>
```

---

## 5. Container Card

Each tracked container is an expandable card with a click-to-toggle header and an event timeline body.

### 5a. Card Wrapper

```tsx
<div style={{
  border: '1px solid var(--border)',
  borderRadius: 10,
  overflow: 'hidden',
  background: 'var(--bg-card, #fff)',
}}>
```

| Token | Value |
|-------|-------|
| Border | `1px solid var(--border)` |
| Border radius | `10px` |
| Overflow | `hidden` |
| Background | `var(--bg-card, #fff)` |

Cards are stacked with `gap: 12` in a flex column.

### 5b. Card Header (click to expand/collapse)

```tsx
<div
  onClick={() => setExpanded(e => !e)}
  style={{
    padding: '12px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    background: expanded ? 'rgba(15,143,168,0.03)' : 'transparent',
    borderBottom: expanded ? '1px solid var(--border)' : 'none',
  }}
>
```

| Token | Value |
|-------|-------|
| Padding | `12px 16px` |
| Gap | `12px` |
| Expanded bg | `rgba(15,143,168,0.03)` |
| Collapsed bg | `transparent` |
| Expanded border-bottom | `1px solid var(--border)` |

#### Chevron

```tsx
<div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
</div>
```

#### Container Identifiers (left section)

```tsx
<div style={{ flex: 1, minWidth: 200 }}>
  {/* Primary: Equipment reference + size badge */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
    {/* Icon + container number */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Package size={12} style={{ color: '#0f8fa8' }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.3 }}>
        MSCU1234567
      </span>
    </div>
    {/* Size type badge */}
    <span style={{
      fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
      background: 'rgba(15,143,168,0.08)', color: '#0f8fa8',
    }}>
      40 FT HIGH CUBE
    </span>
  </div>

  {/* Secondary: reference numbers */}
  <div style={{
    display: 'flex', gap: 12, marginTop: 3,
    fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap',
  }}>
    <span>B/L: <b style={{ color: 'var(--text-secondary)' }}>MEDU123456789</b></span>
    <span>Booking: <b style={{ color: 'var(--text-secondary)' }}>2742429380</b></span>
    <span>Carrier: <b style={{ color: 'var(--text-secondary)' }}>MEDU</b></span>
  </div>
</div>
```

| Element | Size | Weight | Colour |
|---------|------|--------|--------|
| Container number | `13px` | `700` | `var(--text)` |
| Size type badge | `9px` | `600` | `#0f8fa8` on `rgba(15,143,168,0.08)` |
| Reference labels | `10px` | normal | `var(--text-muted)` |
| Reference values | `10px` | `bold` | `var(--text-secondary)` |

#### Latest Event Badge (right section)

```tsx
<div style={{ textAlign: 'right', flexShrink: 0 }}>
  <div style={{
    fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
    background: latestStyle.bg, color: latestStyle.color, display: 'inline-block',
  }}>
    Vessel Departure
  </div>
  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
    01 Dec 14:00 · Colombo
  </div>
</div>
```

| Token | Value |
|-------|-------|
| Badge font size | `10px` |
| Badge font weight | `700` |
| Badge padding | `3px 10px` |
| Badge border radius | `6px` |
| Badge colours | From `EVENT_STYLE` map (see Section 8) |
| Sub-text font size | `9px` |
| Sub-text colour | `var(--text-muted)` |

#### Event Count Pill

```tsx
<div style={{
  fontSize: 10, color: 'var(--text-muted)',
  background: 'rgba(100,116,139,0.06)',
  padding: '2px 8px', borderRadius: 10,
  fontWeight: 600, flexShrink: 0,
}}>
  5 events
</div>
```

### 5c. Card Body (expanded)

```tsx
<div style={{ padding: '14px 16px' }}>
  <EventTimeline events={container.events} />
</div>
```

---

## 6. Event Timeline

A vertical timeline with coloured dots connected by a spine. Events are sorted most-recent-first.

### 6a. Timeline Row

```tsx
<div style={{ display: 'flex', gap: 12 }}>
  {/* Timeline spine (left) */}
  {/* Event card (right) */}
</div>
```

### 6b. Timeline Spine

```tsx
<div style={{
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', width: 20, flexShrink: 0,
}}>
  {/* Dot */}
  <div style={{
    width: 10, height: 10, borderRadius: '50%',
    background: style.color,
    border: `2px solid ${style.color}`,
    flexShrink: 0, marginTop: 4,
  }} />
  {/* Connector line (omit on last event) */}
  <div style={{
    width: 2, flex: 1,
    background: 'var(--border)',
    minHeight: 20,
  }} />
</div>
```

| Token | Value |
|-------|-------|
| Spine width | `20px` |
| Dot size | `10px` |
| Dot border | `2px solid {event colour}` |
| Dot fill | Event colour |
| Dot margin top | `4px` |
| Connector width | `2px` |
| Connector colour | `var(--border)` |
| Connector min height | `20px` |

### 6c. Event Card

```tsx
<div style={{
  flex: 1, padding: '8px 12px', marginBottom: 8,
  background: 'var(--bg-card, #fff)',
  border: '1px solid var(--border)',
  borderRadius: 8,
}}>
```

| Token | Value |
|-------|-------|
| Padding | `8px 12px` |
| Margin bottom | `8px` |
| Border | `1px solid var(--border)` |
| Border radius | `8px` |
| Background | `var(--bg-card, #fff)` |

#### Event Card Header Row

```tsx
<div style={{
  display: 'flex', alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap', gap: 6, marginBottom: 4,
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    {/* Event type code badge */}
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
      background: style.bg, color: style.color, whiteSpace: 'nowrap',
    }}>
      VD
    </span>
    {/* Description */}
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
      Vessel Departure
    </span>
    {/* Classifier */}
    <span style={{ fontSize: 8, fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>
      Actual
    </span>
  </div>
  {/* Timestamp */}
  <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
    01 Dec 14:00
  </span>
</div>
```

| Element | Size | Weight | Colour |
|---------|------|--------|--------|
| Event code badge | `9px` | `700` | Event colour on event bg |
| Badge padding | — | — | `2px 7px`, radius `4px` |
| Description | `11px` | `600` | `var(--text)` |
| "Actual" classifier | `8px` | `600` | `#16a34a` |
| "Estimated" classifier | `8px` | `600` | `#d97706` |
| Timestamp | `10px` | normal | `var(--text-muted)` |

#### Event Card Detail Row

```tsx
<div style={{
  display: 'flex', flexWrap: 'wrap', gap: 12,
  fontSize: 10, color: 'var(--text-secondary)',
}}>
  {/* Location */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
    <MapPin size={9} style={{ opacity: 0.6 }} />
    <span>Colombo (LKCMB)</span>
    <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>, Sri Lanka</span>
  </div>

  {/* Vessel */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
    <Ship size={9} style={{ opacity: 0.6 }} />
    <span>CMA CGM ZHENG HE / 0FL73E1MA</span>
  </div>

  {/* Load status badge */}
  <span style={{
    fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
    background: 'rgba(22,163,74,0.08)', color: '#16a34a',  /* Loaded */
  }}>
    Loaded on Vessel
  </span>
</div>
```

| Token | Value |
|-------|-------|
| Gap between items | `12px` |
| Font size | `10px` |
| Colour | `var(--text-secondary)` |
| Icon size | `9px` |
| Icon opacity | `0.6` |
| Country name | `9px`, `var(--text-muted)` |
| Load badge (loaded) | `#16a34a` on `rgba(22,163,74,0.08)` |
| Load badge (empty) | `#64748b` on `rgba(100,116,139,0.08)` |

#### Transportation Route (POL → POD)

```tsx
<div style={{
  display: 'flex', alignItems: 'center', gap: 6,
  marginTop: 5, fontSize: 9, color: 'var(--text-muted)',
}}>
  <span>POL: LKCMB (ATD: 01 Dec 14:00)</span>
  <span>&rarr;</span>
  <span>POD: DEHAM (ETA: 22 Dec 08:00)</span>
</div>
```

| Token | Value |
|-------|-------|
| Font size | `9px` |
| Colour | `var(--text-muted)` |
| Margin top | `5px` |
| Gap | `6px` |

---

## 7. Empty / Loading / Initial States

### Loading spinner

```tsx
<div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
  <Loader2 size={20} className="spin" style={{ marginBottom: 6 }} />
  <div style={{ fontSize: 12 }}>Searching tracking events...</div>
</div>
```

### No results

```tsx
<div style={{
  padding: 20,
  background: 'rgba(100,116,139,0.04)',
  border: '1px solid rgba(100,116,139,0.15)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text-muted)',
  textAlign: 'center',
}}>
  No tracking events found for the provided references.
</div>
```

### Initial state (nothing searched yet)

```tsx
<div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
  <Radar size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
  <div style={{ fontSize: 12 }}>
    Enter a booking reference, bill of lading, or container number to track shipments.
  </div>
</div>
```

---

## 8. Event Type Colour Map

Each event type code maps to a colour and background pair.

| Code | Description | Colour | Background |
|------|-------------|--------|------------|
| `EE` | Gate Out (Empty) | `#64748b` | `rgba(100,116,139,0.1)` |
| `I` | Gate In | `#2563eb` | `rgba(37,99,235,0.1)` |
| `AE` | Vessel Load | `#0891b2` | `rgba(8,145,178,0.1)` |
| `VD` | Vessel Departure | `#16a34a` | `rgba(22,163,74,0.1)` |
| `VA` | Vessel Arrival | `#d97706` | `rgba(217,119,6,0.1)` |
| `UV` | Vessel Discharge | `#7c3aed` | `rgba(124,58,237,0.1)` |
| `OA` | Gate Out (Full) | `#059669` | `rgba(5,150,105,0.1)` |
| *default* | Unknown code | `#64748b` | `rgba(100,116,139,0.1)` |

Usage: event code badges, timeline dots, and latest-event badges all pull from this map.

---

## 9. Colour Reference

| Name | CSS Variable / Hex | Usage |
|------|--------------------|-------|
| Accent / Teal | `#0f8fa8` | Page title icon, container number icon, size badge, search button, expanded card bg tint |
| Accent tint bg | `rgba(15,143,168,0.08)` | Size type badge background |
| Accent subtle bg | `rgba(15,143,168,0.03)` | Expanded card header background |
| Card background | `var(--bg-card, #fff)` | Search card, container cards, event cards, inputs |
| Border | `var(--border)` | All card/input borders, timeline connector |
| Text primary | `var(--text)` | Page title, container number, event description |
| Text secondary | `var(--text-secondary)` | Section label, reference values, detail row text |
| Text muted | `var(--text-muted)` | Input labels, timestamps, reference labels, route text, event count |
| Success green | `#16a34a` | "Actual" classifier, loaded badge |
| Warning amber | `#d97706` | "Estimated" classifier, VA event colour |
| Slate grey | `#64748b` | Default/EE event colour |
| Blue | `#2563eb` | Gate In event colour |
| Cyan | `#0891b2` | Vessel Load event colour |
| Purple | `#7c3aed` | Vessel Discharge event colour |
| Emerald | `#059669` | Gate Out (Full) event colour |
| Neutral pill bg | `rgba(100,116,139,0.06)` | Event count pill, no-results background |

---

## 10. Typography Scale

| Element | Size | Weight | Spacing |
|---------|------|--------|---------|
| Page title | `18px` | `700` | — |
| Section label (search card) | `11px` | `700` | `0.3px` |
| Input label | `10px` | normal | — |
| Input text | `12px` | normal | — |
| Search button | `11px` | inherits `db-btn` | — |
| Results summary | `11px` | normal | — |
| Container number | `13px` | `700` | `0.3px` |
| Size type badge | `9px` | `600` | — |
| Reference labels | `10px` | normal | — |
| Reference values | `10px` | `bold` | — |
| Latest event badge | `10px` | `700` | — |
| Latest event sub-text | `9px` | normal | — |
| Event count pill | `10px` | `600` | — |
| Event code badge | `9px` | `700` | — |
| Event description | `11px` | `600` | — |
| Event classifier | `8px` | `600` | — |
| Event timestamp | `10px` | normal | — |
| Detail row text | `10px` | normal | — |
| Country name | `9px` | normal | — |
| Load status badge | `9px` | `600` | — |
| Route text (POL/POD) | `9px` | normal | — |
| Empty state text | `12px` | normal | — |

---

## 11. Spacing Tokens

| Token | Value | Where |
|-------|-------|-------|
| Page padding | `24px` | Outer wrapper |
| Page max width | `1200px` | Outer wrapper |
| Page title margin bottom | `16px` | Below title |
| Search card padding | `18px` | Search form card |
| Search card margin bottom | `20px` | Below search card |
| Search card border radius | `10px` | Search form card |
| Input grid gap | `12px` | Between input fields |
| Input grid margin bottom | `14px` | Below grid, before button |
| Input padding | `7px 10px` | Text inputs |
| Input border radius | `6px` | Text inputs |
| Results summary margin bottom | `10px` | Above container cards |
| Container card gap | `12px` | Between stacked cards |
| Container card border radius | `10px` | Card wrapper |
| Card header padding | `12px 16px` | Container card header |
| Card body padding | `14px 16px` | Expanded timeline area |
| Timeline row gap | `12px` | Spine ↔ event card |
| Timeline dot size | `10px` | Coloured dot |
| Timeline connector width | `2px` | Vertical line |
| Event card padding | `8px 12px` | Individual event |
| Event card margin bottom | `8px` | Between events |
| Event card border radius | `8px` | Individual event |
| Detail row gap | `12px` | Between location/vessel/badge |
| Route margin top | `5px` | POL → POD line |
| Loading padding | `32px` | Spinner area |
| Empty state padding | `40px 16px` | Initial/no-results area |

---

## 12. Quick-Start Template

Copy this skeleton for a search-and-display page with expandable result cards:

```tsx
import { useState } from 'react'
import { Search, Loader2, ChevronDown, ChevronRight } from 'lucide-react'

export default function MySearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--bg-card, #fff)',
    color: 'var(--text)', outline: 'none',
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Icon size={18} style={{ color: '#0f8fa8' }} />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Page Title</h2>
      </div>

      {/* Search card */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 20, background: 'var(--bg-card, #fff)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: 0.3, textTransform: 'uppercase' }}>
          SEARCH SECTION
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Field</label>
            <input style={inputStyle} value={query} onChange={e => setQuery(e.target.value)} placeholder="..." />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="db-btn primary" style={{ fontSize: 11, padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 6, background: '#0f8fa8', borderColor: '#0f8fa8' }}>
            <Search size={14} /> Search
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="spin" style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 12 }}>Searching...</div>
        </div>
      )}

      {/* No results */}
      {!loading && searched && results.length === 0 && (
        <div style={{ padding: 20, background: 'rgba(100,116,139,0.04)', border: '1px solid rgba(100,116,139,0.15)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          No results found.
        </div>
      )}

      {/* Result cards */}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.map((item, i) => (
            <ResultCard key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function ResultCard({ item }: { item: Item }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-card, #fff)' }}>
      <div onClick={() => setExpanded(e => !e)} style={{
        padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
        background: expanded ? 'rgba(15,143,168,0.03)' : 'transparent',
        borderBottom: expanded ? '1px solid var(--border)' : 'none',
      }}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Item Title</span>
      </div>
      {expanded && (
        <div style={{ padding: '14px 16px' }}>
          {/* Detail content */}
        </div>
      )}
    </div>
  )
}
```
