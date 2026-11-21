# Purrzle

A cozy cat logic puzzle for phones: fill the grid with sun and moon cats so every row and column balances. Unlimited levels, 1-3 stars per level based on solve time, and a theme store paid for with stars.

Reasons to come back, all counted on the device with no account: a gift of bonus stars every 10 levels (bigger at 50 and 100), 25 badges that pay out stars, a Trophies screen (badges, lifetime stats, every level's best), a golden shimmer when a row or column is finished, phone vibration (Settings > Vibration), and a morning reminder that says how close the next gift is.

- `src/core.js`: puzzle generator, solver and rule checker (plain JavaScript).
- `src/game.html`: the game screen.
- `python3 build.py`: builds `index.html` (installable web app) and refreshes `mobile/www`.
- `crazygames/`: build for the CrazyGames game site (their SDK runs the ads). Zip `crazygames/index.html` and upload it at developer.crazygames.com.
- `mobile/`: Capacitor project for the Android and iOS apps. See `mobile/README.md`.

Every push to `main` builds an Android app file (Actions > Android build > tango-android) and publishes the web app to GitHub Pages.
