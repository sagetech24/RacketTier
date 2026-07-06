---
name: RacketTier
description: Mobile-first dark PWA for racket-sports ranking, queueing, and match tracking.
colors:
  base-bg: "#121216"
  base-bg-alt: "#0f0f12"
  surface: "#1b1b1e"
  surface-alt: "#1f1f22"
  surface-raised: "#2a2a2d"
  primary: "#c2c1ff"
  primary-deep: "#211e6a"
  primary-muted: "#7877c6"
  accent: "#4ce081"
  accent-on: "#003919"
  text-primary: "#e4e1e6"
  text-secondary: "#c8c5d2"
  text-muted: "#918f9c"
  error: "#ffb4ab"
  success: "#1bcb4d"
typography:
  display:
    fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  pill: "9999px"
spacing:
  card-gap: "0.75rem"
  section: "1.5rem"
  page-x: "1rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1.25rem"
  card-surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "1rem"
---

# RacketTier Design System

## Overview

RacketTier uses a **dark kinetic** theme: deep charcoal backgrounds, lavender primary (`#c2c1ff`), green accent (`#4ce081`), and extrabold Geist display type. The app is a **mobile-first PWA** (React + Tailwind v4 + Vite) with a Laravel shell (`resources/views/app.blade.php`).

**Wordmark:** `Racket` + italic `Tier`; lavender `#c2c1ff`. Logo: `/images/rt-logo.png`.

**Signature gradient:** `linear-gradient(to right, #c2c1ff, #a5a3ff, #4ce081)` for hero highlights and primary CTAs.

**Breakpoints:** mobile base; `tab:` at 48rem (`--breakpoint-tab` in `resources/css/app.css`); common `sm:` / `md:` / `lg:` Tailwind steps.

**Motion sidecar** (not in YAML — see `resources/css/dashboard-v2.css`):
- Overlay fade: ~220–280ms `ease-out`
- Sheet/panel enter: ~300–400ms `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-expo family)
- Status pulses: 1.2–1.5s `ease-in-out` for ongoing match / playing player states
- Always provide `@media (prefers-reduced-motion: reduce)` alternatives

## Colors

| Role | Hex | Usage |
|------|-----|--------|
| Base | `#121216` | Page background |
| Base alt | `#0f0f12` | Alternating sections |
| Surface | `#1b1b1e` | Cards, panels |
| Surface alt | `#1f1f22` / `#2a2a2d` | Raised elements, borders |
| Primary | `#c2c1ff` | CTAs, wordmark, key accents |
| Primary deep | `#211e6a` | Text on lavender buttons |
| Primary muted | `#7877c6` | Secondary lavender, glows |
| Accent | `#4ce081` | Success, eyebrows, stat highlights |
| Accent on | `#003919` | Text on green |
| Text | `#e4e1e6` / `#c8c5d2` / `#918f9c` | Primary / secondary / muted |
| Error | `#ffb4ab` | Destructive / validation |

Cards: subtle `white/5` borders. Hero/marketing: large radial blurred glows in lavender/green.

`.rt-kinetic-gradient`: `linear-gradient(135deg, #59588b 0%, #8a89d9 100%)` for dashboard accents.

## Typography

- **Display / headings:** Geist 700, `tracking-tight`, extrabold for marketing heroes (clamp max ≤ 6rem).
- **Body:** Instrument Sans via `--font-sans` in Tailwind theme.
- **Icons:** Material Symbols Outlined (`.material-symbols-outlined`, `.material-symbols-filled`).
- Use `text-wrap: balance` on major headings where supported.

## Elevation

Prefer **tonal layering** (surface steps + border opacity) over heavy shadows on app UI. Marketing CTAs may use soft lavender glow: `shadow-[0_20px_40px_-10px_rgba(194,193,255,0.35)]`. Modals use backdrop blur (`backdrop-filter: blur(24px)`) on session-end overlays.

## Components

- **Cards:** `rounded-xl` / `rounded-2xl`, surface bg, thin border; avoid nested cards in queue/match lists.
- **Pills / badges:** tier labels, sport tags, status chips.
- **Buttons:** gradient or lavender primary; `active:scale-[0.98]` on marketing; sufficient contrast on dark surfaces.
- **Tabs:** horizontal scroll on mobile (`.rt-match-tabs-scroller`); stacked panels on tablet+.
- **Modals:** mobile bottom sheet (`translateY`), desktop centered scale-in (see `.rt-end-match-modal-*` classes).
- **Status indicators:** `.rt-match-status-circle-*` + labels; ongoing states may pulse (with reduced-motion fallback).

Source files: `resources/css/app.css`, `resources/css/dashboard-v2.css`, `resources/js/components/`, `resources/js/pages/`.

## Do's and Don'ts

**Do**
- Extend existing Tailwind utilities and `dashboard-v2.css` patterns before inventing new systems.
- Keep queue and match UIs scannable: clear hierarchy, consistent status colors, adequate tap targets.
- Use Emil-style motion for modals and state transitions (ease-out, GPU-friendly, &lt;300ms UI).
- Run Impeccable `audit` / `layout` on dense pages before shipping visual changes.

**Don't**
- Introduce a light theme or new accent palette without explicit product approval.
- Add GSAP or heavy animation libraries unless requested (CSS + Tailwind first).
- Use gradient text, thick side-stripe card borders, or generic three-column marketing grids on app screens.
- Animate high-frequency actions (queue reorder taps, score digit entry) beyond subtle feedback.
