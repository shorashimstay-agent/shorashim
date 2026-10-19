# Shorashim booking backend

A Google Apps Script web app in the `shorashimstay@gmail.com` account. It powers the website's availability calendar and booking requests. Google Calendar is the only record of bookings.

## Calendars

| Calendar | What goes there | Blocks the website? |
|---|---|---|
| **שורשים – הזמנות** | Confirmed stays, phone bookings, dates Saray wants closed | Yes, every event |
| **שורשים – בקשות** | Website requests waiting for approval (⏳) | Yes, for 24 hours after the request |
| **שורשים – ערוצים** | Bookings imported from Booking.com / Airbnb (not connected yet) | Yes |

Each booking is an all-day event from the check-in date to the check-out date. Google Calendar's own end date is exclusive, so an event on 20–23 September blocks the nights of the 20th, 21st and 22nd. A timed event (for example a cleaning from 09:00 to 17:00) blocks every night whose stay window, 15:00 to 11:00 the next day, it overlaps.

### What clashes: spans, not nights

Availability is worked out in time. Every stay occupies a **span** (`staySpan` in `shared/rules.js`), and two stays clash exactly when their spans overlap. The bride packages' hours come from the owner (ClickUp `z8r3fdvdp6`, 18.10.2026):

| Stay on date D | Occupies | Calendar event (the nights it keeps from guests) · nights stayed |
|---|---|---|
| Couple stay | 15:00 on check-in → 11:00 on check-out | check-in → check-out · all |
| Wedding night | 15:00 → 13:00 the next day | D → D+1 · 1 |
| Prep day only (`bride_day`) | 08:00 → 16:00 on D | D-1 → D+1 · 0 |
| Night before + prep day (`bride_night_day`) | 17:30 on D-1 → 16:00 on D | D-1 → D+1 · 1 |
| Prep day + wedding night (`bride_day_wedding_night`) | 08:00 on D → 13:00 on D+1 | D-1 → D+1 · 1 |
| Closings, holds, channel and manual all-day events | their nights, as a couple stay | as entered |

Preparation can also start at 06:00 on a Friday by arrangement. Nothing chooses that automatically; an earlier start changes no clash, since anything before 08:00 is a night's stay that ends at 11:00 or later.

That gives the owner's rules in both booking orders. No guest can sleep the night before a prep day (their stay ends after 08:00). No couple can check in on a prep day's evening (15:00 is before 16:00). Another bride can check in at 17:30 for the next day, or prepare the next morning. Nobody can prepare the morning after a wedding night (13:00 is after 08:00). A prep day + wedding night keeps the night before free of guests without counting or charging it as a night.

A bride package's event covers the nights it keeps from guests, so the owner's calendar shows them taken. Its `nights` (`stayNights`) are the nights the guest actually stays, which is what the console, the admin sheet and the messages show, and the sheet's arrival and departure are the stay's own hours.

Stored stays carry their `request` JSON (`stayType`, `checkIn`, `checkOut`), and the backend works out their span from it together with the event's current dates (`storedSpan`, `itemSpanEvent_`). If the owner moves an event in Google Calendar, the stay moves with it; if she stretches it, the stay also keeps every night of the event. Cancelling or declining a stay frees exactly its own time. In the console, a phone booking of a bride package is entered over the night before and the wedding night, as on the website. If those nights clash, it can still be offered, and the server checks it by its hours.

The **blocked nights** the site and the snapshot carry are the nights a couple stay cannot take. They are exactly what they were before the spans for every package, so a page from before the spans stays correct. The **busy spans** (`busy`) are what the site uses to tell which package fits which date.

## Google Drive folder

Everything for the site lives in the Drive folder **shorashim-webpage** of the Shorashim account:

| File | Sharing | Contents |
|---|---|---|
| **Shorashim Booking** (Apps Script) | Private | The booking backend |
| **שורשים – ניהול הזמנות** | Private | Tabs בקשות / הזמנות / ערוצים mirroring the calendars, with approve/decline |
| **שורשים – זמינות לאתר** | Anyone with the link (view) | A header row, then from, to, generatedAt, blocked nights and busy spans (`start/end` local times, comma-separated). Dates and times only, no guest details |

The availability data is a separate file on purpose. The public file contains nothing but dates, so no sharing or publishing mistake can expose the guest details in the admin sheet. **Never share the admin sheet.**

The website reads the availability sheet's CSV export first, because Google answers it in well under a second. A cold call to the web app often takes 10 seconds or more. If the sheet is unreachable or its data is older than 30 minutes, the site asks the web app directly. The server re-checks every request, so stale availability can't cause a double booking.

Before the website opens or sends a request, it runs the **live check**: `GET ?action=check&start=YYYY-MM-DD&end=YYYY-MM-DD&stayType=…&checkIn=…&checkOut=…`. `[start, end)` are the stay's nights (`stayRange`, at most 14, inside the booking window), and the answer is for the stay's span. Without `stayType`, as pages from before the spans ask, it is for the nights as a couple stay. It answers `{ ok, free, conflicts, from, to, blocked, busy }`, where `blocked` and `busy` cover a window of ±44 days, which the site uses for the calendar and to offer up to 3 nearby stays. It is public and read-only: it never expires or deletes anything. All checks share one read of the calendars per 30 seconds (`CHECK_CACHE_SECONDS`), and checks that arrive while a read is running answer from the last copy, so steady traffic costs about 8,600 UrlFetch calls a day, against the account's 20,000. This is best effort, not a hard cap: the cache has no atomic claim. `?action=availability` has the same limits. Every booking change this backend makes clears that copy, so new requests show at once. An edit made directly in Google Calendar shows within 30 seconds. After a failed read, checks answer `server_error` for 10 seconds without retrying, and the site never shows a failed check as free.

Both spreadsheets are rewritten after every request or decision, whenever a booking calendar changes, and on a timer. Apps Script calendar change triggers only work on an account's primary calendar, and the booking calendars are secondary calendars. So `setup` falls back to a timer every 5 minutes, and Saray's own edits in Google Calendar reach the sheet and the website within about 5 minutes. The timer also lets expired holds drop out.

Calendars cannot be stored in Drive folders; they stay in Google Calendar.

## Day to day (Saray)

- **Close dates, add a phone booking or hold dates for someone:** in the owner console, tab יומן → **סגירת תאריכים** (below). Creating an event in **שורשים – הזמנות** in Google Calendar still works too; the website shows those nights as taken within a few minutes.
- **New website request:** an email arrives at shorashimstay@gmail.com, and a ⏳ event appears in **שורשים – בקשות**. Tap **לאישור או דחייה** in the email. It opens the owner console (shorashimstay.com/admin, password login) on that request; the link goes to the site rather than to script.google.com because on Android the Drive app claims script.google.com links and fails to open them. Emails sent before this change link to the older signed decision page, which still works.
  - **Approve** moves the stay into הזמנות. If the guest gave an email address, they get a Google Calendar invitation.
  - **Decline** removes the request and frees the dates.
  - Both screens offer a ready-made WhatsApp message to the guest.
- **Or decide from the sheet:** in **שורשים – ניהול הזמנות**, tab בקשות, choose אישור or דחייה in the **פעולה** column, then tick **ביצוע**. The tick is the confirmation, and it works in the Sheets phone app too. Decided requests stay at the bottom of the tab for 3 days with a WhatsApp link to the guest.
- **Unanswered requests** stop holding their dates after 24 hours and are marked ⌛ פג תוקף. They can still be approved while the dates are free.
- **Cancel a booking:** in the owner console, tab הזמנות → **ביטול** next to the booking (or from its night in יומן). Choose who asked to cancel (האורח / אנחנו) and, if the guest has an email, whether Google should send them a cancellation email; nothing is chosen in advance. The console shows the cancellation fee the terms set, for information only. The cancellation is logged in the sheet's **ביטולים** tab and the dates open on the website within about a minute. It cannot be undone: to restore a booking, add it again as a phone booking. A stay cannot be cancelled from the console once its check-in time has passed. Manual events made in Google Calendar are still cancelled by deleting the event there.
- **Or use the owner console** (below): the same requests, bookings and channel bookings, with approve
  and decline, on a page made for the phone.

## Owner console (`shorashimstay.com/admin`)

A page for the owner, made for the phone, at **https://shorashimstay.com/admin**
(`public/admin/index.html`). It logs in with a password and then stays logged in on that device.

- **Tabs:** בקשות (pending requests with אישור / דחייה, each confirmed with a second tap, then a
  ready-made WhatsApp message; recent decisions), יומן (month view of bookings, holds, channels and
  manual events, with **סגירת תאריכים**), הזמנות (website and phone bookings, then the closed dates
  with a reopen button; each upcoming website or phone booking has **ביטול**), ערוצים.
- **Closing dates** (`block`, `unblock`, `extendHold`; rules in `validateBlock`, shared/rules.js). The
  owner picks the first night and the check-out day, as on the website, then one of three kinds:
  **סגירה** (closed until reopened, with a reason and a private note), **הזמנה טלפונית** (a booking
  made by phone, stored like an approved website booking, with an optional calendar invite) or
  **שמירה זמנית** (held for 24, 48 or 72 hours, then it stops blocking and is deleted; it can be
  extended or turned into a phone booking). Each is an all-day event in **שורשים – הזמנות** with the
  shared properties `source: console`, `kind`, and the reason, holder, note or `expiresAt`. That
  calendar is what every reader already treats as taken, so a closing reaches the website, the
  console, the admin sheet and any channel feed built from the calendar with nothing more to
  connect. The backend refuses nights already taken (bookings, channel bookings, active request
  holds, console holds) under the script lock, runs each `requestId` once (closing, reopening and
  extending alike), and rewrites the availability snapshot before it answers. Reopening deletes
  console closings and holds only. Website and phone bookings are cancelled instead (below); manual
  events made in Google Calendar (which may be a guest's stay) and recurring events are changed in
  Google Calendar. A hold that ran out cannot be extended back, and a hold
  lasts at most a week from when it was made. Internal notes are private extended properties,
  since Google copies the shared ones to invited guests' events. A signed (HMAC) console call
  covers these arguments too: `consoleSigned_` appends `JSON.stringify(args)` of the parsed body,
  so a tool must sign the exact JSON it sends (same key order, no spaces, non-ASCII as is).
- **Cancelling a booking** (`cancelBooking`, `cancelBooking_`; fees in `cancellationFee`,
  shared/rules.js). Website bookings (`source: website`) and phone bookings (`source: console`,
  `kind: phone`) until the stay starts (`stayStartsAt`: check-in at 15:00 on the first night; a bride
  day at 08:00 on the wedding day); everything else is refused (`not_cancellable`, `started`). Shortening a stay already in progress is a later feature. The call needs
  `by` (`guest` or `us`) and `notify` as an explicit `true` or `false`: whether Google emails the
  guest a cancellation is the owner's choice each time, and it only happens when the event has an
  attendee. Under the script lock it appends a line to the admin sheet's **ביטולים** tab (time,
  reference, guest, dates, price, the confirmation date, who cancelled, the fee band and amount, the
  reason, whether the guest was emailed, the event id), then deletes the event. If the delete
  reports an error, the event is looked up again: the line is removed only if the event is still
  there, kept if it is gone (Google may delete and still answer with an error), and marked
  "לא ודאי" if the lookup fails too (a retry then runs again, so ביטולים may hold a "לא ודאי" line
  next to the real one; a line too many, never one too few). The console waits up to 60 seconds and, while the backend
  answers `in_progress`, asks again with the same `requestId`; it starts a new attempt only after
  a definite refusal. The deleted event is gone from every reader (the website, the sheets,
  and later the channel feeds), so ביטולים is the booking's only record afterwards: it is protected,
  never rewritten by the mirror refresh, and `setup` keeps it. The fee is what the terms set, by the
  time left before the stay starts (14+ days free, 7–14 half, under 7 full; nothing when we cancel), or
  the statutory 5% / ₪100 when the booking was confirmed at most 14 days ago and at least 7 days
  that are not Saturdays are left (holidays are not known, so this is guidance). The system charges
  nothing; `overview` gives each cancellable booking its `cancelFees` as of now, by the guest and by
  us, so the console does not compute them itself. A website booking's price is the site's estimate,
  so the console and the log mark it as one. `apps-script/code.test.mjs` runs Code.js in Node with
  stand-ins for Google's services, to test the log line's fate on a failed delete and that `setup`
  keeps ביטולים.
- **The page is public and holds no secrets.** It calls this web app's `console` action. `login`
  checks the password against `CONFIG.consolePasswordHash` (a salted HMAC, from `booking-config.json`,
  never in the repo) and returns a session token signed with the HMAC secret. Every other console
  call needs that token, or an HMAC signature over the operation and its arguments (tools and the
  test suite). Decisions go through `decideAndRecord_`, like the signed decision page and the sheet, and the
  sheets refresh as usual. `adminData_()` builds both the sheet's rows and the console's lists.
- **Guessing:** after 5 wrong passwords the login pauses for 15 minutes, for everyone (Apps Script
  cannot tell callers apart). The sheet and older emails' signed decision links keep working meanwhile.
- **Sessions do not expire.** "ניתוק מכל המכשירים" (in the status panel) logs out every device, and
  so does setting a new password.
- **Set or change the password** (forgotten, leaked, or routine):
  ```
  python3 apps-script/deploy.py --set-console-password     # asks without echo; stores only the hash
  python3 apps-script/deploy.py "rotate console password"  # the backend picks it up on deploy
  ```
  Staging has its own random password (`consolePassword` in `booking-config.staging.json`), which
  only the test suite uses.

## Event log (Firestore)

The backend keeps a record of what it did in Firestore: requests, decisions, console actions,
expired holds, sheet rebuilds, errors, and counts of rejected requests (`apps-script/src/EventLog.js`).

- **Where:** Firebase project `shorashim-log` (staging: `shorashim-log-staging`), on the free Spark
  plan with no billing account, so it cannot cost money. Collection `events`, database `(default)`,
  location `nam5`. Browse it in the Firebase console, signed in as shorashimstay@gmail.com.
- **Shape:** `type`, `actor`, `ref`, `id`, `class`, `ts` and `expireAt` are top-level and indexed,
  so they can be filtered on. The rest (dates, outcome, timings, commit) is in the `data` map, which
  is exempt from indexing: default indexes made each event about 3.4 KB instead of about 1. A new
  database needs that exemption too:
  `CLOUDSDK_CONFIG=<local path> gcloud --configuration=shorashim firestore indexes fields update data --collection-group=events --disable-indexes --project=<project>`.
- **No personal data.** An event keeps only allowlisted fields (`LOG_FIELDS`): the booking ref, the
  calendar event ID, dates, nights, the outcome, who acted (`guest`, `email`, `console`, `sheet`,
  `system`), timings, and the deployed commit. Never a name, phone, email, note, reason or WhatsApp
  link. Errors are stored as a classification (`Error · Calendar API 403`), never their text, which
  can quote a guest's details. **To find the guest,** look the ref up in the console or the admin sheet, which lead to the
  calendar event. Once that event is deleted (declined, cancelled, expired), only the non-personal
  facts remain, by design.
- **Retention:** requests and console actions 3 years, everything else 90 days. Firestore's TTL
  needs billing, so the timer deletes expired events itself, once a day.
- **It never slows or breaks a booking.** Recording an event is one Script Property write in a
  `try/catch`. The 10-minute timer sends the buffer in one Firestore commit at the end of its run.
  After a failed or slow commit it waits an hour before trying again, doubling up to six hours. The
  buffer stops at 100 events (the rest are counted as `log.dropped`), so it can never fill Script
  Properties; events other than bookings and owner actions stop at 80, so a flood of refused
  requests or rebuilds cannot push the business record out. Rejected requests and locked-out logins are only counted, and each flush writes the
  counts as one `log.counts` event, so a flood of bad requests is one entry. Counts waiting through
  an outage stay one merged record (`logCountsPending`). A batch Firestore refuses outright (HTTP
  400) is dropped, counted as `log.rejected` (by type) and backed off, rather than retried forever. A failed prune waits
  for the next day.
- **Access:** the service account `event-log-writer@<project>.iam.gserviceaccount.com` may only read
  and write documents (`roles/datastore.user`). Its key is `firestore` in `booking-config*.json`,
  which `deploy.py` writes into the generated `Config.js`; it is never in git. Without that key the
  log does nothing.
- **Health:** signed `diag` reports `eventLog` (configured, buffered events, backoff, last prune),
  and the production smoke test checks it.
- **Rotate the key** (leaked, or routine):
  ```
  P=shorashim-log   # or shorashim-log-staging
  C=<local path>   # or <local path>
  CLOUDSDK_CONFIG=<local path> gcloud --configuration=shorashim iam service-accounts keys create /tmp/k.json --iam-account=event-log-writer@$P.iam.gserviceaccount.com
  # The config uses camelCase names; with the key file's own names the log silently turns off.
  python3 -c 'import json,sys; k=json.load(open("/tmp/k.json")); c=json.load(open(sys.argv[1]));
  c["firestore"]={"projectId":k["project_id"],"clientEmail":k["client_email"],"privateKeyId":k["private_key_id"],"privateKey":k["private_key"]};
  json.dump(c,open(sys.argv[1],"w"),ensure_ascii=False,indent=2)' "$C" && shred -u /tmp/k.json
  python3 apps-script/deploy.py "rotate event log key"     # staging: --env staging
  CLOUDSDK_CONFIG=<local path> gcloud --configuration=shorashim iam service-accounts keys list --iam-account=event-log-writer@$P.iam.gserviceaccount.com
  CLOUDSDK_CONFIG=<local path> gcloud --configuration=shorashim iam service-accounts keys delete <old key id> --iam-account=event-log-writer@$P.iam.gserviceaccount.com
  ```

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

- **`deploy.py`** uses each environment's OAuth token: `<local path>` for production and `<local path>` (made by `authorize-staging.py` next to it) for staging. Each backend runs as its own account, so the staging suite's emails come out of the staging account's daily Gmail quota, never production's. It reads IDs and secrets from `<local path>` (production) or `<local path>` (staging): calendar IDs, the HMAC key that signs approve/decline links, the reCAPTCHA secret, and the script and deployment IDs. It writes them into a generated `Config.js` that exists only inside the Apps Script project. This repo is public, so never commit those values.
- **Every version is labelled with its commit** (`a1b2c3d note`, or `-dirty` for `--allow-dirty` staging tries), so `--status` shows what is live. **Rolling back** means pointing the deployment at an earlier version number.
- **The pre-push hook** lives in `.githooks/` (enable it in a fresh clone with `git config core.hooksPath .githooks`). It only blocks pushes to `main` that change the site, backend or tests. Emergency bypasses: `git push --no-verify`, `deploy.py --force`.
- **The web app URL stays the same** across deploys. It goes in `src/data/bookingConfig.ts`.
- **When the owner must run `setup` in the editor** (signed in as shorashimstay@gmail.com for production, shorashimzichron@gmail.com for staging), once per environment: after creating a project, after changing `oauthScopes` in `appsscript.json`, and after changing which triggers `setup` installs. Ordinary code changes need nothing. For new scopes, push with `deploy.py --content-only` first, run `setup`, then deploy normally; releasing first would break the web app until the owner re-authorizes. Do staging, then production. `setup` is safe to re-run: it reinstalls the triggers and rewrites both spreadsheets.
- **Calendar access goes through the REST API** (`UrlFetchApp` with `ScriptApp.getOAuthToken()`). It creates an event with its details in one call and lists the three calendars in parallel. The manifest declares the Calendar advanced service; that declaration is what enables the Calendar API in the script's hidden default Cloud project, and without it the REST calls fail with 403. Event details live in **shared** extended properties, which is where `CalendarApp.setTag` stores them, so both APIs see the same data.
- **reCAPTCHA score:** requests need a score of 0.5 or more (`CONFIG.recaptchaMinScore`, default 0.5).
  Staging sets 0 in `booking-config.staging.json`: after a few runs Google scores the suite's
  automated browser as a bot (0.1), so staging still verifies each token but not its score. The
  production smoke test checks that a real browser on the live site scores 0.5 or more.
- **Request timings:** every successful request returns `timings` (milliseconds per step). The signed `?action=diag&t=<ms>&sig=<HMAC of "diag:"+t>` reports availability, snapshot and admin-sheet refresh times. The 5-minute timer also calls the web app, to keep Google from starting it cold for the next visitor.
- **Sheet protection:** the admin tabs are protected so only the owner can edit. For others, only פעולה and ביצוע in בקשות stay editable. The owner account itself can always edit everything.
- **Prices are data, not code:** they live only in the owner's prices spreadsheet (`CONFIG.pricesSheetId`, tab `מחירים`, rows of key / label / price, read by `pricesFromRows` in `shared/rules.js`). The site reads it as a public CSV when a page opens, so page views never run the web app. The web app reads it to price requests, keeps it for 10 minutes, re-reads it early (at most once a minute) when a request carries a different `pricesVersion`, and keeps the last good copy (Script Properties) if the sheet cannot be read or fails `checkPrices` (whole shekels, 100–20,000). Before any good copy exists there are no prices: requests are accepted with no estimate and the owner's email says to price them by hand. The version is derived from the prices (`pricesVersionOf`), so the site and the web app agree on it. A price change is an edit in the sheet: no build, no `deploy.py`. Friday and Saturday nights take `weekendPerNight`. Staging has its own prices sheet (scenario G10 edits it); the rest of the suite pins its test prices (`tests/e2e/fixtures/prices.json`) through the signed `testSetPrices` hook.
- **One copy of the rules:** `shared/rules.js` holds the date arithmetic, prices and validation, and both consumers use that same file. The site imports it as an ES module. Apps Script has no modules, so `deploy.py` strips the `export ` keyword on upload and every declaration becomes a global — which is why the file uses `var` and function declarations and never imports anything. `shared/rules.test.mjs` tests the module directly and also evaluates the stripped form to check it still defines the globals `Code.js` calls. `src/lib/stay.ts` adds only browser-side presentation helpers. The server still validates every request itself and remains authoritative.
