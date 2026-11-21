# Purrzle

A cozy cat logic puzzle for phones: fill the grid with sun and moon cats so every row and column balances. Unlimited levels, 1-3 stars per level based on solve time, and a theme store paid for with stars.

- `src/core.js`: puzzle generator, solver and rule checker (plain JavaScript).
- `src/game.html`: the game screen.
- `python3 build.py`: builds `index.html` (installable web app) and refreshes `mobile/www`.
- `crazygames/`: build for the CrazyGames game site (their SDK runs the ads). Zip `crazygames/index.html` and upload it at developer.crazygames.com.
- `mobile/`: Capacitor project for the Android and iOS apps. See `mobile/README.md`.

Every push to `main` builds an Android app file (Actions > Android build > tango-android) and publishes the web app to GitHub Pages.

## Tests and measurements

- `npm test`: puzzle generator, solver, saved-game checks and font coverage (Node 22, no install needed).
- `npm run test:e2e`: plays the built `index.html` in Chromium: keyboard and screen reader support, dialogs, damaged saves, offline start and an axe accessibility audit. Needs `npm ci && npx playwright install chromium` once.
- `npm run perf`: load time, cost of a tap, memory and axe issues on an emulated mid-range phone. Pass a folder holding an older `index.html` to compare builds.
- `src/state.js` checks a save when the game starts, so a damaged save drops only the broken parts.
- The bundled fonts are cut down to the characters the game uses. If you add text with new characters, the tests say so: add them to `src/font-subset.json` and run `python3 tools/subset-fonts.py` (needs `pip install fonttools brotli`).
