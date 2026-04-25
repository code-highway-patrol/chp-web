# Styling guide

All styles live in a single file: `src/index.css`. No UI kit, no Tailwind, no CSS-in-JS. Components reference class names; the CSS file is the source of truth.

This guide documents the design tokens, conventions, and the major component patterns so contributors can extend the page without breaking the visual language.

## Philosophy

- One stylesheet. If you can't find a rule, search `index.css` first.
- Hand-styled. No utility classes; no `className` strings longer than two or three words.
- Tokens not literals. Color, line, and accent values come from CSS custom properties, not raw `oklch(...)` calls in components.
- Motion is muted by default. Anything animated honors `prefers-reduced-motion: reduce`.

## Color system

Colors use OKLCH so brightness is perceptual and theme switches are predictable. All tokens are declared on `:root` and overridden on `body.dark`.

### Surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | near white | near black | Page background |
| `--bg-elev` | slightly off bg | slightly off bg | Hover states, raised cards |
| `--bg-deep` | dark grey | nearly black | Code editors, terminal mocks, asphalt |

### Ink (text)

| Token | Use |
|---|---|
| `--ink` | Primary copy, headings |
| `--ink-2` | Secondary copy, body paragraphs |
| `--ink-3` | Tertiary copy, eyebrows, kickers, mono labels |

### Lines

| Token | Use |
|---|---|
| `--line` | Section dividers, table cells, default borders |
| `--line-2` | Lighter divider, hairlines |

### Accent and signal

| Token | Color | Use |
|---|---|---|
| `--accent` | Yellow-ish OKLCH `0.72 0.16 75` | Highway-yellow signal (CHP brand) |
| `--accent-ink` | Darker accent for text on light bg | |
| `--accent-text` | Tuned per theme so accent text reads in both modes | |
| `--good` | Green OKLCH `0.66 0.13 155` | "Cleared", success states |
| `--bad` | Red OKLCH `0.62 0.20 25` | "Blocked", errors |

Never use raw `oklch()` for these roles. If you need a near-token color, mix into the token: `color-mix(in oklch, var(--accent) 22%, transparent)`.

## Typography

Two font families; both load via Google Fonts in `index.html`.

| Token | Family | Use |
|---|---|---|
| `--serif` | Inter Tight | Body copy, headings, brand voice |
| `--mono` | Geist Mono | Code, eyebrows, kickers, badges, install commands, numerical labels |

A third family, **Caveat**, loads on the same Google Fonts request and is used only for the hand-drawn annotation labels in the scroll scene.

### Size scale

Font sizes are mostly fluid with `clamp(min, vw, max)` so headings respond to viewport without breakpoints. Common sizes:

| Role | Rule |
|---|---|
| Hero h1 | `clamp(42px, 5.6vw, 76px)` |
| Section h2 | `clamp(30px, 3.6vw, 46px)` |
| Lede | `18px` |
| Body | `15-16px` |
| Eyebrow / kicker / mono labels | `10.5-11px`, letter-spaced `0.12-0.14em`, uppercase |

### Weight

Default 400. Headings are 400 too; emphasis comes from size and color, not weight. The accent stripe in the hero (`.stripe`) bumps to 500.

## Theming

Light is default. Dark is opt-in via `body.dark` (set by `ThemeToggle`) and falls back to `prefers-color-scheme: dark` for users who haven't toggled.

The override block on `body.dark` flips surface, ink, and line tokens. Accent stays the same yellow; only `--accent-text` shifts up in lightness so it stays readable on dark backgrounds.

Components should never check the theme directly. Use tokens.

## Layout primitives

| Class | Purpose |
|---|---|
| `.wrap` | `max-width: 1240px`, centered, `padding: 0 32px`. Every section uses this for horizontal alignment. |
| `.rule` | 1px horizontal divider. |
| `.rule-dashed` | Dashed 1px line, 25% opacity. Subtle separator. |
| `.eyebrow` | Mono label above a heading: small, uppercase, ink-3. |
| `.kicker` | Same idea, used inside section heads. |
| `.s-head` | Section header layout: 2-column grid (`220px / 1fr`) with kicker + h2. |
| `.s-sub` | Subhead paragraph: 15px ink-2 with `max-width: 64ch`. |

## Sections

Each `<section className="s">` gets `padding: 96px 0` and a top border. Together with `.s-head` this gives every section a consistent "magazine column" feel.

Mile-marker dividers (`.mile` with `.marker`) are used to break up long flows. They render as a small bordered box with mono label, top and bottom 1px borders.

## Components

### Buttons

- `.btn` — solid ink button. 36px tall, mono font, 6px radius. Hover lifts 1px and slides the trailing arrow 3px right.
- `.btn-ghost` — transparent variant with a `--line` border, hover swaps to ink border + bg-elev fill.
- `.btn-lg` — taller variant for CTAs: 44px (or 48px in modals), 8px radius.

### Client picker

Custom dropdown for the install command. The trigger is a button with a glyph slot, the menu is an absolutely-positioned panel with search input, item list, and stagger-in animation. Item icons are square 18px glyphs hosted on Cloudinary.

### Install command

Mono terminal block with a leading `$` prompt, syntax-tinted args (`.arg` is accent), copyable command. The copy button flashes `--good` color when it succeeds.

### Diff card

`.diff` is the dark code block used by the patrol log and demo screens. Lines have a 36px line-number column, an 18px `+/-` prefix column, and the code. Add lines tint with `--good` at 10% alpha; remove lines with `--bad` at 12%. Token classes `.tok-k`, `.tok-s`, `.tok-c`, `.tok-f` color keywords, strings, comments, function names.

### Scroll scene

The pinned `<section className="scene-section">` is the centerpiece. The scene is a fake editor that scrubs through four phases (`draft`, `block`, `fix`, `clean`) as the user scrolls. The progress bar is split into 3 visible segments via `::before` and `::after` dividers at 33.3% and 66.6%.

Hand-drawn annotations:

- Token underlines use `text-decoration: wavy` for spell-check style squigglies (`.scene-tok-warn` accent yellow, `.scene-tok-good` green).
- Arrows are SVG quadratic beziers drawn live with `stroke-dasharray: 100; stroke-dashoffset: 100` animated to 0.
- Labels use Caveat with a `clip-path: inset(0 100% 0 0)` reveal that animates to `inset(0 0 0 0)`. A 14px right padding keeps italic tails from clipping at the box edge.
- Each phase's annotation block is keyed by phase id so React remounts and the animation re-fires on transition.

### Modal

`.modal-card` slides in via a `clip-path` reveal (`0 0 100% 0` to `0 0 0 0`) plus a subtle scale. Children stagger in: eyebrow, title, steps, foot, each with its own delay. Modal close button rotates in from -45deg.

### Footer

`.f-bottom` with brand badge, "made for UCLA / LA Hacks" line, and a github + license row. The road band above the CTA (`.cta::before`) is a horizontal asphalt strip with a yellow lane-divider stripe; it fades at the edges via `mask-image`.

## Animation

Most transitions use these durations:

- 120-150ms — small UI hover states
- 250-320ms — modal backdrops, subtle reveals
- 380-720ms — annotation reveals, large scene transitions

Easings:

- `cubic-bezier(0.16, 1, 0.3, 1)` — content reveals (modal, items)
- `cubic-bezier(0.6, 0, 0.4, 1)` — handwritten label reveal
- `cubic-bezier(0.55, 0.1, 0.45, 0.95)` — arrow stroke draw
- `ease`, `ease-out` — small UI

All scene-level animations are wrapped in a `@media (prefers-reduced-motion: reduce)` block that disables them.

## Conventions and gotchas

- Never `box-sizing: content-box`. The global reset sets `border-box`.
- Default to mono for any "label" or "tag" element. Body copy is serif.
- Section padding pattern is `96px 0` with a top border. Adopt it for new sections so spacing stays uniform.
- Spacing scale is informal but consistent: 8 / 12 / 14 / 18 / 24 / 32 / 48 / 56 / 96. Pick from these before inventing new gaps.
- Use `text-wrap: balance` on headings and `text-wrap: pretty` on long paragraphs. Both are already applied to the major heading classes.
- Cloudinary URLs are generated through the shared `cld` instance from `src/cloudinary/config.ts`. Do not instantiate a second one.
- For images that need responsive + blur placeholder + lazy loading, use `<AdvancedImage>` from `@cloudinary/react` with the `responsive()`, `placeholder({ mode: 'blur' })`, and `lazyload()` plugins. Patterns are documented in `.claude/rules/cloudinary-patterns.md`.

## Adding a new section

1. Wrap in `<section className="s" id="your-id">`.
2. Inner container is `<div className="wrap">`.
3. Use `<div className="s-head">` for the header (kicker + h2).
4. Compose with existing primitives (`.eyebrow`, `.btn`, `.diff`, `.mile`) before writing new CSS.
5. If you need new CSS, add it to `index.css` under a `/* ---- Section name ---- */` banner comment, near similar rules.
6. Use tokens (`--bg`, `--ink`, `--accent`, etc.). No literal hex or oklch in component-level rules.
7. Wrap any animation in `@media (prefers-reduced-motion: reduce) { animation: none; }`.
