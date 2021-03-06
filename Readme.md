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

## Browser

Setup

1. Install the Heroku cli tool: [Guide](https://devcenter.heroku.com/articles/heroku-cli)
2. Login to Heroku: `heroku login`
3. Set up the git remote to Heroku: `heroku git:remote -a swrl-list`

Push

Simply run `git push heroku master`

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

    