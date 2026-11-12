---
name: swrl-cordova-build
description: Use when running or debugging Cordova, Cloud Run, Xcode, or Fastlane builds. Covers the local dev server, the browser deploy pipeline, Android release via Fastlane, and known gotchas with the ancient Cordova 8 toolchain.
---

# Cordova / Cloud Run / Fastlane builds

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
`http://localhost:8080` (or `PORT`). `server.js` serves the deep-link prefixes
(`/swrl/*`, `/swrler/*`, `/recommend/*`, `/watch`, `/read`, `/listen`, `/play`,
`/recommendations`, `/savedsearches`) and the third-party API proxies
(`/api/v1/tmdb/*`, `/api/v1/omdb`, `/api/v1/geek/*`), which need
`TMDB_API_KEY`, `OMDB_API_KEY` and `BGG_API_TOKEN` in the environment.

Deep links fall through to `platforms/browser/www/index.html` for client-side routing.

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

## Cloud Run browser deploy

Merging to `master` deploys: `.github/workflows/deploy.yml` applies
`terraform/`, builds the image, copies GitHub secrets into Secret Manager,
deploys and verifies (rolling back on failure). Pull requests get an image
smoke test and a terraform plan. See `terraform/README.md`.

Project `swrl-1118`, region `us-east1`, service `swrl-list`. `swrl-list.com`
is mapped only once `map_domain` is true in `terraform/variables.tf`.

The `Dockerfile` is two stages:

1. **build** — Node 22 + `cordova@8.1.2`, `cordova platform add browser` then
   three `cordova prepare browser` runs. The repeat is a known workaround
   inherited from the Heroku build; leave it. Two things in that stage are
   load-bearing:
   - `NODE_OPTIONS=--openssl-legacy-provider` — webpack 4 on Node 17+.
   - `npm_config_include=dev` — Cordova installs plugins with
     `npm install --production`, which on npm 7+ prunes `babel-loader` and
     friends and leaves you with no `bundle.js`.
2. **runtime** — `node:22-slim` with only `server/package.json` (Express)
   and `platforms/browser/www`.

Node 11 cannot run this build any more: `cordova-universal-links-plugin`
pulls the latest `plist`, which is ESM-only (`Unexpected token export`).

The old `Procfile` / `heroku-postbuild` are still in the repo and are dead;
they go in the migration plan's cleanup phase.

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
  the `Dockerfile` works around it with the triple prepare. Locally, just
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
