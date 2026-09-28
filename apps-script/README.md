# Shorashim booking backend

A Google Apps Script web app in the `shorashimstay@gmail.com` account. It powers the website's availability calendar and booking requests. Google Calendar is the only record of bookings.

## Calendars

| Calendar | What goes there | Blocks the website? |
|---|---|---|
| **שורשים – הזמנות** | Confirmed stays, phone bookings, dates Saray wants closed | Yes, every event |
| **שורשים – בקשות** | Website requests waiting for approval (⏳) | Yes, for 24 hours after the request |
| **שורשים – ערוצים** | Bookings imported from Booking.com / Airbnb (not connected yet) | Yes |

Each booking is an all-day event from the check-in date to the check-out date. Google Calendar's own end date is exclusive, so an event on 20–23 September blocks the nights of the 20th, 21st and 22nd. A timed event (for example a cleaning from 09:00 to 17:00) blocks every night whose stay window, 15:00 to 11:00 the next day, it overlaps.

A bride day or "night before + bride day" on wedding date D holds the night before (D-1) and the wedding night (D).

## Google Drive folder

Everything for the site lives in the Drive folder **shorashim-webpage** of the Shorashim account:

| File | Sharing | Contents |
|---|---|---|
| **Shorashim Booking** (Apps Script) | Private | The booking backend |
| **שורשים – ניהול הזמנות** | Private | Tabs בקשות / הזמנות / ערוצים mirroring the calendars, with approve/decline |
| **שורשים – זמינות לאתר** | Anyone with the link (view) | A header row, then from, to, generatedAt and blocked nights. Dates only, no guest details |

The availability data is a separate file on purpose. The public file contains nothing but dates, so no sharing or publishing mistake can expose the guest details in the admin sheet. **Never share the admin sheet.**

The website reads the availability sheet's CSV export first, because Google answers it in well under a second. A cold call to the web app often takes 10 seconds or more. If the sheet is unreachable or its data is older than 30 minutes, the site asks the web app directly. The server re-checks every request, so stale availability can't cause a double booking.

Both spreadsheets are rewritten after every request or decision, whenever a booking calendar changes, and on a timer. Apps Script calendar change triggers only work on an account's primary calendar, and the booking calendars are secondary calendars. So `setup` falls back to a timer every 5 minutes, and Saray's own edits in Google Calendar reach the sheet and the website within about 5 minutes. The timer also lets expired holds drop out.

Calendars cannot be stored in Drive folders; they stay in Google Calendar.

## Day to day (Saray)

- **Close dates or add a phone booking:** create an event in **שורשים – הזמנות**. The website shows those nights as taken within about two minutes.
- **New website request:** an email arrives at shorashimstay@gmail.com, and a ⏳ event appears in **שורשים – בקשות**. Tap **לאישור או דחייה** in the email:
  - **Approve** moves the stay into הזמנות. If the guest gave an email address, they get a Google Calendar invitation.
  - **Decline** removes the request and frees the dates.
  - Both screens offer a ready-made WhatsApp message to the guest.
- **Or decide from the sheet:** in **שורשים – ניהול הזמנות**, tab בקשות, choose אישור or דחייה in the **פעולה** column, then tick **ביצוע**. The tick is the confirmation, and it works in the Sheets phone app too. Decided requests stay at the bottom of the tab for 3 days with a WhatsApp link to the guest.
- **Unanswered requests** stop holding their dates after 24 hours and are marked ⌛ פג תוקף. They can still be approved while the dates are free.
- **Cancel a booking:** delete its event.

## Development

The code lives in git (`apps-script/` + `shared/rules.js`). Google only holds a copy, which
`deploy.py` uploads through the Apps Script API. Edits made in the Apps Script editor are
overwritten by the next deploy, so always change the code here.

There are two deployments of the same code: **staging** (hidden test calendars and sheets, used by
the regression suite in `tests/e2e/`) and **production**. A change goes through staging first:

```
npm test                                   # booking rules (shared/rules.js)
git commit …                               # deploy.py refuses uncommitted backend code
npm run test:e2e                           # deploys this commit to staging, runs the suite, records the pass
python3 apps-script/deploy.py "note"       # production: refused unless the suite passed on this commit
git push                                   # the pre-push hook applies the same check to the site
npm run test:smoke                         # read-only checks of the live site and backend
python3 apps-script/deploy.py --status     # which commit each environment is running
```

- **`deploy.py`** uses the OAuth token in `~/.config/gcloud/shorashim/`. It reads IDs and secrets from `~/.config/gcloud/shorashim/booking-config.json` (production) or `booking-config.staging.json`: calendar IDs, the HMAC key that signs approve/decline links, the reCAPTCHA secret, and the script and deployment IDs. It writes them into a generated `Config.js` that exists only inside the Apps Script project. This repo is public, so never commit those values.
- **Every version is labelled with its commit** (`a1b2c3d note`, or `-dirty` for `--allow-dirty` staging tries), so `--status` shows what is live. **Rolling back** means pointing the deployment at an earlier version number.
- **The pre-push hook** lives in `.githooks/` (enable it in a fresh clone with `git config core.hooksPath .githooks`). It only blocks pushes to `main` that change the site, backend or tests. Emergency bypasses: `git push --no-verify`, `deploy.py --force`.
- **The web app URL stays the same** across deploys. It goes in `src/data/bookingConfig.ts`.
- **When the owner must run `setup` in the editor** (signed in as shorashimstay@gmail.com), once per environment: after creating a project, after changing `oauthScopes` in `appsscript.json`, and after changing which triggers `setup` installs. Ordinary code changes need nothing. For new scopes, push with `deploy.py --content-only` first, run `setup`, then deploy normally; releasing first would break the web app until the owner re-authorizes. Do staging, then production. `setup` is safe to re-run: it reinstalls the triggers and rewrites both spreadsheets.
- **Calendar access goes through the REST API** (`UrlFetchApp` with `ScriptApp.getOAuthToken()`). It creates an event with its details in one call and lists the three calendars in parallel. The manifest declares the Calendar advanced service; that declaration is what enables the Calendar API in the script's hidden default Cloud project, and without it the REST calls fail with 403. Event details live in **shared** extended properties, which is where `CalendarApp.setTag` stores them, so both APIs see the same data.
- **Request timings:** every successful request returns `timings` (milliseconds per step). The signed `?action=diag&t=<ms>&sig=<HMAC of "diag:"+t>` reports availability, snapshot and admin-sheet refresh times. The 5-minute timer also calls the web app, to keep Google from starting it cold for the next visitor.
- **Sheet protection:** the admin tabs are protected so only the owner can edit. For others, only פעולה and ביצוע in בקשות stay editable. The owner account itself can always edit everything.
- **Prices are data, not code:** `public/prices.json` (`{ version, prices }`) is published with the site at `/prices.json`. The site bundles it; the web app fetches it, keeps it for 10 minutes, and re-reads it early (at most once a minute) when a request carries a newer `pricesVersion` than its copy. If the file cannot be read or fails `checkPrices` (whole shekels, 100–20,000), it uses the last good copy (Script Properties), then the built-in `PRICES` in `shared/rules.js`. So a price change is a site change: commit, push, and it is live without `deploy.py`. `CONFIG.pricesUrl` overrides the address; staging instead gets the tree's file from the suite through the signed `testSetPrices` hook.
- **One copy of the rules:** `shared/rules.js` holds the date arithmetic, prices and validation, and both consumers use that same file. The site imports it as an ES module. Apps Script has no modules, so `deploy.py` strips the `export ` keyword on upload and every declaration becomes a global — which is why the file uses `var` and function declarations and never imports anything. `shared/rules.test.mjs` tests the module directly and also evaluates the stripped form to check it still defines the globals `Code.js` calls. `src/lib/stay.ts` adds only browser-side presentation helpers. The server still validates every request itself and remains authoritative.
