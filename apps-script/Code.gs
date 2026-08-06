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
 *   A Received  B Hidden  C Id  D Name  E Place  F Why  G Link  H Lat  I Lng  J Image
 */

var SHEET_NAME = 'Recommendations';
var HEADERS = ['Received','Hidden','Id','Name','Place','Why','Link','Lat','Lng','Image'];

/* Photos guests send land here, in your Drive. The folder is made on the first
   photo and reused after that; delete a file and that tip simply loses its
   picture, which the guide draws as the woven gradient instead. */
var PHOTO_FOLDER = 'Our Yogyakarta — guest photos';
var PHOTO_MAX_BYTES = 4 * 1024 * 1024;

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
    return sh;
  }
  /* A sheet made before a column existed would otherwise keep an old header over
     new data — so bring the row up to date rather than making you type it in. */
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < HEADERS.length) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sh;
}

/* The folder guests' photos go into, made once and found by name after that. */
function photoFolder_() {
  var found = DriveApp.getFoldersByName(PHOTO_FOLDER);
  return found.hasNext() ? found.next() : DriveApp.createFolder(PHOTO_FOLDER);
}

/**
 * Save a guest's photo to Drive and hand back a URL the guide can draw.
 *
 * Returns '' for anything that isn't a plausible image, rather than throwing:
 * a picture that won't save should cost a guest their photo, never their
 * recommendation.
 */
function savePhoto_(base64, type, place) {
  try {
    if (!base64) return '';
    if (base64.length * 0.75 > PHOTO_MAX_BYTES) return '';
    if (type && String(type).indexOf('image/') !== 0) return '';

    var name = (String(place || 'a place').replace(/[^\w \-]/g, '').slice(0, 60) || 'a place') +
               ' — ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HHmmss') + '.jpg';
    var blob = Utilities.newBlob(Utilities.base64Decode(base64), type || 'image/jpeg', name);
    var file = photoFolder_().createFile(blob);

    /* the guide is opened by guests who are signed into nothing, so the file has
       to be readable by way of its link alone */
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    /* Drive's /thumbnail endpoint is the one that answers with image bytes an
       <img> can use; the /uc?export=view form now often replies with a page. */
    return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600';
  } catch (err) {
    return '';
  }
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

    var image = String(r[9] || '').trim();

    out.push({
      id:    String(r[2]),
      by:    String(r[3]),
      place: String(r[4]),
      why:   String(r[5]),
      url:   String(r[6]),
      lat:   pinned ? lat : null,
      lng:   pinned ? lng : null,
      image: /^https?:\/\//i.test(image) ? image : ''
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

    /* Written to Drive before the lock is taken: saving a photo is far and away
       the slowest thing here, and holding every other guest behind it would turn
       one big picture into a queue. */
    var image = savePhoto_(body.photo, body.photoType, place);

    /* one writer at a time, so two guests submitting together can't land on
       the same row */
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
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
        lng,
        image
      ]);
    } finally {
      lock.releaseLock();
    }

    return json_({ ok:true });
  } catch (err) {
    return json_({ ok:false, error:String(err) });
  }
}
