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

App id: `com.alden.tangocats`.

## TestFlight without a Mac (Codemagic)
The repo root has `codemagic.yaml` with an "iOS TestFlight" workflow.
1. In App Store Connect, create an app with bundle id `com.alden.tangocats`.
2. In App Store Connect > Users and Access > Integrations, make an API key (App Manager role).
3. In Codemagic, add the repo, then Team settings > Integrations > Developer Portal: add that key and name it exactly `TangoCats ASC`.
4. Start the "iOS TestFlight" workflow. The build lands in TestFlight; install the TestFlight app on your iPhone to play it.
