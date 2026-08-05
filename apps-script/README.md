# The shelf for friends' recommendations

A Google Sheet holds every tip guests send, and hands them straight back out to
every other guest, on whatever device they're holding. No server, no credit
card, no monthly bill — Apps Script is free on a normal Google account, and a
wedding's worth of traffic doesn't come close to the quotas.

**This is the part that makes recommendations cross between devices.** Until
`REC_ENDPOINT` in `index.html` is filled in, a tip is saved only in the browser
that wrote it: type one on a laptop and your phone will never see it, because
`localStorage` is per-device *and* per-browser. That's the fallback, not the
feature. Everything below is what turns it on.

## Setting it up — about five minutes

1. **Make the sheet.** Go to [sheets.new](https://sheets.new) and name it
   something like *Our Yogyakarta — recommendations*. Leave it empty; the script
   writes its own header row.

2. **Add the script.** In that sheet: **Extensions → Apps Script**. Delete the
   `function myFunction() {}` stub, paste in everything from `Code.gs`, and save.

3. **Deploy it.** **Deploy → New deployment**, and set the type to **Web app**
   with the cog next to "Select type".
   - *Description* — anything, e.g. `recommendations v1`
   - *Execute as* — **Me**
   - *Who has access* — **Anyone**

   "Anyone" is what lets guests post without a Google login. It has to be this,
   and it's why `doPost` treats everything it receives as untrusted.

4. **Grant access.** Google will warn you that the script is unverified — it's
   your own script, so click **Advanced → Go to (your project name)** and allow
   it. This happens once.

5. **Copy the URL.** You'll get one ending in `/exec`. Paste it into the
   `REC_ENDPOINT` line near the top of the `<script>` block in `index.html`:

   ```js
   const REC_ENDPOINT = 'https://script.google.com/macros/s/AKfy…/exec';
   ```

That's it. Commit, push, done.

## Taking a tip down

Nothing waits on you. A submission lands in the **Recommendations** tab and is
live on everyone's map immediately — the guest who sent it doesn't have to
wonder whether it worked, and you don't have to be at a laptop for the guide to
keep working.

The **Hidden** column is the brake. Type `y` against a row and it's off the map
the next time anyone opens the page. Clear it and it's back.

| Column | What it's for |
| --- | --- |
| Received | When it arrived. Written for you. |
| **Hidden** | **The only column you normally touch.** Empty = live. `y` takes it down. |
| Id | Matches the copy on the sender's own device, so they don't see it twice. Leave it alone. |
| Name | Who sent it. |
| Place | What it's called — becomes the pin's label. |
| Why | Their words, shown on the card and in the popup. |
| Link | Their Google Maps link, if they pasted one. Drives *Get directions*. |
| Lat / Lng | Where they pinned it. |

Every cell is editable and guests see whatever's in it, so you can fix a
spelling, trim a rambling *Why*, or tidy a name at any point — the change shows
up on its own without anyone resubmitting.

One quiet exception, worth knowing before it puzzles you: hiding a row takes it
off the map for everyone *except* the guest who wrote it, whose own browser
still holds their copy. Nobody is ever shown that their tip was taken down. It
also means your own test tips linger on your own screen after you've deleted the
row — see the note on clearing them below.

**No Lat/Lng?** They typed a place OpenStreetMap doesn't know and didn't drop a
pin. The tip still shows as a card; it just has no marker. To place it: find the
spot on [Google Maps](https://maps.google.com), right-click it, click the
coordinates to copy them, and paste them into Lat and Lng.

## Testing it, and clearing up afterwards

Test tips are live the moment you send them, so do your testing before you hand
the link round, and clean up in both places when you're done:

1. **The sheet** — delete the test rows (from row 2 down, keeping the header
   row), or type `y` in Hidden.
2. **Your own browser** — this is the one people forget. Your submissions are
   also cached on your own device and show up regardless of the sheet. Open the
   guide with `?reset` on the end of the address and it forgets them:

   ```
   https://<your-pages-url>/?reset
   ```

   That clears this browser's tips and the name it was greeted by, nothing else
   — the sheet isn't touched and no other guest loses anything. You'll get the
   welcome dialog back, which is how you know it worked. It's the only way to do
   this on a phone, where there's no console; on a laptop
   `localStorage.clear(); location.reload()` does the same thing.

To see exactly what a guest receives, open your `/exec` URL in a browser tab —
that JSON array *is* the shared data, and nothing else reaches anyone. Then open
the site in an **incognito window**: no stored tips, no remembered name, so
you're seeing precisely what someone arriving for the first time sees.

## Changing the script later

Apps Script keeps serving the *deployed* version, not the saved one, so editing
`Code.gs` alone changes nothing. After an edit: **Deploy → Manage deployments →**
the pencil icon **→ Version: New version → Deploy**. The `/exec` URL stays the
same, so `index.html` needs no change.

## Worth knowing

- **New tips arrive without a reload.** The guide re-reads the sheet whenever a
  guest returns to the tab, so a phone left open catches up by itself. It won't
  re-frame the map while someone is reading it.
- **Roughly a two-second cold start.** The first guest of the day waits a moment
  for their tip to send. The form tells them it's sending.
- **If the sheet is ever unreachable**, the guide carries on without it — the map
  still draws, and the guest is offered the email fallback.
- **The URL is effectively public**, and tips now publish themselves, so the
  guardrails sit in the script: it drops anything that fills the form's hidden
  bot-trap field, caps every field's length, throws out pins outside Yogyakarta,
  and the page escapes a guest's words before drawing them. What it cannot judge
  is taste — that's what the Hidden column is for.
- **Quotas** are 20,000 script runs a day on a free account. A wedding will use a
  few hundred at most.
