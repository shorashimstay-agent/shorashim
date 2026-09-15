// Endpoints for the booking backend in apps-script/. Neither value is secret: both ship in the built JS.
// An empty BOOKING_API_URL turns the site back into the WhatsApp-only booking flow.
export const BOOKING_API_URL =
  'https://script.google.com/macros/s/AKfycbxU-EeYQRI4GRVZ9uZEmPVh7uPgvtEaf87OAN-1oVsFuGrKcpT-kWvBuIHHzuYZ8Pro/exec';
// CSV export of the public availability spreadsheet (dates only). Read first because it is fast; empty skips it.
export const AVAILABILITY_SNAPSHOT_URL =
  'https://docs.google.com/spreadsheets/d/181zuBtQn9_ooEX5JinfWVfyAKwa5wsuwTfQTI0pGbbo/gviz/tq?tqx=out:csv&range=A1:D2&headers=0';
export const RECAPTCHA_SITE_KEY = '6Lfscr0tAAAAAOw6XoVxjT_5MQYm41CsTB90yvu6';
