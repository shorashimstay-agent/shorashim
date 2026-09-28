/**
 * Shorashim owner console: a web app that only the owner account can open (appsscript.json:
 * access MYSELF). It shows the booking backend's requests, bookings and channel bookings and
 * approves or declines requests, the same options the admin sheet offers.
 *
 * It holds no booking logic. Every call goes to the booking web app (apps-script/) as a signed
 * `console` action, so writes keep going through that project's lock and rules. CONFIG comes from
 * Config.js, which deploy.py generates (the booking web app URL and the signing secret); it is never
 * committed.
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Console')
    .setTitle('שורשים · ניהול')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Called from the page with google.script.run. op: 'overview' | 'decide'. */
function api(op, args) {
  args = args || {};
  var body = { action: 'console', op: String(op), t: String(Date.now()), id: String(args.id || ''), decision: String(args.decision || '') };
  body.sig = sign_(['console', body.t, body.op, body.id, body.decision].join(':'));
  return callBooking_(body);
}

/** Same as the booking web app's sign_: HMAC-SHA256, web-safe base64 without padding. */
function sign_(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, CONFIG.hmacSecret)).replace(/=+$/, '');
}

/**
 * Google's front end for Apps Script now and then answers with an HTML error page, or turns the
 * POST into a GET (which returns the web app's default reply). Retry until the answer has a shape
 * the console understands. A repeated decision is safe: the backend returns the first result.
 */
function callBooking_(body) {
  var last = '';
  for (var attempt = 1; attempt <= 4; attempt++) {
    try {
      var res = UrlFetchApp.fetch(CONFIG.bookingUrl, {
        method: 'post',
        contentType: 'text/plain;charset=utf-8',
        payload: JSON.stringify(body),
        muteHttpExceptions: true,
        followRedirects: true,
      });
      var text = res.getContentText();
      last = res.getResponseCode() + ' ' + text.slice(0, 120);
      var data = JSON.parse(text);
      if (!(data.ok === true && data.service)) return data;
    } catch (err) {
      last = String(err);
    }
    Utilities.sleep(700 * attempt);
  }
  console.error('booking web app gave no usable answer: ' + last);
  return { ok: false, error: 'network' };
}
