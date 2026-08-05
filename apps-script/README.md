# The shelf for friends' recommendations

A Google Sheet holds every tip guests send, and you decide which ones reach the
map. No server, no credit card, no monthly bill — Apps Script is free on a
normal Google account, and a wedding's worth of traffic doesn't come close to
the quotas.

Until `REC_ENDPOINT` in `index.html` is filled in, the guide behaves exactly as
it did before: a guest's tip is saved on their own device and reaches you by
email. Nothing below is required for the site to work — it's what lets guests
see *each other's* recommendations.

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

## Approving a tip

Every submission lands in the **Recommendations** tab straight away, but the map
ignores it until you say so. Put a `y` in the **Approved** column and it appears
for every guest on their next visit.

| Column | What it's for |
| --- | --- |
| Received | When it arrived. Written for you. |
| **Approved** | **The only column you edit.** `y` publishes it; empty hides it. |
| Id | Matches the copy on the sender's own device, so they don't see it twice. |
| Name | Who sent it. |
| Place | What it's called — becomes the pin's label. |
| Why | Their words, shown on the card and in the popup. |
| Link | Their Google Maps link, if they pasted one. Drives *Get directions*. |
| Lat / Lng | Where they pinned it. |

Edit any of it before approving — fix a spelling, trim a rambling *Why*, tidy a
name. What's in the row is what guests see.

**No Lat/Lng?** They typed a place OpenStreetMap doesn't know and didn't drop a
pin. The tip still shows as a card; it just has no marker. To place it: find the
spot on [Google Maps](https://maps.google.com), right-click it, click the
coordinates to copy them, and paste them into Lat and Lng.

## Changing the script later

Apps Script keeps serving the *deployed* version, not the saved one, so editing
`Code.gs` alone changes nothing. After an edit: **Deploy → Manage deployments →**
the pencil icon **→ Version: New version → Deploy**. The `/exec` URL stays the
same, so `index.html` needs no change.

## Worth knowing

- **Roughly a two-second cold start.** The first guest of the day waits a moment
  for their tip to send. The form tells them it's sending.
- **If the sheet is ever unreachable**, the guide carries on without it — the map
  still draws, and the guest is offered the email fallback.
- **The URL is effectively public.** Anyone who views the page source can find it
  and post to your sheet. The approval column is what makes that harmless; the
  script also caps field lengths and throws out any pin outside Yogyakarta.
- **Quotas** are 20,000 script runs a day on a free account. A wedding will use a
  few hundred at most.
