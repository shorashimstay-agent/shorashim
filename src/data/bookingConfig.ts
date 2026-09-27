// Endpoints for the booking backend in apps-script/. Neither value is secret: both ship in the built JS.
// An empty BOOKING_API_URL turns the site back into the WhatsApp-only booking flow.
export const BOOKING_API_URL =
  'https://script.google.com/macros/s/AKfycbwP44lR5eBIRvpV2cYMBlN8fHMp9mrI1WljV3f6lgagccNSh-eGkuteNwMH_c6YjK19/exec';
// CSV export of the public availability spreadsheet (dates only). Read first because it is fast; empty skips it.
export const AVAILABILITY_SNAPSHOT_URL =
  'https://docs.google.com/spreadsheets/d/1Smo3crVVKTyGS3Lp-1x2pB8hCsCcDrUdCU-aY0l8Seo/gviz/tq?tqx=out:csv&range=A1:D2&headers=0';
export const RECAPTCHA_SITE_KEY = '6LeyGtItAAAAAN7IpSWSORlS3-80NbiDUROabx2E';
