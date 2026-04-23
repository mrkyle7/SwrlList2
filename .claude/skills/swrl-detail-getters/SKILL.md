---
name: swrl-detail-getters
description: Use when adding a new content source (new Type or new 3rd-party API) or when debugging existing integrations (TMDB, OpenLibrary, iTunes, BoardGameGeek). Covers the DetailGetter / Search / Category / Type wiring.
---

# Detail getters & content sources

A "Swrl" is any item the user might save. Items are grouped into:

- **Category** (`src/constants/Category.js`): `WATCH`, `READ`, `LISTEN`, `PLAY`
- **Type** (`src/constants/Type.js`): `FILM`, `TV`, `BOOK`, `ALBUM`, `PODCAST`,
  `BOARDGAME`, `VIDEOGAME`, `APP`, `WEBSITE`, ...

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

`swrlID` is the Firestore doc key and must be **deterministic and unique across
types**. The pattern is `<type-prefix>-<source-id>`:

- `film-<tmdbId>` — films (TMDB)
- `tv-<tmdbId>` — TV shows (TMDB)
- `book-<olid>` — books (OpenLibrary work id)
- `album-<itunesId>`, `podcast-<itunesId>`
- `boardgame-<bggId>`, `videogame-<bggId>`

When two users save "the same thing", they must produce identical `swrlID`s —
that's how the `later`/`done`/`loved` uid arrays end up on a single shared doc.

## Existing integrations

| File | API | Notes |
| --- | --- | --- |
| `detailGetters/tmdbFilmDetailGetter.js` | TMDB + OMDB | Uses hardcoded API keys (client-side). Merges IMDB rating via OMDB. |
| `detailGetters/tmdbTVDetailGetter.js` | TMDB | Same key as film getter. |
| `detailGetters/openLibraryBookDetailGetter.js` | OpenLibrary | No key. |
| `detailGetters/geekDetailGetter.js` | BoardGameGeek XML API | Both boardgame and videogame go through this. |
| `detailGetters/itunesAlbumGetter.js` | iTunes Search | No key. |
| `detailGetters/itunesPodcastGetter.js` | iTunes Search | No key. |
| `search/watchSearch.js` | TMDB multi-search | Handles both film + TV, plus `personID:` syntax. |
| `search/readSearch.js` | OpenLibrary | |
| `search/listenSearch.js` | iTunes | Album + podcast combined. |
| `search/playSearch.js` | BGG | Boardgame + videogame combined. |

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
8. **Update Cypress tests** in `cypress/integration/model/swrl_test.js` to
   include a `fromFirestore` round-trip for the new type.

## Adding a new Category

Rare — the four categories map onto a real-world "verb" (Watch/Read/Listen/Play).
If you really need one:

1. Write a new `Search` subclass in `src/search/`.
2. Add the `Category` in `src/constants/Category.js`.
3. Extend `Categories` array and `categoryFromId`.
4. Add menu entry + icon in `www/index.html` + CSS.
5. Update `src/views/homePage.js` category buttons.

## API-key hygiene

Several getters contain API keys committed to the repo (TMDB, OMDB). These are
client-side keys and were checked in deliberately, but **do not copy them to
other files, docs, or logs**. If you're adding a service that requires a
_secret_ key, route it through a Cloud Function instead of embedding it.

## Common pitfalls

- **Stale responses.** Always honour the `signal`; always return the `id` so
  the caller can discard out-of-order responses.
- **Image URLs expire / change.** Build them from a constant prefix +
  source id; don't store full CDN URLs if the API gives you a path.
- **BGG returns XML**, not JSON — see `geekDetailGetter.js` for the DOM-parsing
  pattern.
- **iTunes ratings / review counts are not in the search endpoint** — the
  detail getter fetches them separately.
