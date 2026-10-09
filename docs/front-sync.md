# Syncing the design from front-2

The site's design is made in Google AI Studio, which pushes to the **private** repo
`sarayagent-alt/shorashim-front-2` ("front-2"). This repo is **public** and holds everything else:
the booking engine, the backend, accessibility, the legal pages and the tests. A sync takes
front-2's latest design into this site without losing any of that.

Run it by asking Claude for `/sync-front`. It runs only when asked, and ships on its own when
every check passes.

## Principles

- **Front-2 decides how the site looks; this repo decides how it works.**
- **front-2 stays private.** Its clone lives in `.front-2/` (ignored by git; its push URL is
  disabled; the pre-push hook refuses any commit containing it). Only the merged files are
  committed here, never front-2's history or the files the site does not use.
- **A secret never gets published.** The person working in AI Studio is not a developer and may
  paste a key without knowing. `gitleaks` scans front-2's files before anything is merged and the
  built site before anything ships. A finding stops the sync, and the report names the file and
  the kind of key, never the key itself. GitHub push protection on this repo is the second net.
- **The backend is never deployed by a sync.** Prices are data in a sheet (below), so a sync is a
  site-only change.

## How a sync works (`scripts/front-sync.mjs`)

1. **prepare**
   - Fetches front-2 into `.front-2/` with the `shorashimstay-agent` token (never stored).
   - Finds the merge base: the front-2 commit named by the newest `Front-2-Sync: <sha>` trailer on
     `main`, skipping syncs that were reverted (`Front-2-Sync-Reverted: <sha>`). Before the first
     sync it is `c4f2afb`, the original AI Studio import that both repos grew from. If the recorded
     commit has vanished from front-2 (rewritten history), the sync stops.
   - Scans front-2's files for secrets (stop) and the new commits' history (reported: those keys
     are not published, but they are exposed in AI Studio and must be replaced).
   - On a `sync/front-<sha>` branch, merges every file front-2 changed since the base, file by
     file with `git merge-file`, according to the ownership rules.
2. **Resolve and rewire** (Claude, following the skill): conflicts, and putting front-2's design
   back onto the production hooks where it replaced them (booking, accessibility, images).
3. **check**: contract checks, lint, unit tests, a build, a secret scan of the changed files and
   of the build, and the ₪ check of the build (no price written into the page). Records the checked tree.
4. **ship**: commits with the `Front-2-Sync:` trailer, runs the staging suite (`npm run test:e2e`,
   which includes the axe accessibility tests and the booking round trip), fast-forwards `main`,
   pushes, waits for the Pages deploy, and runs the production smoke test (one retry). If the live
   site still fails, it reverts the sync, pushes the revert and checks the site again.

## File ownership

| Owner | Files | Rule |
|---|---|---|
| Production | `package*.json`, `tsconfig.json`, `vite.config.ts`, `.env*`, `.github/`, `.githooks/`, `apps-script/`, `shared/`, `scripts/`, `tests/`, `docs/`, legal pages, `public/CNAME`, `public/admin/`, `src/lib/`, `src/booking/`, `src/legal/`, `AvailabilityCalendar`, `AccessibilityMenu`, `Picture`, `bookingConfig.ts`, generated images | front-2's changes are listed in the report and never taken; `check` fails if a sync changes them |
| Design | everything else under `src/` and `public/`, and `index.html` | three-way merge: front-2's change is taken where the site did not change the same lines |
| Ignored | anything else front-2 has (`metadata.json`, AI Studio config) | not taken |

The booking section is where the two meet. `src/booking/useBookingForm.ts` holds its behaviour
(state, validation, availability, the request, the WhatsApp fallback) and `src/booking/parts.tsx`
the pieces with accessibility or legal weight (`DatePicker`, `FieldError`/`described`,
`Honeypot`, `Announcer`, `SendConsent`, `SentHeading`). `src/components/BookingSection.tsx` is
layout only, so front-2's booking design is adopted by re-laying those pieces out in its style.
front-2's own booking form (a WhatsApp-only form with its own price sum) is never used as-is.

A production-owned change that a design needs (a new npm package, an image pipeline change, a test
selector) is not made inside a sync: the sync stops, and the change goes through the normal
development workflow first.

## Prices

Prices are in neither repo. They live in one place, the owner's Google Sheet
**"שורשים — מחירים (Shorashim prices)"** (`pricesSheetId` in `booking-config.json`), tab `מחירים`,
one row per key: `perNight` (weeknights), `weekendPerNight` (Friday and Saturday nights),
`thirdGuestPerNight`, `bride_day`, `bride_night_day`, `wedding_night`. The owner and the front
agent's account (`sarayagent@gmail.com`) edit column C; anyone with the link can view it. This
sheet is separate from the admin and availability sheets and holds nothing else.

- **Both sites read the sheet directly** as a public CSV when a page opens (`PRICES_CSV_URL` in
  `src/data/bookingConfig.ts`, `src/lib/prices.ts`, `usePrices`; front-2's `src/lib/prices.ts`).
  A page open never runs the backend, so traffic cannot use up the free Apps Script quota.
- **The web app reads the same sheet** to price booking requests (cached 10 minutes, re-read when a
  request carries a newer version, last good copy kept if an edit fails the checks).
- Every reader checks the values (`checkPrices`: whole shekels, 100–20,000). If the sheet cannot be
  read, the page shows "מחיר בתיאום אישי" and the request is accepted with no estimate. There is no
  copy of the prices in code to fall back to, so nothing can go stale.
- The version names the prices themselves (`sheet-850-1050-…`), so the page and the web app agree
  on it with no shared state.
- A price change is an edit in the sheet: within about a minute on both sites, no build, no sync,
  no deploy.
- front-2 never sets prices. A sync does not read them from front-2 and `check` stops if any ₪
  amount is written into the built site (legal pages excepted): front-2's components must show
  prices from `usePrices` / `form.estimate`. front-2's `LIVE_SITE.md` tells the front agent the same.
- The staging suite uses its own test prices (`tests/e2e/fixtures/prices.json`), built into the
  test site and pinned on the staging web app; scenario G10 edits the staging copy of the sheet.

## Policy and the terms

front-2 decides the policy the site states: cancellation, payment, hours and capacity. When its
wording contradicts the booking terms (`src/legal/content.ts`, `/terms/` and `/en/terms/`), the
terms are updated to match it, never the other way round. The terms are production-owned, so that
update is a separate commit on `main` before the sync ships. Statutory rights and facts about how
the booking system works stay in the terms; where front-2's wording contradicts them, the terms are
worded so both remain true and the user is told.

## Checks that stop a sync (`check`)

- A production-owned file changed, or conflict markers remain.
- `BookingSection.tsx` no longer takes its behaviour from `useBookingForm` or drops one of the parts
  above, `#booking` or `#submit-booking-request`.
- The booking controls lost the hooks the tests use instead of wording: `data-stay-type`,
  `data-adults`, `name="guest-name" | "phone" | "email" | "notes"`, the legend text
  `הבחירה שלכם` and `מספר הבקשה:` in the sent panel.
- `App.tsx` lost the skip link, `<main id="main">` or `<AccessibilityMenu />`; the footer lost
  a link to `/terms/`, `/privacy/` or `/accessibility/`; the ids the tests use are gone.
- A design file uses `@google/genai`, `process.env` or `import.meta.env`; `index.html` gained a
  script tag. Links to outside sites are front-2's call and are taken as they are (user decision,
  2026-10-09).
- Lint, unit tests or the build fail; the secret or ₪ scans find something.
- Then the staging suite and the production smoke test, as for any change.
