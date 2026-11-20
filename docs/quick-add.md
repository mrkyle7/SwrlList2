# Adding a swrl quickly

The ways into Swrl List that get from "a friend mentioned something" to "it is
on my list" in as few taps as possible. Keep this page current when one of
them changes; the code is described in the skills (`swrl-architecture`,
`swrl-detail-getters`, `swrl-build-deploy`).

## In the app

- **Opening is instant after the first visit.** The service worker opens the
  app from its cache, whatever the signal (`swrl-build-deploy`, "Build pieces").
- **One tap to search everything** from any home: the search box on the Cards
  and desktop homes, the search button in the Tiles home's header, Search in the
  bottom bar (Cards) and the sidebar (desktop). The cursor is already in the
  box.
- **Results arrive as each source answers**, with my own matching swrls first.
- **Add from the result**: the add button on every card, with Undo in the toast.

## Android (installed app)

- **Long-press the Swrl List icon** for its shortcuts: Search everything,
  Watch, Read, Listen, Play (the manifest's `shortcuts`). Drag one onto the home
  screen to make it an icon of its own: "Search everything" opens straight into
  the search box.
- **Share from another app** (Chrome, IMDb, Goodreads, Letterboxd, Spotify,
  Apple Music, BoardGameGeek, Steam, Amazon, Netflix, ...) and pick Swrl List.
  Links we know open the swrl's page, ready to add; others search the right
  category for the title, or everything for the shared words.
- `launch_handler` asks Chrome to reuse an open Swrl List window for a
  shortcut or a share instead of starting another one (where Chrome supports
  it).

## iPhone and iPad

Installed web apps on iOS get neither app-icon shortcuts nor the share sheet.
Two stand-ins:

**1. A home-screen bookmark straight into search.** In Safari open
`https://swrl-list.com/search`, then Share → Add to Home Screen and call it
"Swrl search". It opens Search everything.

**2. "Add to Swrl" in the share sheet, with the Shortcuts app.** It opens
`/share` in Safari with what was shared, which then works exactly as the
Android share target does (recognised links open the swrl; anything else is
searched).

1. Open **Shortcuts** → **+** (new shortcut), name it **Add to Swrl**.
2. Tap the **ⓘ** (details) → turn on **Show in Share Sheet**. In "Receive",
   choose **URLs** and **Text** (and **Safari web pages**); "If there's no
   input": **Ask For Text** (so it also works from the home screen).
3. Add the action **URL Encode** (input: *Shortcut Input*).
4. Add the action **Text** with
   `https://swrl-list.com/share?text=` followed by the *URL Encoded Text*
   variable.
5. Add the action **Open URLs** (input: that *Text*).
6. Optional: add it to the home screen from its menu, for a typed quick add.

Now in Safari, IMDb, Goodreads, Spotify, Podcasts or Notes: Share → **Add to
Swrl**. It opens in Safari rather than the installed app (iOS opens links in
Safari); being signed in there too makes it one more tap to add.
