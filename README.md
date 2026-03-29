# GoRun

A GPS running tracker as a Progressive Web App (PWA). No App Store, no Xcode needed — install directly on your iPhone from Safari.

## Install on iPhone

1. Open **https://krisravishankar.github.io/go-run/** in Safari
2. Tap the **Share** button (square with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add** — GoRun appears on your homescreen
5. Open it → tap **GO** → allow location access → start running

## How it works

| State | What you see |
|-------|-------------|
| Idle | Green circle **GO** button |
| Running | Distance (km) · Time · Pace per km + grey **FINISH** button |
| Finished | Summary stats + **CLEAR** button to reset |

## Tech

- React + TypeScript + Vite
- Google Fonts (Nunito) via CSS
- Browser Geolocation API (GPS)
- PWA manifest + service worker for offline / homescreen install
- Deployed to GitHub Pages

## Local development

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

Builds and pushes to the `gh-pages` branch. GitHub Pages serves it automatically.
