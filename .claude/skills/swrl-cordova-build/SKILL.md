---
name: swrl-cordova-build
description: Use when running or debugging Cordova, Heroku, Xcode, or Fastlane builds. Covers the local dev server, the browser deploy pipeline, Android release via Fastlane, and known gotchas with the ancient Cordova 8 toolchain.
---

# Cordova / Heroku / Fastlane builds

## Environment expectations

- Node **11.7.0** (per `engines.node`). Newer Node versions break Cordova 8.
  Use `nvm install 11.7.0 && nvm use 11.7.0` locally.
- Cordova **8.1.2** globally: `npm install -g cordova@8.1.2`.
- Ruby + `bundler` for Fastlane (Android/iOS): `bundle install` at repo root.
- Xcode command-line tools for iOS.
- Gradle + Android SDK for Android.

If you see cryptic npm errors ("gyp", "node-sass", or unknown module.exports
syntax), the Node version is almost always the culprit.

## Local browser dev

```bash
npm start
```

This runs `cordova prepare browser && node server.js`. The app is served on
`http://localhost:8000` (or `PORT`). `server.js` wires up two URL prefixes:

- `/swrl/*` → deep-link to a specific swrl
- `/swrler/*` → deep-link to a user profile

Both fall through to `platforms/browser/www/index.html` for client-side routing.

## Local native dev

```bash
# Android
cordova emulate android

# iOS
./openXcode.sh    # opens the generated Xcode project
```

After _any_ source change for native, run `cordova prepare <platform>` to
re-bundle into `platforms/`. The webpack plugin is wired into Cordova's
build hooks.

## Heroku browser deploy

```bash
heroku git:remote -a swrl-list     # one-time
git push heroku master
```

`heroku-postbuild` in `package.json`:

```json
"heroku-postbuild": "npm install -g cordova@8.1.2 && cordova platform add browser && cordova prepare browser && echo prepare1 && cordova prepare browser && echo prepare2 && cordova prepare browser && echo prepare3"
```

**The triple `cordova prepare browser` is deliberate.** The first run doesn't
produce a complete bundle on Heroku's build image; the third one does. Leave
it alone unless you're also debugging the build.

`scripts/afterAddBrowserTabPlugin.js` is a Cordova hook that patches the
`cordova-plugin-browsertab` gradle file — needed because the plugin is
unmaintained.

## Android release via Fastlane

1. Bump `android-versionCode` in `config.xml` (currently at `10062`).
2. Create a changelog file at
   `fastlane/metadata/android/en-GB/changelogs/<versionCode>.txt`.
3. Set the env vars `KEYPASSWORD` and `STOREPASSWORD`.
4. Run:
   ```bash
   bundle exec fastlane android deploy
   ```

The Fastfile expects the keystore at
`/Users/jemky/androidkey-swrl-list.jks` — override if you're on a
different machine.

## iOS release

TBD per the Readme. The Fastfile has an iOS deploy lane that uses `match`
against `git@github.com:mrkyle7/swrl-list-certificates.git`, but it has not
been run end-to-end (owner did not have an Apple developer account when
last attempted).

## `platforms/` and `www/bundle.js` are generated

Never commit changes in those paths. If a build is misbehaving:

1. `./cleanProject.sh` (removes `platforms/`, `plugins/`, `node_modules/`).
2. `npm install`.
3. `cordova prepare browser` (or your target).

## Known gotchas

- `cordova platform add browser` sometimes fails on first run — the
  `heroku-postbuild` works around it with the triple prepare. Locally, just
  re-run the command if it fails.
- The `cordova-universal-links-plugin` is a git dependency
  (`walteram/cordova-universal-links-plugin`). If the git host is
  unreachable, `npm install` fails opaquely.
- `package-lock.json-bkp` exists as a backup from a recovery attempt. Don't
  delete it unless you're sure.
- `scripts/afterAddBrowserTabPlugin.js` uses the removed
  `ctx.requireCordovaModule('q')` API — that's why it only runs on Cordova
  8 and would break on newer Cordova. This is part of why the Cordova
  version is pinned.
