# Product

## Register

product

## Users

- **Members (players)** — registered users at clubs and venues who want matches to count toward ELO, session points, and tier progression per sport. Often on mobile between games; need fast queue visibility and clear stats.
- **Queue Masters (organizers)** — members who run multi-match queueing sessions: roster, match generation, results, live leaderboard, session end + summary. Need control, clarity under time pressure, and low friction for guests.
- **Facility hosts** — venue operators running single-match facility sessions with a defined finish flow.
- **Guests** — drop-in players without accounts; tracked in-session only (no ELO/wallet).
- **Admins** — manage facilities and can oversee any queueing session.

Primary workflow context: courtside or club-side, mobile-first, often one-handed, variable lighting (indoor venues).

## Product Purpose

RacketTier turns casual racket-sports play into ranked, recordable progress for badminton, pickleball, tennis, and table tennis communities. Success means fair queue rotation, trustworthy match results, transparent skill/point progression, and sessions that feel organized—not bureaucratic.

Tagline: *"Every smash counts. Track it, rank it, own it."*

## Brand Personality

**Kinetic. Competitive. Fair.**

Voice is confident and energetic without hype. The product celebrates progress and community play. Dark, sport-arena atmosphere with lavender + green accents—premium club tech, not generic SaaS.

Emotional goals: momentum (you're climbing), fairness (the queue works), competence (organizers look pro), belonging (your club's ladder).

## Anti-references

- Generic AI landing pages: purple mesh gradients, three equal feature cards, centered hero clichés, Inter + slate defaults.
- Over-animated dashboards: bounce/elastic easing, motion on every list item, distracting loops during live play.
- Light “safe” admin themes that clash with the established dark kinetic brand.
- Card-in-card nesting for queue/match lists when simpler rows or sections work better.
- Playful cartoon sports mascots or stock-photo athlete clichés.

## Design Principles

1. **Fairness is visible** — queue order, match status, and leaderboard rankings must be scannable at a glance.
2. **Mobile-first under pressure** — Queue Masters act courtside; tap targets, contrast, and density beat decorative whitespace.
3. **Progress feels earned** — ELO deltas, tier labels, and session points should read as meaningful rewards, not noise.
4. **Motion with purpose** — animate state changes (match start, modal, session end), not decoration; respect reduced motion.
5. **One brand, two registers** — marketing (`/`) may be more expressive; app surfaces (`/dashboard`, `/queueing-session/*`) serve the workflow first.

## Accessibility & Inclusion

- Target **WCAG 2.1 AA** for text contrast on dark surfaces (body ≥ 4.5:1).
- Honor **`prefers-reduced-motion`** for all non-essential animation (existing patterns in `dashboard-v2.css` should provide static fallbacks).
- Semantic landmarks, heading hierarchy, focus-visible states on interactive controls.
- Do not rely on color alone for match status (pair with icons, labels, or patterns).
- Touch targets ≥ 44px on primary mobile actions.
