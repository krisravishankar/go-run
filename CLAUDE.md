# GoRun

A GPS running tracker Progressive Web App (PWA) installable on iPhone via Safari "Add to Home Screen". No App Store, no Xcode required.

## Stack

- **React 18 + TypeScript + Vite 5**
- **Google Fonts** — Nunito (loaded via CSS `@import`)
- **Geolocation API** — `navigator.geolocation.watchPosition` for live GPS tracking
- **vite-plugin-pwa** — generates service worker + web manifest for PWA installability
- **gh-pages** — deploys `dist/` to the `gh-pages` branch for GitHub Pages hosting

## Live URL

`https://krisravishankar.github.io/go-run/`

## Key Files

| File | Purpose |
|---|---|
| `src/App.tsx` | Main UI — state machine: `idle → running → finished` |
| `src/useLocationTracker.ts` | GPS hook — haversine distance, accuracy filter (< 25m) |
| `src/App.css` | All styles — dark theme, circle buttons, stats layout |
| `src/index.css` | Google Fonts import + global reset |
| `vite.config.ts` | Vite config — base path `/go-run/`, PWA plugin |
| `generate-icons.js` | Pure Node.js PNG icon generator — white "GO" on green circle |

## App States

1. **Idle** — "GO RUN" title + shoe icon + green circle GO button
2. **Running** — distance (km) / elapsed time / pace per km + grey FINISH button
3. **Finished** — summary stats + CLEAR button back to idle

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # production build to dist/
npm run deploy     # build + push to gh-pages branch
```

## Deploy to iPhone

1. `npm run deploy`
2. Open `https://krisravishankar.github.io/go-run/` in Safari
3. Share → Add to Home Screen

## Design Notes

- All button text (GO, FINISH) uses Nunito weight 900 italic
- Circle buttons: 200px diameter; green `#2ECC71` for GO, dark grey for FINISH
- App icon: white pixel-art "GO" bitmap rendered in `generate-icons.js` — no image deps
- GPS accuracy filter discards fixes with `accuracy > 25m` to reduce noise
- Distance computed with haversine formula in `useLocationTracker.ts`
