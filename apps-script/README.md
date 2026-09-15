# Shorashim booking backend

A Google Apps Script web app in the `shorashimzichron@gmail.com` account. It powers the website's availability calendar and booking requests. Google Calendar is the only record of bookings.

## Calendars

| Calendar | What goes there | Blocks the website? |
|---|---|---|
| **שורשים – הזמנות** | Confirmed stays, phone bookings, dates Saray wants closed | Yes, every event |
| **שורשים – בקשות** | Website requests waiting for approval (⏳) | Yes, for 24 hours after the request |
| **שורשים – ערוצים** | Bookings imported from Booking.com / Airbnb (not connected yet) | Yes |

Each booking is an all-day event from the check-in date to the check-out date. Google Calendar's own end date is exclusive, so an event on 20–23 September blocks the nights of the 20th, 21st and 22nd. A timed event (for example a cleaning from 09:00 to 17:00) blocks every night whose stay window, 15:00 to 11:00 the next day, it overlaps.

A bride day or "night before + bride day" on wedding date D holds the night before (D-1) and the wedding night (D).

## Day to day (Saray)

- **Close dates or add a phone booking:** create an event in **שורשים – הזמנות**. The website shows those nights as taken within about two minutes.
- **New website request:** an email arrives at shorashimzichron@gmail.com, and a ⏳ event appears in **שורשים – בקשות**. Tap **לאישור או דחייה** in the email:
  - **Approve** moves the stay into הזמנות. If the guest gave an email address, they get a Google Calendar invitation.
  - **Decline** removes the request and frees the dates.
  - Both screens offer a ready-made WhatsApp message to the guest.
- **Unanswered requests** stop holding their dates after 24 hours and are marked ⌛ פג תוקף. They can still be approved while the dates are free.
- **Cancel a booking:** delete its event.

## Development

```
npm test                               # booking rules (apps-script/src/rules.js)
python3 apps-script/deploy.py "note"   # push code and update the web app deployment
```

- **`deploy.py`** uses the OAuth token in `<local path>`. It reads IDs and secrets from `<local path>`: calendar IDs, the HMAC key that signs approve/decline links, the reCAPTCHA secret, and the script and deployment IDs. It writes them into a generated `Config.js` that exists only inside the Apps Script project. This repo is public, so never commit those values.
- **The web app URL stays the same** across deploys. It goes in `src/data/bookingConfig.ts`.
- **Adding OAuth scopes:** if a change adds scopes to `appsscript.json`, the account owner must open the web app URL once, signed in as shorashimzichron@gmail.com, to re-authorize it.
- **Rules are shared by the script and the site:** `rules.js` is plain global functions, because Apps Script has no modules. The Node tests load it with `vm`. `src/lib/stay.ts` mirrors the date rules for the site; the server remains authoritative.
