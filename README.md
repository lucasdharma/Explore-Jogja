# Our Yogyakarta

A guide to the coffee, slow bars and food of Yogyakarta, made for the guests of
Hilga & Lucas's wedding on 8 August 2026.

It's one page. `index.html` holds the markup, the styling and the script — the
places, the map, the falling Aksara Jawa curtain and all — with no build step
and no dependencies to install. Open the file in a browser and you have the
site.

## What's here

| | |
| --- | --- |
| `index.html` | The whole guide. Edit the places, the names and the dates near the top of the `<script>`. |
| `assets/` | Photographs, the joglo roof, and the Javanese corpus the curtain is woven from. |
| `icons/` | Home-screen icons. |
| `manifest.webmanifest`, `sw.js` | What makes it installable and lets the shell open offline. |
| `apps-script/` | The Google Sheet that carries friends' recommendations between devices. |

## Running it

Any static server will do — the service worker and the recommendation form both
need a real origin, so opening the file over `file://` won't show you everything:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Editing the guide

Everything you'd normally want to change sits at the top of the `<script>` block
in `index.html`, behind a comment that says so. Each place is an entry with a
category and `coords: [lat, lng]`; adding `img:` gives it a photograph on its
card, and `url:` points *Get directions* at its exact Google Maps listing rather
than a search for its name.

## Recommendations from guests

Guests can add a place from the form at the bottom of the page. They search as
they type — [Photon](https://photon.komoot.io/), a free geocoder over
OpenStreetMap data — or drop the pin themselves when OSM has never heard of the
warung, which in this city is often.

Where those tips *go* depends on one line. Out of the box `REC_ENDPOINT` is
empty and a tip stays in the browser that wrote it, which means a phone and a
laptop never see each other's. Point it at a Google Apps Script deployment and
tips are shared with every guest instead, on any device, moderated from a
spreadsheet. **[apps-script/README.md](apps-script/README.md)** covers the five
minutes that takes.

## Publishing

It's a static site, so anything that serves files will host it; it currently
lives on GitHub Pages, built from `main`. The page asks search engines not to
index it — the link works for anyone who has it, it just shouldn't be something
strangers stumble into.
