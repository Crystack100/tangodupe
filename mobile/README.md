# Purrzle mobile app (Capacitor)

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

App id: `com.alden.purrzle`.

## TestFlight without a Mac (Codemagic)
The repo root has `codemagic.yaml` with an "iOS TestFlight" workflow.
1. In App Store Connect, create an app with bundle id `com.alden.purrzle`.
2. In App Store Connect > Users and Access > Integrations, make an API key (App Manager role).
3. In Codemagic, add the repo, then Team settings > Integrations > Developer Portal: add that key and name it exactly `Purrzle ASC`.
4. Start the "iOS TestFlight" workflow. The build lands in TestFlight; install the TestFlight app on your iPhone to play it.

## Android
- Every push to `main` builds a test app (`purrzle.apk`) on GitHub Actions and attaches it to the "latest" release. Open that release on an Android phone and tap the file to install.
- Google Play: the `android-play` workflow in `codemagic.yaml` builds a signed `.aab`.
  1. Create a Google Play developer account (one-time $25).
  2. In Codemagic, Team settings > Code signing identities > Android keystores: generate a keystore and name its reference `purrzle_upload`. Keep it safe; every Play update must be signed with it.
  3. Run the "Android Play Store" workflow and download the `.aab`.
  4. In Play Console, create the app Purrzle (package `com.alden.purrzle`), go to Testing > Internal testing, and upload the `.aab`.
