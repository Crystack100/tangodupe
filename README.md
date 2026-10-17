# Tango

A suns-and-moons logic puzzle for phones, inspired by LinkedIn's Tango. Unlimited levels, 1-3 stars per level based on solve time, and a theme store paid for with stars.

- `src/core.js`: puzzle generator, solver and rule checker (plain JavaScript).
- `src/game.html`: the game screen.
- `python3 build.py`: builds `index.html` (installable web app) and refreshes `mobile/www`.
- `mobile/`: Capacitor project for the Android and iOS apps. See `mobile/README.md`.

Every push to `main` builds an Android app file (Actions > Android build > tango-android) and publishes the web app to GitHub Pages.
