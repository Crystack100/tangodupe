# Tango mobile app (Capacitor)

This wraps the web game (`www/`) as native iOS and Android apps.
Run `python3 ../build.py` after changing the game to refresh `www/`.

## Run it on a phone
1. Install Node.js, then run `npm install` in this folder.
2. Run `npx cap sync`.
3. Android: install Android Studio, run `npx cap open android`, then press Run with your phone plugged in.
4. iOS (needs a Mac with Xcode): run `npx cap open ios`, then press Run.

## Publish to the stores
- Google Play: a Google Play developer account (one-time $25). Build a signed bundle in Android Studio (Build > Generate Signed Bundle).
- App Store: an Apple Developer account ($99/year) and a Mac with Xcode (Product > Archive, then upload).

App id: `com.alden.tango` (change it in `capacitor.config.json` before the first store upload).
