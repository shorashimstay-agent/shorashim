// Endpoints for the booking backend in apps-script/. None of these values is secret: they ship in the built JS.
// The VITE_* variables override them for a build against the staging backend (tests/e2e).
// An empty BOOKING_API_URL turns the site back into the WhatsApp-only booking flow.
export const BOOKING_API_URL =
  import.meta.env.VITE_BOOKING_API_URL ??
  'https://script.google.com/macros/s/AKfycbwP44lR5eBIRvpV2cYMBlN8fHMp9mrI1WljV3f6lgagccNSh-eGkuteNwMH_c6YjK19/exec';
// CSV export of the public availability spreadsheet (dates only). Read first because it is fast; empty skips it.
export const AVAILABILITY_SNAPSHOT_URL =
  import.meta.env.VITE_AVAILABILITY_SNAPSHOT_URL ??
  'https://docs.google.com/spreadsheets/d/1Smo3crVVKTyGS3Lp-1x2pB8hCsCcDrUdCU-aY0l8Seo/gviz/tq?tqx=out:csv&range=A1:D2&headers=0';
export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '6LeyGtItAAAAAN7IpSWSORlS3-80NbiDUROabx2E';
// CSV export of the owner's prices sheet (view-only for anyone with the link). The page reads prices
// only from here; empty shows none. The staging suite points it at its own test prices.
export const PRICES_CSV_URL =
  import.meta.env.VITE_PRICES_CSV_URL ??
  'https://docs.google.com/spreadsheets/d/1_6LuMPp9UnWfL07z37lTV2UMnMkn69nJu2z6hqRjkGM/gviz/tq?tqx=out:csv&sheet=%D7%9E%D7%97%D7%99%D7%A8%D7%99%D7%9D&range=A1:C20';
