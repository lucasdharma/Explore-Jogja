/**
 * Our Yogyakarta — the shelf where friends' recommendations live.
 *
 * A Google Sheet is the whole database: guests POST a tip, it lands as a row,
 * and it is live on everyone's map straight away. Free, no card, no server.
 *
 * Nothing is waiting on you — the Hidden column is a brake, not a gate. Type
 * "y" against a row and it leaves the map; leave it empty and the tip stands.
 *
 * Setup lives in README.md next door.
 *
 * Columns, in order — the header row is written for you on first run:
 *   A Received   B Hidden   C Id   D Name   E Place   F Why   G Link   H Lat   I Lng
 */

var SHEET_NAME = 'Recommendations';
var HEADERS = ['Received','Hidden','Id','Name','Place','Why','Link','Lat','Lng'];

/* Yogyakarta and its ring of regencies — the same box the guide checks against,
   so a pin can never arrive from the other side of the world. */
var BOUNDS = { minLat:-8.4, maxLat:-7.2, minLng:110.0, maxLng:110.9 };

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function str_(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

/**
 * GET — every visible row, as JSON, for the guide to draw.
 * Only the columns the map actually needs go out: no timestamps, no e-mail
 * addresses, and nothing you've struck out.
 */
function doGet() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return json_([]);

  var rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var out = [];

  rows.forEach(function (r) {
    var hidden = String(r[1]).trim().toLowerCase();
    if (hidden === 'y' || hidden === 'yes' || hidden === 'true' || r[1] === true) return;
    if (!String(r[4]).trim()) return;

    var lat = parseFloat(r[7]), lng = parseFloat(r[8]);
    var pinned = isFinite(lat) && isFinite(lng) &&
                 lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat &&
                 lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;

    out.push({
      id:    String(r[2]),
      by:    String(r[3]),
      place: String(r[4]),
      why:   String(r[5]),
      url:   String(r[6]),
      lat:   pinned ? lat : null,
      lng:   pinned ? lng : null
    });
  });

  return json_(out);
}

/**
 * POST — a guest sends a tip. Arrives as text/plain so the browser treats it as
 * a simple request and skips the CORS preflight, which Apps Script can't answer.
 *
 * Everything is clamped and re-typed here rather than trusted: this endpoint is
 * open to anyone who has the URL, and a tip now goes live the moment it lands.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ ok:false, error:'empty' });

    var body = JSON.parse(e.postData.contents);

    /* The form carries a field no human can see. A person leaves it empty; the
       kind of bot that scrapes endpoints out of page source fills everything in.
       Answer it "ok" and write nothing, so whatever is on the other end has no
       reason to try again. */
    if (str_(body.hp, 200)) return json_({ ok:true });

    var place = str_(body.place, 120);
    if (!place) return json_({ ok:false, error:'no place' });

    var link = str_(body.url, 500);
    if (link && !/^https?:\/\//i.test(link)) link = '';

    var lat = '', lng = '';
    if (Array.isArray(body.coords) && body.coords.length === 2) {
      var la = parseFloat(body.coords[0]), ln = parseFloat(body.coords[1]);
      if (isFinite(la) && isFinite(ln) &&
          la >= BOUNDS.minLat && la <= BOUNDS.maxLat &&
          ln >= BOUNDS.minLng && ln <= BOUNDS.maxLng) { lat = la; lng = ln; }
    }

    /* one writer at a time, so two guests submitting together can't land on
       the same row */
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      sheet_().appendRow([
        new Date(),
        '',                      /* Hidden — empty means live; "y" takes it down */
        str_(body.t, 40),
        str_(body.by, 80),
        place,
        str_(body.why, 2000),
        link,
        lat,
        lng
      ]);
    } finally {
      lock.releaseLock();
    }

    return json_({ ok:true });
  } catch (err) {
    return json_({ ok:false, error:String(err) });
  }
}
