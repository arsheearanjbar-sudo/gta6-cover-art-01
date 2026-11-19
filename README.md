# Neon Sunset Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/arsheearanjbar-sudo/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/arsheearanjbar-sudo/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your photos and a caption into a three-panel GTA-style cover poster: a hero panel and two stacked panels with diagonal white gutters, a Vice City sunset or neon colour grade, and bold Anton lettering — exported as a PNG in 1080×1080, 1080×1350 or 1920×1080, ready to post.

## What it does

- **Your photos, three panels.** Load a photo from your machine into each panel, or use one photo for all three. Drag a photo to move it, zoom it with the slider.
- **Caption lettering.** Write the caption and tagline; the poster sets them in Anton (bundled under `app/fonts/`, SIL OFL) with a heavy outline and drop shadow.
- **Colour grades.** Sunset, Neon Nights, Palm Dusk and Mono — a wash, a sun glow and a vignette over the panels.
- **Three post sizes.** Square 1080×1080, Portrait 1080×1350, Wide 1920×1080. The panel layout adapts to each.
- **Offline, private.** A static page — no build step, no network request. Photos are read on your own machine and never uploaded. The two bundled sample photos (`app/samples/`) were made with an image model for make.fun and are free to use.

## Run

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Pick a size and a grade, fill the three panels, write the caption, press **Export PNG**.

## How it is built

- `app/index.html` — the studio page and its controls.
- `app/style.css` — the dark editor theme.
- `app/src/cover.js` — the poster painter: panel layout, photo cover-fit, grades, lettering.
- `app/src/main.js` — the wiring: uploads, drag to pan, size and grade, export.
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover` or `?shot=editor`).
- `app/fonts/Anton-Regular.ttf` — the display font, SIL OFL (see `app/fonts/OFL.txt`).
- `main.ts` — copies `app/` and `screenshots/` to `/output` and writes `dossier.json`.

## Referral

Built with [make.fun](https://make.fun/r/sh01ee1y) — if you want to build your own entry, sign up with my link https://make.fun/r/sh01ee1y (referral code `sh01ee1y`).
