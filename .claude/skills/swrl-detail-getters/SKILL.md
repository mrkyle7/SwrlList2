---
name: swrl-detail-getters
description: Use when adding a new content source (new Type or new 3rd-party API) or when debugging existing integrations (TMDB, OpenLibrary, iTunes, BoardGameGeek). Covers the DetailGetter / Search / Category / Type wiring.
---

# Detail getters & content sources

A "Swrl" is any item the user might save. Items are grouped into:

- **Category** (`src/constants/Category.js`): `WATCH` (1), `READ` (2), `LISTEN` (3),
  `PLAY` (4), `EAT` (6; 5 is `ALL`)
- **Type** (`src/constants/Type.js`): `FILM`, `TV`, `BOOK`, `ALBUM`, `PODCAST`,
  `BOARDGAME`, `VIDEOGAME`, `RESTAURANT` (8)

There is also `ALL` ("search everything", `/search`): not a list, left out of
`Categories`, whose `AllSearch` (`src/search/allSearch.js`) runs every
category's search and interleaves the results; its filter offers every type.
A new Category's search must be added to `AllSearch` too. It hands results
over as they arrive (`search/progressive.js`, `runProgressively`, tested): the
sources answering within 400 ms of the first make one interleaved batch, and
each later source is added below, so nothing on screen moves.
`views/searchResults.js` shows matches from my own lists first in **every**
search (only that category's in a category search; `model/listMatches.js`),
skips swrls already showing, and keeps them on screen when the sources fail
(e.g. Play while BoardGameGeek is paused).

**Sharing to the app.** The manifest's `share_target` sends shares to `/share`
(`shareRoute` in `src/index.js`). `src/model/share.js` (pure, tested in
`test/share.test.js`) recognises a link (`recogniseLink`, the `SharedLink`
kinds) and `src/search/sharedLink.js` (`resolveSharedLink`) says where it leads:

| Link | Leads to |
| --- | --- |
| IMDb title, TMDB film/TV | the swrl (IMDb ids go through `/api/v1/tmdb/find/{ttId}`) |
| Open Library `/isbn/`, Amazon `/dp/<ISBN-10>` | the book, by ISBN (`item`) |
| Open Library `/works/`, `/books/` | the book, after looking up an ISBN |
| Apple Music album, Apple Podcasts | the album or podcast, by iTunes id (`item`) |
| BoardGameGeek / VideoGameGeek game | the game, by geek id (`item`) |
| OpenStreetMap `/node/`, `/way/`, `/relation/` | the place to eat (`item`, id `n123`) |
| Goodreads, Letterboxd, Steam | a search of Read / Watch / Play for the title in the address (`slugWords`) |
| Spotify album/show/episode/track | a Listen search for the title from `/api/v1/oembed/spotify` (server.js; Spotify's public oEmbed, no key, Spotify URLs only) |

`item` links use each Type's `DetailGetter` and its swrl-id prefix
(`ITEM_TYPES`). Anything else becomes an `ALL` search for the shared words,
without the sharing app's wording ("Check out … on Goodreads"). A manifest can
declare only one share target. To recognise another site, extend
`recogniseLink` and `resolveSharedLink`. How people use this, and the iOS
Shortcut stand-in: `docs/quick-add.md`.

Each **Category** owns a `Search` strategy; each **Type** owns a
`DetailGetter`. The pair drives: user searches → results list → user picks
one → details fetched → saved to Firestore.

## Contracts

### `Search` (`src/search/search.js`)

```js
class Search {
  /**
   * @param {string} query
   * @param {AbortSignal} signal
   * @param {number} id                   // caller-generated request id
   * @return {Promise<{id, results: Swrl[]}>}
   */
  run(query, signal, id) { ... }
}
```

- `results` are **partial** `Swrl`s — just enough for the results list
  (title, image, type, category, `swrlID`). Full details are fetched later
  by the `DetailGetter`.
- The `signal` is an `AbortController.signal` — honour it (pass to `fetch`);
  otherwise rapid typing piles up concurrent requests.
- The `id` is echoed back so stale responses (from earlier keystrokes) can
  be ignored.

### `DetailGetter` (`src/detailGetters/detailGetter.js`)

```js
class DetailGetter {
  /**
   * @param {string} id
   * @param {AbortSignal} signal
   * @param {number} searchId
   * @return {Promise<{id: number, details: Details}>}
   */
  get(id, signal, searchId) { ... }
}
```

One-shot: given a source-specific id (e.g. TMDB film id), return a full
`Details` object.

## `swrlID` convention

`swrlID` is the Firestore doc key (of `swrls/{swrlID}` and of every user's
`swrlers/{uid}/listEntries/{swrlID}`) and must be **deterministic and unique
across types**. The pattern is `<SOURCE>_<source-id>` (built in `src/search/*`):

- `TMDBMOVIE_<tmdbId>`, `TMDBTV_<tmdbId>` - films and TV (TMDB)
- `OPENLIBRARY-ISBN_<isbn>` - books (OpenLibrary)
- `ITUNESALBUM_<collectionId>`, `ITUNESPODCAST_<collectionId>` - iTunes
- `GEEK<type.geekType>_<bggId>` - board games and video games (BGG)
- `OSMPLACE_<n|w|r><osmId>` - places to eat (OpenStreetMap node, way or relation)

When two users save "the same thing", they must produce identical `swrlID`s:
that is how their list entries point at the single shared `swrls` doc (details
and counts).

## Existing integrations

| File | API | Notes |
| --- | --- | --- |
| `detailGetters/tmdbFilmDetailGetter.js` | TMDB + OMDb, via `server.js` `/api/v1/tmdb/*` and `/api/v1/omdb` | Merges ratings and plot from OMDb; works without it. |
| `detailGetters/tmdbTVDetailGetter.js` | TMDB via `/api/v1/tmdb/*` | |
| `detailGetters/openLibraryBookDetailGetter.js` | OpenLibrary | No key. |
| `detailGetters/geekDetailGetter.js` | BoardGameGeek XML API, via `server.js` `/api/v1/geek/*` | Both boardgame and videogame go through this. BGG needs a bearer token, held server-side. **Paused** (`BGG_PAUSED` in `server.js`) until BGG issues our key: the geek routes answer 503 at once without calling BGG, so Play searches fail fast and Search everything shows the other sources with a "Couldn't load board games or video games" toast. Set it to `false` once the key is in `BGG_API_TOKEN`. |
| `detailGetters/itunesAlbumGetter.js` | iTunes Search | No key. |
| `detailGetters/itunesPodcastGetter.js` | iTunes Search | No key. |
| `search/watchSearch.js` | TMDB search via `/api/v1/tmdb/*` | Handles both film + TV, plus `personID:` syntax. |
| `search/readSearch.js` | OpenLibrary | One request: `SEARCH_FIELDS` asks for isbn, author, year, cover and subjects, and `booksFromSearch` builds the cards from them (no lookup per book; the swrl page fetches full details). Must request `isbn` explicitly — search no longer returns ISBNs by default. |
| `search/listenSearch.js` | iTunes | Album + podcast combined. |
| `search/playSearch.js` | BGG via `/api/v1/geek/*` | Boardgame + videogame combined; details fetched in one batched `thing` call. |
| `search/eatSearch.js` | OpenStreetMap's Overpass API via `/api/v1/eat/search` | Restaurants, cafés, takeaways, pubs and bars whose name or cuisine matches, near me or in a town or city (`components/eatWhere.js`: the "Near me / In [London]" row on the Eat search, remembered per device; Search everything uses the same choice; "London" means the Greater London boundary). `model/restaurant.js` (tested) maps elements to Details with a `place` object (kind, area, address, opening hours, phone, website, lat/lon), cuisines as `genres`, links (website, Google Maps, OpenStreetMap). |
| `detailGetters/osmPlaceGetter.js` | `/api/v1/eat/place`, `/api/v1/pageimage` | One element by id. **Photos, best first:** the entry's `image` / `wikimedia_commons`; else the restaurant website's og:image (looked up here, when the page opens, so the page saves it); else a stock photo by cuisine (`stockPhoto`, Unsplash). |

## Adding a new Type

1. **Pick the Category** it belongs to (or propose a new one — bigger change).
2. **Write the DetailGetter** in `src/detailGetters/myThingGetter.js`,
   extending `DetailGetter`. Return a populated `Details` instance.
3. **If the source has a new search endpoint, extend the Category's Search**
   — e.g. adding "audiobooks" to LISTEN means updating `listenSearch.js` to
   merge iTunes albums + iTunes podcasts + your new source via `zip()`.
4. **Register the Type** in `src/constants/Type.js`:
   ```js
   export const MYTHING = new Type(<nextId>, 'MYTHING', 'my thing', null,
     new MyThingGetter());
   ```
5. **Add a `WhereFilter`** in `src/constants/WhereFilter.js` so users can
   filter their list by this type.
6. **Add the filter to the Category** in `src/constants/Category.js`
   (`typeFilters` array).
7. **Add an image** for the type under `www/img/` if you want it in the UI.
8. **Update the tests** in `test/swrl.test.js` to
   include a `fromFirestore` round-trip for the new type.

## Adding a new Category

Rare — the categories map onto a real-world "verb" (Watch/Read/Listen/Play/Eat).
Eat (3.24.0) is the worked example. If you really need one:

1. Write a new `Search` subclass in `src/search/`.
2. Add the `Category` in `src/constants/Category.js`.
3. Extend `Categories` array and `categoryFromId`.
4. Add menu entry + icon in `www/index.html` + CSS.
5. Update `src/views/homePage.js` category buttons (the `.section` tiles in `www/index.html`, with their `.sectionCount` and `.sectionPills`), the desktop sidebar and the phone bottom bar `#phoneNav`.
6. Give it words in `src/model/categoryWords.js` (and the verb in `server.js`'s
   `VERBS` for link previews), a colour that passes with dark text, the route in
   `src/index.js`, `server.js` `appRoutes` and `www/sw.js`, a manifest shortcut,
   `ALL`'s type filters and `AllSearch`, and the home grids' CSS (desktop
   columns; the Cards grid's last tile).

## API-key hygiene

No API key lives in `src/`. Sources that need one (TMDB, OMDb, BGG) are called
through a route in `server.js` that reads the key from an environment
variable; the client calls it with a root-relative URL (`/api/v1/...`). To
add a keyed source:

1. Add a route under `/api/v1/` in `server.js` that validates its parameters
   and builds the upstream URL itself (use `relay()`; never forward an
   arbitrary path).
2. Add the variable name to `secrets` in `terraform/variables.tf` and to the
   "Sync secrets" step in `.github/workflows/deploy.yml`.
3. Document the GitHub secret in `terraform/README.md`.

Keyless sources (Open Library, iTunes) are still called directly from the
client.

## Attribution

TMDB, BoardGameGeek and OpenStreetMap require a visible credit wherever their data is shown
(OpenStreetMap's is in words, "© OpenStreetMap contributors" linked to its copyright page:
an `Attribution` with no logo).
`src/constants/Attribution.js` defines each one (logo, link, any required
wording); a `Type` and a `Category` each take an optional `attribution`, and
`components/attribution.js` renders it at the end of the list, at the end of
the search results, and at the bottom of the Swrl page. It must go *inside*
the view's scrolling container (`appendAttribution(list, ...)`), and only
when there is data to credit: the views are absolutely positioned, so an
element placed beside one is drawn on top of it. A new source with attribution terms needs an `Attribution`
there, passed to its `Type` (and to the `Category` if every type in it uses
that source). Don't recolour or redraw provider logos.

## Common pitfalls

- **Stale responses.** Always honour the `signal`; always return the `id` so
  the caller can discard out-of-order responses.
- **Image URLs expire / change.** Build them from a constant prefix +
  source id; don't store full CDN URLs if the API gives you a path.
- **A getter must reject when the source has no data** — never resolve with
  placeholder details. `swrlFullPage` writes whatever a getter resolves with
  over the saved Swrl in Firestore.
- **BGG returns XML**, not JSON — see `geekDetailGetter.js` for the DOM-parsing
  pattern.
- **iTunes ratings / review counts are not in the search endpoint** — the
  detail getter fetches them separately.
