# Booking regression suite — test plan

This suite checks the whole booking flow end to end. A guest books on the website. The owner is
emailed and approves or declines, either from the email link or from the admin sheet. Events move
between the calendars, the guest receives a calendar invite, and the site and both spreadsheets
follow. The goal is to run it after every change, so it has to be repeatable, isolated from real
bookings, and clean up after itself.

## 1. Environments

Tests never write to production. There is one backend codebase and two deployments of it:

| | Production | Staging (what the suite writes to) |
|---|---|---|
| Apps Script project | "Shorashim Booking" | "Shorashim Booking (staging)" — same code, different `Config.js` |
| Config file | `~/.config/gcloud/shorashim/booking-config.json` | `~/.config/gcloud/shorashim/booking-config.staging.json` |
| Calendars | שורשים – הזמנות / בקשות / ערוצים | בדיקות – הזמנות / בקשות / ערוצים, **hidden** in the owner's calendar list, so Saray's phone never shows them |
| Sheets | ניהול הזמנות, זמינות לאתר | the same two, named "בדיקות – …" |
| Owner notifications | the owner's address | the owner's `+test` alias (same inbox, easy to tell apart; the suite deletes these emails when it finishes) |
| Test hooks | off | on (`testHooks: true`) |
| Website under test | https://shorashimstay.com | the current working tree, built with the staging endpoints and served on `localhost` (an allowed reCAPTCHA domain) |
| Browser | — | Chrome 147 (`~/.local/bin/google-chrome` or `E2E_CHROME`): Playwright's bundled Chromium 153 renders no frames under WSL here, so IntersectionObserver never fires and reCAPTCHA never loads |

Production only gets a **read-only smoke run** (§5).

### Why a test hook is needed for the sheet path
The admin sheet approves a request through an installable `onEdit` trigger. Google does **not**
fire `onEdit` for edits made through the Sheets API or by scripts, and only fires it for a human
typing in the Sheets UI. So the suite makes the real edit as the owner (it sets פעולה and ticks
ביצוע through the Sheets API). Then it calls a **staging-only, HMAC-signed** web-app action,
`testFireSheetEdit`, which hands that exact cell to the real `onSheetEdit(e)` handler. The approval
logic, the sheet reads and the writes are all the production code. The only part replaced is
Google's trigger dispatch. The suite checks separately, through signed `diag`, that the real
`onSheetEdit` trigger is installed.

## 2. Actors and accounts

| Role | Account | How the suite acts as it |
|---|---|---|
| Owner | the main Shorashim Google account | OAuth token in `~/.config/gcloud/shorashim/token.json`: reads the notification emails, edits the admin sheet, checks the calendars |
| Guest A | the retired Shorashim Google account | its OAuth token: receives the calendar invite (Gmail + Calendar) |
| Guest B | the same retired account's `+guestb` alias | the same token; its mail is told apart by the `To:` address |
| Website visitor | headless Chromium (Playwright) | fills in and submits the real booking form |

The account addresses and token paths live in `~/.config/gcloud/shorashim/e2e-config.json`, never
in this public repo.

## 3. Test data

- **Dates**: each run picks a random free window 250–350 days ahead, well away from real
  bookings, and gives every scenario its own non-overlapping nights inside it.
- **Run tag**: every guest name carries `E2E-<runId>`, so everything a run creates can be found and
  removed, including leftovers from a crashed run.
- **Phones**: a fresh random `05x` number per scenario. The backend allows 5 requests per phone per
  6h and 30 per hour overall, so no more than about 3 full runs an hour.
- **reCAPTCHA**: real tokens from the page (headless Chromium scores 0.9). Direct API cases take a
  token from the page with `grecaptcha.execute`.

## 4. Scenarios (staging)

`[UI]` means driven through the browser; `[API]` means a direct call to the web app.

**P — Preflight**
- P1: all three tokens refresh and belong to the expected accounts.
- P2: staging answers `ping`; signed `diag` lists the triggers `onSheetEdit`, `onSnapshotTimer` and
  the calendar triggers.
- P3: clean up anything tagged `E2E-` left by earlier runs, in the calendars, owner inbox, guest
  inboxes/calendars and the recent-decisions list.

**A — Availability**
- A1 `[UI]`: the date picker marks exactly the nights the backend reports as blocked (checked
  against a fixture: a manual block the suite adds to the staging הזמנות calendar).
- A2: the public snapshot CSV matches the web app, and its `generatedAt` is less than 15 minutes old.
- A3: a manual block added to הזמנות shows up in the web app at once, and in the snapshot within
  about 90s (this checks the calendar-change trigger).

**R — Booking request (guest A, couple stay, 2 nights)** `[UI]`
- R1: the form submits and the success screen shows a reference `SH-XXXXX`.
- R2: בקשות has one ⏳ event with those dates, `status=pending`, and `request` JSON matching the form.
- R3: the owner receives "בקשת הזמנה SH-XXXXX…" at the `+test` address, with every detail line and
  a signed decision link.
- R4: those nights are now blocked in the web app, in the snapshot and in the site's date picker.
- R5: the admin sheet בקשות has a row "ממתינה – התאריכים שמורים" with a פעולה dropdown and a ביצוע
  checkbox.
- R6: the guest has received no email yet.

**E — Owner approves from the email** (continues R)
- E1 `[UI]`: open the link from the email; the page shows the request and an approve button.
- E2: click אישור ההזמנה; the page says it was approved and that the guest was invited.
- E3: the ⏳ event is gone from בקשות; הזמנות has "שורשים · <name>" with guest A as attendee and the
  `source=website` tag.
- E4: guest A receives the calendar invite email, and the event appears in guest A's calendar.
- E5: the admin sheet shows the row as "אושרה ✓" and הזמנות lists the booking.
- E6: the nights stay blocked.
- E7: opening the link again shows "הבקשה כבר טופלה". Repeating approve returns the same result;
  decline after approve returns `not_found`.

**D — Owner declines from the email** (guest B, new dates) `[UI]`
- D1: request submitted → owner email → the page's דחיית הבקשה, then accept the confirm dialog.
- D2: the ⏳ event is deleted, no booking is created, the nights are free again (web app +
  snapshot), and guest B receives nothing.
- D3: the admin sheet shows "נדחתה ✗".

**S — Owner decides from the admin sheet**
- S1: guest A requests new dates `[UI]`; the owner sets פעולה=אישור and ticks ביצוע (Sheets API)
  and the hook fires `onSheetEdit`. Result: booking created, guest A invited, row "אושרה ✓".
- S2: guest B requests new dates; פעולה=דחייה + ביצוע → declined, nights freed.
- S3 (guard): ticking ביצוע with פעולה empty unticks the box and changes nothing.

**G — Guards and edge cases** (mostly `[API]`)
- G1: a request overlapping a held or booked night returns `unavailable` with those nights, and the
  UI refuses to select them.
- G2: approving when the nights were blocked meanwhile: a manual block is added over a pending
  request's nights. The decision page warns and disables approve, and API approve returns
  `unavailable`.
- G3: a tampered signature on the decision page shows "הקישור אינו תקין", and API approve returns
  `forbidden`.
- G4: invalid input (past date, missing phone, 4 adults) returns `invalid` with the field errors.
- G5: honeypot: a filled `website` field gets a fake success, and no event is created.
- G6: idempotency: two concurrent POSTs with the same `requestId` create exactly one event.
- G7: hold expiry: a fixture request with `createdAt` 25h ago no longer blocks, availability marks
  it ⌛ expired, and it can still be approved while its nights are free.
- G8: wedding stay (`bride_day` on day D) holds D-1 → D+1, two nights.
- G9: prices come from `prices.json`. The suite hands staging this tree's `public/prices.json` before
  the run (signed `testSetPrices`; staging cannot fetch a localhost site). G9 swaps in a changed file,
  checks `diag` reports its version, that an out-of-range price is refused, and that a request's
  stored estimate follows the changed price. It restores the tree's file afterwards.

**C — Cleanup** (runs even when tests fail)
- Delete every `E2E-` event from the staging calendars. Bookings are deleted with `sendUpdates=all`,
  so the guest copies go away too.
- Delete the matching emails from the owner and guest inboxes, and the invites from guest A's
  calendar.
- Prune the run's references from the recent-decisions list, then refresh the sheets.

## 5. Production smoke (read-only, after every production deploy)
- The site returns 200 on the apex, `www` and `http`, all ending up at `https://shorashimstay.com/`,
  and the page's JS/CSS load.
- `availability` returns `ok` and the snapshot is fresh (under 15 minutes old).
- Signed `diag` lists all the production triggers.
- Signed `diag`, given the live `/prices.json` version, reports that same version: the web app
  reads the published prices.
- A reCAPTCHA token from the live page verifies with `hostname=shorashimstay.com`.
- The decision link and the booking POST are not touched, so nothing is written.

## 6. Running it

```
npm run test:e2e           # deploys the working tree to staging, then runs the suite (the plan above)
npm run test:smoke         # production read-only smoke
```

Workflow for any change to the site, the backend or the tests:
1. Commit the change.
2. `npm run test:e2e` deploys that commit's backend to staging, builds the site from it, and runs
   the suite. A full pass on a clean tree is recorded in `.git/e2e-passed`.
3. `python3 apps-script/deploy.py "…"` deploys to production. It is refused unless step 2 passed
   on this commit, and it only matters when the backend changed.
4. `git push`. The pre-push hook refuses untested site or backend changes on `main`.
5. `npm run test:smoke`.

To try uncommitted work, run `npm run test:e2e` anyway. It deploys with `--allow-dirty` and runs,
but doesn't record a pass. Add `-g "<name>"` to run a single scenario.

It runs locally, not in GitHub Actions: the suite needs three personal Google tokens with Gmail
access, and the repo is public.
