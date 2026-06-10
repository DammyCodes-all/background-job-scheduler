# Design System — Job Scheduler UI

Dark engineering dashboard. Precise, dense, data-forward. No decoration that doesn't carry information.

---

## Colors

### Backgrounds
Four layers. Each one slightly lighter than the last — this is how depth works without shadows.

| Token | Hex | Use |
|---|---|---|
| `--bg-base` | `#0a0a0b` | Page background |
| `--bg-surface` | `#111113` | Cards, sidebar, panels |
| `--bg-elevated` | `#1a1a1e` | Modals, dropdowns, hover states |
| `--bg-subtle` | `#222228` | Input fills, table header background |

### Borders
| Token | Hex | Use |
|---|---|---|
| `--border-base` | `#2a2a32` | Default — cards, table rows, inputs |
| `--border-strong` | `#3a3a45` | Focused inputs, active elements |

### Text
| Token | Hex | Use |
|---|---|---|
| `--text-primary` | `#f0f0f5` | Headings, numbers, important values |
| `--text-secondary` | `#9090a0` | Labels, metadata, descriptions |
| `--text-muted` | `#55555f` | Placeholders, disabled, timestamps |

### Accent
One color. Used sparingly — buttons, focus rings, active nav only.

| Token | Hex | Use |
|---|---|---|
| `--accent` | `#6e56cf` | Primary buttons, active nav indicator, focused borders |
| `--accent-hover` | `#7c66d5` | Button hover |
| `--accent-subtle` | `rgba(110,86,207,0.12)` | Selected row bg, active nav bg, row flash |
| `--accent-border` | `rgba(110,86,207,0.4)` | Accent-tinted border |

### Status
Muted saturation — these are data signals, not decorations.

| Token | Hex | Background (12% opacity) |
|---|---|---|
| `--status-pending` | `#f5a623` | `rgba(245,166,35,0.10)` |
| `--status-processing` | `#4a9eff` | `rgba(74,158,255,0.10)` |
| `--status-completed` | `#3dd68c` | `rgba(61,214,140,0.10)` |
| `--status-failed` | `#ff5555` | `rgba(255,85,85,0.10)` |
| `--status-cancelled` | `#666675` | `rgba(102,102,117,0.10)` |

### Priority
| Value | Color |
|---|---|
| 1 — High | `#ff5555` |
| 2 — Medium | `#f5a623` |
| 3 — Low | `#3dd68c` |

---

## Typography

Two fonts. That's it.

- **UI font** — `Inter` — all labels, nav, buttons, descriptions, headings
- **Mono font** — `JetBrains Mono` — all numbers, IDs, payloads, timestamps, error messages, anything that came from the database

### Scale
Base is 14px — dashboard density, not marketing page.

| Token | Size | Use |
|---|---|---|
| `--text-xs` | `11px` | Timestamps, column headers, metadata |
| `--text-sm` | `12px` | Table cells, badge text, labels |
| `--text-base` | `14px` | Body default |
| `--text-md` | `16px` | Section headings, drawer titles |
| `--text-lg` | `20px` | Page titles |
| `--text-xl` | `28px` | Stat card numbers |

### Line height
- UI text: `1.4`
- Body text: `1.6`

### Letter spacing
- Column headers: `0.10em` — always uppercase + wide tracking
- Stat numbers: `-0.02em` — tight
- Everything else: `0`

---

## Spacing

8pt grid. Every padding, margin, and gap is a multiple of 4.

| Token | Value |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |
| `--space-16` | `64px` |

---

## Border Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `4px` | Badges, chips, tags |
| `--radius-md` | `6px` | Buttons, inputs |
| `--radius-lg` | `8px` | Cards, panels |
| `--radius-xl` | `12px` | Modals, drawers |

---

## Transitions

| Token | Value | Use |
|---|---|---|
| `--transition-fast` | `150ms ease-out` | Color, background changes |
| `--transition-normal` | `200ms ease-out` | Opacity, border changes |
| `--transition-slow` | `250ms ease-in-out` | Transforms, drawer slide |

---

## Shadows

None. Depth comes from background color progression, not shadows.

---

## Icons

Lucide only. Two sizes: `16px` for inline/table use, `20px` for buttons and headings. Always `strokeWidth={1.5}`. Never filled icons. No emoji.

---

## CSS Variables Block

Paste into `index.css` inside `:root`:

```css
:root {
  --bg-base:      #0a0a0b;
  --bg-surface:   #111113;
  --bg-elevated:  #1a1a1e;
  --bg-subtle:    #222228;

  --border-base:  #2a2a32;
  --border-strong:#3a3a45;

  --text-primary:   #f0f0f5;
  --text-secondary: #9090a0;
  --text-muted:     #55555f;

  --accent:         #6e56cf;
  --accent-hover:   #7c66d5;
  --accent-subtle:  rgba(110, 86, 207, 0.12);
  --accent-border:  rgba(110, 86, 207, 0.4);

  --status-pending:           #f5a623;
  --status-pending-bg:        rgba(245, 166, 35, 0.10);
  --status-processing:        #4a9eff;
  --status-processing-bg:     rgba(74, 158, 255, 0.10);
  --status-completed:         #3dd68c;
  --status-completed-bg:      rgba(61, 214, 140, 0.10);
  --status-failed:            #ff5555;
  --status-failed-bg:         rgba(255, 85, 85, 0.10);
  --status-cancelled:         #666675;
  --status-cancelled-bg:      rgba(102, 102, 117, 0.10);

  --font-ui:   'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --text-xs:   11px;
  --text-sm:   12px;
  --text-base: 14px;
  --text-md:   16px;
  --text-lg:   20px;
  --text-xl:   28px;

  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  --transition-fast:   150ms ease-out;
  --transition-normal: 200ms ease-out;
  --transition-slow:   250ms ease-in-out;

  --sidebar-width: 240px;
}
```
