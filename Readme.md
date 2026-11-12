# Swrl List 2

# What is it?

An app where you can quickly add things to your Swrl List to remember to Watch, Read or Listen to them later.

You can currently add films, books, TV shows, podcasts, video games, boardgames, music albums - all in one place!

Details of the items will be stored in your list automatically to help you remember why you saved it!

Recommend them to your friends - a recommendation from a friend is much more valuable than a rating from strangers! See their response and comments to your recommendations and feel proud that you got them to Watch, Read or Listen to it!

Swrl  - You Should Watch, Read or Listen!

# Development

A web app (installable PWA): plain JavaScript bundled with webpack, Firebase
for data and sign-in, and a small Express server that serves the site and
proxies the third-party APIs that need a key.

You need Node 24.

    npm ci
    npm run build     # www/ + src/ -> dist/
    npm start         # http://localhost:8080
    npm test          # type-check + unit tests

`npm run dev` rebuilds on change. Searches need API keys in the environment
(`TMDB_API_KEY`, `OMDB_API_KEY`, `BGG_API_TOKEN`); see
[terraform/README.md](terraform/README.md#github-secrets).

To run the production image locally:

    docker build -t swrllist2 .
    docker run -p 8080:8080 -e TMDB_API_KEY=... -e OMDB_API_KEY=... -e BGG_API_TOKEN=... swrllist2

# Deploying

Merging to `master` deploys: `.github/workflows/deploy.yml` applies the
terraform in `terraform/`, ships the image to Cloud Run (project `swrl-1118`,
region `us-east1`) and deploys the Cloud Functions in `functions/`. Setup and
the GitHub secrets to set are in [terraform/README.md](terraform/README.md).

# PWA

`www/manifest.webmanifest` + `www/sw.js` (network-first app-shell cache, so
the app opens offline and Firestore's persistence supplies the data). Push
notifications are handled by `src/firebase/messaging-sw.js` (built to
`/firebase-messaging-sw.js`). Bump `CACHE` in
`sw.js` if the shell file list changes.
