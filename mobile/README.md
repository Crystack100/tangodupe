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

## Ads (Google AdMob)
- Full-screen ad after every win from the third win on, plus optional reward videos (+3 bonus stars, free stars in the shop). Players with Purrzle Plus or Remove ads see no full-screen ads. Every 6th ad is followed by the Plus offer.
- On launch the app shows Google's consent form where the law needs it (Europe, UK), then Apple's "Allow tracking?" prompt on iPhone, then starts ads.
- Test builds (the GitHub APK, simulator) always show Google's test ads; store builds (Play bundle, TestFlight) show real ads. Never tap real ads on your own phone. The IDs live in three places:
  1. `src/game.html`: `AD_UNITS` (interstitial and rewarded ad unit IDs for Android and iOS), then run `python3 build.py`.
  2. `android/app/src/main/res/values/strings.xml`: `admob_app_id` (Android app ID, has a `~`).
  3. `ios/App/App/Info.plist`: `GADApplicationIdentifier` (iOS app ID, has a `~`).
- Privacy policy: `privacy.html` at the repo root, published with the web app.

## Purchases: Purrzle Plus and Remove ads (RevenueCat)
The app sells a subscription, Purrzle Plus (no ads + every theme), in weekly, monthly and yearly plans, and a one-time Remove ads purchase. RevenueCat checks receipts and renewals (free until $2,500 a month in revenue). Until its API keys are in `src/game.html`, no purchase buttons show.

Suggested prices: Plus $2.99/week, $5.99/month, $29.99/year; Remove ads $3.99.

1. **App Store Connect** (Purrzle app > Monetization):
   - Sign the Paid Apps agreement and add bank and tax details (Business section).
   - Subscriptions: create a group "Purrzle Plus" with three auto-renewable subscriptions: `purrzle_plus_weekly`, `purrzle_plus_monthly`, `purrzle_plus_yearly`. Give each a price, a display name and a review screenshot (the Plus screen).
   - In-App Purchases: create a non-consumable `purrzle_remove_ads`.
   - Add the standard Apple Terms of Use (EULA) link to the app description, as Apple requires for subscriptions.
2. **Google Play Console** (Purrzle > Monetize with Play):
   - Set up a payments profile.
   - Subscriptions: create `purrzle_plus` with three base plans: `weekly`, `monthly`, `yearly` (auto-renewing).
   - In-app products: create `purrzle_remove_ads`.
   - Google Play only lists products after an app build that includes billing has been uploaded (Internal testing is enough).
3. **RevenueCat** (app.revenuecat.com):
   - Create a project with an App Store app (bundle id `com.alden.purrzle`, plus an App Store Connect in-app purchase key) and a Play Store app (package `com.alden.purrzle`, plus a Google service account JSON). RevenueCat walks you through both.
   - Products: import the products above.
   - Entitlements: `plus` (attach the three Plus subscriptions) and `no_ads` (attach only Remove ads; Plus already removes ads).
   - Offerings: make the default (current) offering with packages Weekly, Monthly, Annual (the Plus subscriptions) and a custom package with identifier `remove_ads`.
   - API keys: copy the public iOS key (`appl_...`) and Android key (`goog_...`) into `RC_KEYS` in `src/game.html`, then run `python3 build.py` and `npx cap sync`.
4. Test with a Sandbox account (iOS, TestFlight) and a license tester (Play Console > Settings > License testing). Test purchases are free.
