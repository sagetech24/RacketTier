# RacketTier — Landing Page Build Prompt

> Paste everything below (from **"PROMPT START"** to **"PROMPT END"**) into your front-end AI agent. It is a complete, self-contained brief: the agent does not need access to this repository to build the page. Every product fact, feature, user role, and brand token has been extracted from the live RacketTier v2 codebase.

---

## PROMPT START

You are a senior front-end engineer and product designer. Build a **modern, high-converting marketing landing page** for a product called **RacketTier**. Deliver a polished, responsive, accessible, single-page site. Follow the product brief and brand system below exactly.

### 1. Product summary

**RacketTier** is a **mobile-first web app (PWA)** that turns casual racket-sports play into **ranked, recordable progress** for clubs, communities, and venues. It supports four sports, each with its own **independent ELO rating, session-point wallet, and tier ladder**:

- Badminton
- Pickleball
- Tennis
- Table Tennis

**One-line pitch:** "Every smash counts. Track it, rank it, own it."

**Elevator paragraph:** RacketTier is the live ranking, queueing, and match-tracking platform for badminton, pickleball, tennis, and table tennis communities. Members and Queue Masters run organized play sessions, rotate players fairly through a queue, record match results, and watch skill ratings, points, and tier ranks update in real time.

### 2. Who it is for (audiences to speak to)

- **Players / Members** — registered users who want their matches to count. They earn an ELO skill rating, session points (a per-sport wallet balance), and climb tier brackets.
- **Queue Masters (organizers)** — the person running a session; they build the roster, generate matches, record results, and end the session with a summary report.
- **Clubs & Facilities** — venues that host game sessions and want fair rotation and a live leaderboard for their community.
- **Guests** — drop-in players added to a session without an account (tracked for wins/losses, but no ranking/points). Use this to emphasize the product is "frictionless — bring anyone."

### 3. Core features (turn these into feature sections/cards)

1. **Smart Queueing** — Member-organized sessions run by a **Queue Master** with **FIFO rotation** so everyone gets fair court time. Auto-generate matches or build them manually.
2. **Auto-Matchmaking** — Generate balanced matches from the queue using configurable criteria: **skill level** (balanced or same-level), **FIFO sequence**, **win/loss statistics**, and **genderless mixed** teams. Supports singles (2 players) and doubles (4 players).
3. **Live Ranking (ELO)** — Every match updates your skill rating per sport, with a transparent rating history. Base rating 1000, standard ELO math. See a live per-sport leaderboard with a top-3 podium.
4. **Session Points & Tiers** — Earn points per win and per loss, filling a **per-sport wallet**. Points bracket you into **5 tiers: Starter → Beginner → Intermediate → Sempai → Sensie**.
5. **Two ways to play** —
   - **Facility game session:** a single scored match hosted at a venue; finish the match and the session wraps up with ratings + points applied.
   - **Queueing session:** a member-run, multi-match session with a live leaderboard that stays active across many matches, then produces a summary report.
6. **Members & Guests** — Add registered members or quick-add guests. Only members earn ranking and points — fair and frictionless.
7. **Live Leaderboard & Summary Reports** — Real-time wins/losses/points/win% during a session; a ranked summary (players + totals) when it ends.
8. **Personal Dashboard & Activity** — Each player gets a dashboard with rank, points, streaks, and a recent-activity feed of finished matches (score, points earned, rating change).

### 4. How it works (4-step section — use verbatim tone)

1. **Create a Session** — Pick a sport, choose singles or doubles, and set your win/loss point rewards.
2. **Build the Queue** — Invite members or drop in guests. The queue auto-orders by FIFO so everyone gets fair court time.
3. **Play & Record** — Auto-generate matches from the top of the queue, then submit results with optional scores.
4. **Climb the Ranks** — ELO updates, session points credit to your wallet, and your tier label evolves match by match.

### 5. Social-proof / stats strip

Include a stats strip with three metrics (the real app fetches these live; here use placeholder-friendly labels with large numbers and a "+" style, e.g. formatted like `1.2k+`):

- **Members** (total registered players)
- **Total Queue** (total queueing sessions run)
- **Points** (total points awarded)

Design these so real numbers can be dropped in later; show tasteful placeholders (e.g. `2.4k+`, `860+`, `1.2M+`).

### 6. Required page sections (in order)

1. **Sticky top nav** — Logo/wordmark on the left; right side has "Sign in" and a primary "Create your account" (or "Get started") button.
2. **Hero** — Big headline, subheadline paragraph, two CTAs ("Create your account" primary + "Sign in" secondary), and the 3-metric stats strip. Add subtle radial "glow" background blurs.
3. **Sports band (optional but encouraged)** — "Built for racket sports. One platform. Four sports. Independent ratings, wallets, and tiers for each." Show the four sports (Badminton, Pickleball, Tennis, Table Tennis) as icon/cards.
4. **Features grid** — Section eyebrow "What you get", heading "Everything a thriving club needs", then the feature cards from §3.
5. **How it works** — 4-step section from §4.
6. **Ranking / tiers showcase** — Visualize the tier ladder (Starter → Beginner → Intermediate → Sempai → Sensie) and/or a sample leaderboard with a podium (1st/2nd/3rd) to make the ranking tangible.
7. **Final CTA band** — "Ready to start your tier journey?" with a gradient/bordered card and CTAs. Subcopy: "Join RacketTier and turn every casual rally into ranked, recordable progress."
8. **Footer** — Wordmark + copyright line: "© {year} RacketTier | The kinetic world of racket sports". Include placeholder links (Terms, Privacy, Contact).

### 7. Copy bank (use/adapt these)

- Hero H1: **"Every smash counts. Track it, rank it, own it."** (style the second sentence with the brand gradient.)
- Hero sub: "RacketTier is the live ranking, queueing, and match-tracking platform for badminton, pickleball, tennis, and table tennis communities. Start queueing sessions like a pro, play matches, earn points, and climb the tier rank ladder."
- Features eyebrow: "What you get" · Features H2: "Everything a thriving club needs" · Sub: "From the first serve to the season-end leaderboard, RacketTier keeps your community fair, fast, and engaged."
- How-it-works eyebrow: "How it works" · H2: "From queue to ranking in four steps".
- Final CTA H2: "Ready to start your tier journey?"
- Footer tagline: "The kinetic world of racket sports."

### 8. Brand system (match exactly)

**Name / wordmark:** Render as `Racket` + `Tier` where **"Tier" is italic**, e.g. `Racket*Tier*`. Primary wordmark color is the lavender `#c2c1ff`. A small logo mark sits to the left (use a placeholder `rt-logo` mark — a stylized racket/"RT" monogram — if no asset is provided).

**Theme: dark.** Use these tokens:

| Token | Hex | Usage |
|---|---|---|
| Base background | `#121216` | page background |
| Background alt | `#0f0f12` | alternating section bg |
| Surface | `#1b1b1e` | cards |
| Surface alt | `#1f1f22` / `#2a2a2d` | raised elements/borders |
| **Primary (lavender)** | `#c2c1ff` | primary CTAs, wordmark, key accents |
| Primary deep | `#211e6a` | text on lavender buttons |
| Primary muted | `#7877c6` | secondary lavender, glows |
| **Accent (green)** | `#4ce081` | highlights, eyebrows, success/stat accents |
| Accent text-on | `#003919` | text on green |
| Text primary | `#e4e1e6` | headings/body |
| Text secondary | `#c8c5d2` | supporting text |
| Text muted | `#918f9c` | footnotes/footer |
| Error | `#ffb4ab` | (rarely on a landing page) |

**Signature gradient:** a lavender→green gradient for the highlighted hero phrase and CTA accents, e.g. `linear-gradient(to right, #c2c1ff, #a5a3ff, #4ce081)`.

**Typography:** Display/headings use **Geist** (weight 700, extrabold, tracking-tight). Body uses **Instrument Sans**. Fall back to system sans if unavailable. Icons: Material Symbols (or clean line SVG icons).

**Visual style:** bold extrabold tracking-tight headings; **rounded-xl / rounded-2xl** cards with subtle `white/5` borders; pill badges; gradient primary buttons with soft shadow (`shadow-[0_20px_40px_-10px_rgba(194,193,255,0.35)]`); large radial blurred "glow" circles in lavender/green behind the hero; hover states that lift/scale slightly (`active:scale-[0.98]`). Mobile-first.

### 9. Tech & delivery constraints

- **Framework:** React (function components + hooks) with **Tailwind CSS**, to match the existing app. If the agent's environment differs, produce clean semantic HTML + Tailwind that ports easily.
- Build as a **single responsive page**, mobile-first, scaling up to desktop (use a ~48rem tablet breakpoint and standard desktop breakpoints).
- **Accessibility:** semantic landmarks (`header`, `nav`, `main`, `section`, `footer`), proper heading hierarchy, alt text, sufficient contrast, focus-visible states, respects `prefers-reduced-motion`.
- **Performance:** no heavy dependencies; inline SVG icons; lazy/deferred images; no layout shift.
- **CTAs / routes:** Primary "Create your account" → `/register`; "Sign in" → `/login`; authenticated variants can link to `/dashboard`. Keep these as plain links/props so they can be wired to a router later.
- Provide the page as self-contained, well-structured code with clear section components and no lorem ipsum (use the copy bank).

### 10. Definition of done

- All 8 sections present, in order, styled with the brand tokens above.
- Dark theme, lavender + green accents, Geist/Instrument Sans, glow backgrounds, rounded cards, gradient CTAs.
- Fully responsive and accessible.
- Stats strip, features grid, 4-step how-it-works, tier/leaderboard showcase, and final CTA all implemented.
- Copy pulled from the copy bank; no placeholder gibberish.

## PROMPT END
