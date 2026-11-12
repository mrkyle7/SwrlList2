# Swrl List 2

This app is in very early stage development.

# What is it?

An app where you can quickly add things to your Swrl List to remember to Watch, Read or Listen to them later.

You can currently add films, books, TV shows, podcasts, apps, video games, boardgames, music albums, websites - all in one place!

Details of the items will be stored in your list automatically to help you remember why you saved it!

Recommend them to your friends - a recommendation from a friend is much more valuable than a rating from strangers! See their response and comments to your recommendations and feel proud that you got them to Watch, Read or Listen to it!

Swrl  - You Should Watch, Read or Listen!

# Development details

This app is written and built with [Cordova](https://cordova.apache.org/)

It uses webpack and babel to bundle the javascript files from src/index.js into www/bundle.js. 

To get started, follow the [Android](https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html) and [iOS](https://cordova.apache.org/docs/en/latest/guide/platforms/ios/index.html) guides.

Run the usual `npm install` and `cordova prepare` then (as per the guides above) `cordova emulate android` to run in an Android emulator or use Xcode to run on iOS.

You also need:

- cordova
- node
- typescript
- firebase
- gradle

`openXcode.sh` is a helper script to launch Xcode for this project. 

N.B. When running in iOS, run `cordova prepare ios` to ensure your latest changes are built. 

To run the local browser, run `npm start`

# Testing

tsc --allowJs --noEmit
npx cypress run

# How to publish

## Browser (Google Cloud Run)

The web app is a Docker image (see `Dockerfile`) running on Cloud Run in the
`swrl-1118` project, region `us-east1`, service `swrl-list`.

Merging to `master` deploys it: `.github/workflows/deploy.yml` applies the
terraform in `terraform/`, builds the image and ships it. Setup, the GitHub
secrets to set, and how to switch on `swrl-list.com` are in
[terraform/README.md](terraform/README.md).

To try the image locally (searches need the API keys; see
[terraform/README.md](terraform/README.md#github-secrets)):

    docker build -t swrllist2 .
    docker run -p 8080:8080 -e TMDB_API_KEY=... -e OMDB_API_KEY=... -e BGG_API_TOKEN=... swrllist2

`npm start` reads the same three environment variables.

### PWA

The browser build is installable: `www/manifest.webmanifest` + `www/sw.js`
(network-first app-shell cache, so the app opens offline and Firestore's
persistence supplies the data). Push notifications stay in
`www/firebase-messaging-sw.js`. Bump `CACHE` in `sw.js` if the shell file list
changes.

## iOS and Android

Setup

Note iOS needs a developer account, of which I don't have yet!

Make sure you have the latest version of the Xcode command line tools installed:

```
xcode-select --install
```


Install _fastlane_ using
```
[sudo] gem install fastlane -NV
```
or alternatively using `brew cask install fastlane`

Install _bundler_ using

```
[sudo] gem install bundler
```

Run `bundle install`

### Android

1. Update config.xml with a bumped android-version
2. Create a change log file in ./fastlane/metadata/android/en-GB/changelogs/ using the same version as per config.xml
3. Run `bundle exec fastlane android deploy`

### iOS

TBD

# Credits

    