# Workspace Step Interface — Style Guide

Reference implementation: **Step 7 — Booking Request** (`InlineStepForms.tsx`, lines 3269–3488)

All workspace step forms follow the same visual language: a coloured header bar, a bordered table-form body with label–value rows, optional section dividers, and a right-aligned submit button.

---

## 1. Overall Container

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
  {/* Header */}
  {/* Fields table */}
  {/* Submit button */}
</div>
```

- `gap: 0` — the header and table body sit flush (1px gap via `marginBottom: 1` on the header).

---

## 2. Header Bar

```tsx
<div style={{
  padding: '8px 14px',
  background: 'var(--accent)',        // teal — #0f8fa8
  borderRadius: '8px 8px 0 0',       // rounded top corners only
  marginBottom: 1,
}}>
  <span style={{
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: 0.5,
  }}>
    STEP TITLE IN CAPS
  </span>
</div>
```

| Token | Value |
|-------|-------|
| Background | `var(--accent)` / `#0f8fa8` |
| Text colour | `#fff` |
| Font size | `12px` |
| Font weight | `700` |
| Letter spacing | `0.5px` |
| Padding | `8px 14px` |
| Border radius | `8px 8px 0 0` (top-left, top-right only) |

For a **secondary subtitle** (e.g. "Submitted by CS — review and add RA number"):

```tsx
<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginLeft: 10 }}>
  subtitle text
</span>
```

---

## 3. Fields Table (body)

The table body is a single `<div>` with a 1px border and bottom-rounded corners. Each row is a CSS Grid child.

```tsx
<div style={{
  border: '1px solid var(--border)',
  borderRadius: '0 0 8px 8px',       // rounded bottom corners only
  overflow: 'hidden',                  // clips rows to the rounded corners
}}>
  {/* rows ... */}
</div>
```

---

## 4. Standard Field Row

Every row uses `display: grid` with a fixed label column and a fluid value column. Rows are separated by `borderBottom: '1px solid var(--border)'` — the **last row omits** this border.

### Single-value row (label + input)

```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: '140px 1fr',
  borderBottom: '1px solid var(--border)',
}}>
  {/* Label cell */}
  <div style={{
    padding: '8px 12px',
    background: 'var(--bg-card)',
    borderRight: '1px solid var(--border)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
  }}>
    Field Label
  </div>

  {/* Value cell */}
  <div style={{ padding: '4px 8px' }}>
    <input
      className="lt-input"
      style={{
        width: '100%',
        border: 'none',
        background: 'transparent',
        padding: '4px 0',
      }}
      value={value}
      onChange={e => setValue(e.target.value)}
      placeholder="Placeholder text"
    />
  </div>
</div>
```

### Two-value row (two label–input pairs side by side)

```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: '140px 1fr 90px 1fr',    // or '140px 1fr 100px 1fr'
  borderBottom: '1px solid var(--border)',
}}>
  {/* First label */}
  <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
    Label A
  </div>
  {/* First value */}
  <div style={{ padding: '4px 8px', borderRight: '1px solid var(--border)' }}>
    <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }} ... />
  </div>
  {/* Second label — shorter column (90px) */}
  <div style={{ padding: '8px 8px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
    Label B
  </div>
  {/* Second value */}
  <div style={{ padding: '4px 8px' }}>
    <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }} ... />
  </div>
</div>
```

### Read-only row (no input, just text)

```tsx
<div style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
  {readOnlyValue}
</div>
```

---

## 5. Label Cell Tokens

| Property | Standard | Muted (disabled) | Highlighted |
|----------|----------|-------------------|-------------|
| `padding` | `8px 12px` | same | same |
| `background` | `var(--bg-card)` | `var(--bg-card)` | `rgba(14,165,233,0.08)` (blue) or `rgba(22,163,74,0.06)` (green) |
| `fontSize` | `11px` | `11px` | `11px` |
| `fontWeight` | `600` | `600` | `600` |
| `color` | `var(--text-secondary)` | `var(--text-muted)` | `#0ea5e9` (blue) or `#16a34a` (green) |

---

## 6. Section Divider

Used to visually separate groups of fields (e.g. "SPECIAL INSTRUCTIONS"):

```tsx
<div style={{
  padding: '7px 12px',
  background: 'rgba(15,143,168,0.12)',
  borderBottom: '1px solid var(--border)',
}}>
  <span style={{
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: 0.4,
  }}>
    SECTION TITLE IN CAPS
  </span>
</div>
```

---

## 7. Select Inputs

Same base styling as text inputs, used inside value cells:

```tsx
<select
  className="lt-input"
  style={{
    width: '100%',
    border: 'none',
    background: 'transparent',
    padding: '4px 0',
  }}
  value={value}
  onChange={e => setValue(e.target.value)}
>
  <option value="">— Select —</option>
  {items.map(i => <option key={i.id} value={i.value}>{i.label}</option>)}
</select>
```

---

## 8. Radio Button Groups

Rendered inline in the value cell:

```tsx
<div style={{ padding: '6px 10px', display: 'flex', gap: 16, alignItems: 'center' }}>
  {(['Option A', 'Option B'] as const).map(t => (
    <label key={t} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer',
      fontSize: 12,
      color: 'var(--text-secondary)',
    }}>
      <input type="radio" name="group-name" checked={value === t} onChange={() => setValue(t)} />
      {t}
    </label>
  ))}
</div>
```

---

## 9. Dynamic List (e.g. Containers)

A value cell containing a vertical list of inline-editable items with add/remove controls.

### Item row

```tsx
<div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
  {/* Numeric input */}
  <input className="lt-input" type="number" min={1}
    style={{ width: 48, border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', padding: '3px 4px', textAlign: 'center' }}
    value={item.qty} onChange={...} />

  {/* Multiply symbol */}
  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>x</span>

  {/* Select */}
  <select className="lt-input"
    style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', padding: '3px 4px', fontSize: 12 }}
    value={item.type} onChange={...}>
    ...
  </select>

  {/* Remove button (shown only when list.length > 1) */}
  <button type="button"
    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
    title="Remove">
    x
  </button>
</div>
```

### Add button

```tsx
<button type="button"
  style={{
    border: '1px dashed var(--border)',
    borderRadius: 4,
    background: 'transparent',
    cursor: 'pointer',
    padding: '3px 8px',
    fontSize: 11,
    color: 'var(--accent)',
    fontWeight: 600,
    alignSelf: 'flex-start',
    marginTop: 2,
  }}>
  + Add Item
</button>
```

---

## 10. Inline Validation / Error Row

Displayed as a full-width row inside the table when a validation rule is violated:

```tsx
<div style={{
  padding: '6px 12px',
  background: '#fef2f2',
  color: '#dc2626',
  fontSize: 11,
  fontWeight: 600,
}}>
  Error message text.
</div>
```

---

## 11. Submit Button Area

Always right-aligned, below the table, with a top margin:

```tsx
<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
  <button
    className="db-btn primary"
    style={{ background: '#0f8fa8', borderColor: '#0f8fa8' }}
    onClick={handleModalSubmit}
  >
    <Icon size={12} /> Button Label
  </button>
</div>
```

- Uses `className="db-btn primary"` as the base.
- Inline `background` and `borderColor` override the default primary colour to match `var(--accent)` (`#0f8fa8`).
- Icons are `12px` with no explicit margin (the flex gap handles spacing).

---

## 12. Conditional Field Styling

### Disabled / mutually exclusive fields

When one field disables another (e.g. Contract No vs. RA No):

```tsx
// Disabled input wrapper
<div style={{ padding: '4px 8px', opacity: isDisabled ? 0.4 : 1 }}>
  <input ... disabled={isDisabled} placeholder={isDisabled ? 'N/A (other field is set)' : 'Normal placeholder'} />
</div>

// Counterpart label with highlight colour
<div style={{
  padding: '8px 8px',
  background: isActive ? 'rgba(22,163,74,0.06)' : 'var(--bg-card)',
  borderRight: '1px solid var(--border)',
  fontSize: 11,
  fontWeight: 600,
  color: isActive ? '#16a34a' : 'var(--text-muted)',
  display: 'flex',
  alignItems: 'center',
}}>
```

### Contextual row highlight (e.g. Reefer)

When a container type matches a condition, the label cell changes colour:

```tsx
background: isReefer ? 'rgba(14,165,233,0.08)' : 'var(--bg-card)',
color: isReefer ? '#0ea5e9' : 'var(--text-muted)',
```

---

## 13. Colour Reference

| Name | CSS Variable / Hex | Usage |
|------|--------------------|-------|
| Accent / Teal | `var(--accent)` / `#0f8fa8` | Header bg, section divider text, add-item button, submit button |
| White | `#fff` | Header text |
| Card background | `var(--bg-card)` | Label cells |
| Border | `var(--border)` | All table borders, input borders |
| Text primary | `var(--text)` | Read-only values, strong labels |
| Text secondary | `var(--text-secondary)` | Label cells, radio labels, input text |
| Text muted | `var(--text-muted)` | Counts, secondary info, disabled labels |
| Success green | `#16a34a` | RA-number highlight, accepted states |
| Error red | `#dc2626` | Validation errors, remove button |
| Error bg | `#fef2f2` | Validation error row background |
| Info blue | `#0ea5e9` | Reefer highlight |
| Green tint bg | `rgba(22,163,74,0.06)` | Active RA-number label bg |
| Blue tint bg | `rgba(14,165,233,0.08)` | Reefer label bg |
| Section divider bg | `rgba(15,143,168,0.12)` | Section separator row |

---

## 14. Typography Scale

| Element | Size | Weight | Spacing |
|---------|------|--------|---------|
| Header title | `12px` | `700` | `0.5px` |
| Header subtitle | `11px` | normal | — |
| Label cell | `11px` | `600` | — |
| Section divider | `11px` | `700` | `0.4px` |
| Input / select | inherits from `lt-input` (~`12px`) | normal | — |
| Radio label | `12px` | normal | — |
| Read-only value | `12px` | `600` | — |
| Dynamic list numeric input | inherits | normal | — |
| Add-item button | `11px` | `600` | — |
| Validation error | `11px` | `600` | — |
| Counter badge | `9px` | normal | — |

---

## 15. Spacing Tokens

| Token | Value | Where |
|-------|-------|-------|
| Header padding | `8px 14px` | Header bar |
| Label cell padding | `8px 12px` | Standard label cells |
| Label cell padding (narrow) | `8px 8px` | Second label in two-value rows |
| Value cell padding | `4px 8px` | All value cells |
| Input padding | `4px 0` | Text/date/number inputs inside value cells |
| Dynamic item gap | `6px` | Between qty, symbol, select, remove button |
| Dynamic list gap | `4px` | Between list items vertically |
| Radio group gap | `16px` | Between radio options |
| Submit area margin | `20px` top | Between table and submit button |
| Submit button gap | `10px` | Between multiple buttons |

---

## 16. Quick-Start Template

Copy this skeleton for a new step form:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
  {/* Header */}
  <div style={{ padding: '8px 14px', background: 'var(--accent)', borderRadius: '8px 8px 0 0', marginBottom: 1 }}>
    <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>STEP NAME</span>
  </div>

  {/* Fields */}
  <div style={{ border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>

    {/* Row — single value */}
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
      <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Label</div>
      <div style={{ padding: '4px 8px' }}>
        <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }} value={val} onChange={e => setVal(e.target.value)} placeholder="..." />
      </div>
    </div>

    {/* Section divider */}
    <div style={{ padding: '7px 12px', background: 'rgba(15,143,168,0.12)', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: 0.4 }}>SECTION</span>
    </div>

    {/* Last row — no borderBottom */}
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
      <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Last Field</div>
      <div style={{ padding: '4px 8px' }}>
        <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }} value={val2} onChange={e => setVal2(e.target.value)} placeholder="..." />
      </div>
    </div>
  </div>

  {/* Submit */}
  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
    <button className="db-btn primary" style={{ background: '#0f8fa8', borderColor: '#0f8fa8' }} onClick={handleModalSubmit}>
      <Icon size={12} /> Submit
    </button>
  </div>
</div>
```
