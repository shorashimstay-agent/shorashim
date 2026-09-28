---
name: sync-front
description: Blend the latest design from the private AI Studio repo (front-2, sarayagent-alt/shorashim-front-2) into the Shorashim site and ship it, keeping the booking engine, backend, accessibility and legal pages intact. Use when the user asks to sync, pull in, or blend the front / front-2 / the AI Studio design.
---

# Sync the front-2 design

Read `docs/front-sync.md` first: it is the design this runbook follows. The user decided (2026-09-28)
that syncs start only when asked and **ship automatically when every check passes**, so do not stop
for approval between steps; stop only where a step below says to.

## 1. Prepare

```
node scripts/front-sync.mjs prepare
```

- "Nothing to sync" → tell the user and stop.
- It stops on a **secret** in front-2's files → stop. Tell the user the file and kind of key (never
  the key), that it must be removed in AI Studio and the key replaced, and that nothing was merged.
  Report history-only findings the same way, but they do not stop the sync.
- It stops on **prices** → stop and tell the user the reason and the numbers.
- Otherwise read the report: it lists what was taken, merged, in conflict, and not taken.

## 2. Resolve and rewire

You are on `sync/front-<sha>`. front-2's version of every file is in `.git/front-sync/front/`
(also `git -C .front-2 show <sha>:<path>`). The goal: the site looks like front-2 and works like
production. For each file in the report:

- **Conflicts** (`<<<<<<< site` / `||||||| base` / `=======` / `>>>>>>> front-2`): take front-2's
  design (markup, classes, text, order) and keep the site's behaviour and accessibility.
- **BookingSection.tsx**: never use front-2's form logic (its own state, WhatsApp-only submit, its
  own price sum, native date inputs). Re-lay the production pieces in front-2's style:
  `useBookingForm`, `DatePicker`, `FieldError` + `described(...)`, `Honeypot`, `Announcer`,
  `SendConsent`, `SentHeading`, `id="booking"`, `id="submit-booking-request"` calling
  `form.submit`, the failure alert, the WhatsApp fallback button and the sent panel. Show the
  estimate with `form.estimate`. Take front-2's section texts and side panels.
- **Accessibility**: keep what the site added to design files — `aria-*`, labels tied to inputs,
  `aria-pressed` on toggle buttons, focus styles, `alt` text, `lang`/`dir`, heading order, the skip
  link, `<main id="main">`, `<AccessibilityMenu />`, and the ids the tests use (`gallery`,
  `mobile-menu-toggle-btn`, `mobile-nav-drawer`). If front-2 rebuilt a component, add them back
  onto its markup.
- **Images**: where the site renders a photo through `Picture` (responsive AVIF/WebP), keep it.
  New master photos in `src/assets/images/` get variants from `npm run images` automatically.
- **Prices**: the page shows prices only through `form.estimate` or `PRICES` from `src/lib/stay.ts`.
  front-2's `BRAND_DATA` price fields may stay in `shorashimData.ts` (they feed `prices.json`), but
  nothing should render them directly.
- **Content** (texts, section order, new sections, removed sections) is front-2's call: take it. If
  front-2 removed a section the site had, remove it, unless it carries a production function (then
  keep the function in front-2's style and say so in the summary).
- If a design needs a **production-owned** change (new npm package, `vite.config.ts`, a test
  selector, the image script), do not make it in the sync: stop, explain, and let the user decide.

Run `npm run dev` or build and look at the page when a layout is unclear.

## 3. Check

```
node scripts/front-sync.mjs check
```

Fix what it reports and run it again until it passes. Never weaken a check or edit
`scripts/front-sync.mjs` to get past one; if a check is wrong, stop and tell the user.

## 4. Ship

```
node scripts/front-sync.mjs ship
```

Runs in about 15–20 minutes (use a background run and wait for it). It commits, runs the staging
suite, pushes, waits for Pages and runs the smoke test; on a live failure it reverts by itself.

- Staging fails → fix on the branch, commit, `check`, `ship` again (it amends nothing; add a commit).
- It reverted → tell the user what failed; the branch is kept.

## 5. Report to the user

What changed on the site (sections, texts, look), price changes, anything from front-2 that was not
taken and why, any history-only secret warning, and the live result.
