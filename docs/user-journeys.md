# User journeys: where a change has to show up

Swrl List shows the same few facts (what is on my list, what I have started,
done or loved, what friends swrled me, what friends are into) on many screens.
A change to any of them is not finished until every journey below that shows
it has been updated and checked. **Before coding, go down this list, mark each
row "changes" or "not affected, because ...", and put that list in the PR.**

How to design and check each one: the `swrl-ux` skill.

Phone widths to check: 360, 390, 430. Desktop: 1280 (from 1025px the sidebar
layout applies). Check signed in, signed out (anonymous) and as a friend.

## My own swrls

| Journey | Where in the code | Notes |
| --- | --- | --- |
| Home tiles (counts per category; five with Eat) | `views/homePage.js`, `model/listView.js` (`countsByCategory`, `inProgressByCategory`), `model/homeLayout.js` (`homeTileCounts`) | desktop shows the counts on the tile; phones with the Cards home layout (the default) show them as pills; phones with Tiles show the tiles only |
| Home "Swrled to you" strip (desktop, and phones with Cards) | `views/homePage.js` | |
| Phone bottom bar (Cards home layout) | `components/phoneNav.js`, `StateController._switchCategory` | home and the category lists only; keeps the tab when switching category; no Search item (the round search button does that) |
| Quick ways into search (home search box, Tiles header button, the round search button, sidebar Search) | `StateController.openSearchEverything`, `#homeSearch`, `#headerSearch` | the cursor lands in the box |
| The search button (bottom right, phones; menu or swirl per Settings) | `components/quickAdd.js`, `model/quickAdd.js`, `StateController.openCategorySearch` | home and lists only; the toast and list ends sit above it |
| "Added … to your list" toast with Undo | `components/buttons.js`, `components/toaster.js` | no Undo when adding cleared done |
| Your list: card order and sort | `views/swrlList.js` (`loadSwrls`, `sortListEntries`, `inProgressFirst`) | |
| Your list: Later / Watching / Done switch | `model/listStates.js`, `showListStates` in `components/listToolbar.js`, `views/swrlList.js` | first in the list toolbar, signed in only, with how many in each (`listStateCounts`, not changed by filters); Later is everything on the list (started first), Watching only the started, Done what I have done; kept when switching category, tab or filters; Pick for me only on Later; each part has its own empty message |
| Your list: card badges, my latest note, and quick buttons, compact and detailed | `components/swrl.js`, `components/buttons.js`, `#swrlButtons` in `www/index.html` | quick Start/Watching button is Your list only; the note line shows on every card of a swrl I have on a list (also inbox, search, a friend's page) |
| My own genres / cuisines (Edit genres on the swrl page; Cuisine in Eat's filter) | `components/genreEditor.js`, `model/myGenres.js`, `firebase/genres.js` (`genresFor` applies them), `components/swrl.js` (card chips) | only for swrls on my lists; never changes the shared swrl |
| Filter sheet and the count on the Filter button | `views/stateController.js` (`showFilters`, `applyFilters`, `_show*Filter`), `constants/Filter.js`, `model/listView.js` (`activeFilterCount`) | "In progress" left the sheet for Your list's switch; a filter that only means something on Your list must not be carried to Discover, Search or a swrler |
| "Can't decide? Pick for me" | `components/tonightPicker.js` | tile captions |
| Swrl page: header buttons and toggles (phone and desktop) | `views/swrlFullPage.js`, `#swrlPageButtons` | toggles must line up at 360px with the longest label |
| Eat search: "Near me / In [town]" | `components/eatWhere.js`, `search/eatSearch.js` | only on the Eat search; changing it searches again |
| Search results cards | `views/searchResults.js` → `components/swrl.js` | every search shows my own matching swrls first (that category's only), even when the sources fail; Search everything then adds each source as it answers |
| Discover: list (leaves out what is on my list or done) | `views/swrlList.js` | |
| Swrls inbox (For you) and Sent cards | `views/recommendations.js`, `components/recommendation.js` (list cards from the `#swrl` template) | same card as the lists: a change to list cards reaches the inbox too; an empty For you says how many the Done / On my list filters hide, with buttons that tick them (`hiddenByInboxFilters`, `emptyInboxMessage` in `model/recommendation.js`) |
| Swrl to a friend (recommend screen) | `views/recommend.js` | |
| Labels, and notes (the Notes tab; stored as private comments) on the swrl page | `components/labels.js`, `components/privateComments.js`, `views/swrlFullPage.js` | |
| Settings (defaults: visibility, list view, page layout, phone home layout) | `views/settings.js` | |
| Keyboard on desktop (Tab order, Enter on cards and tabs, Esc, skip link) | `components/keyboard.js`, `views/stateController.js` | |
| An open or installed app getting the new build | `components/updateCheck.js`, `dist/version.json` | quietly at next start; asks first only after a release with `updateNotice` |
| Opening the app offline or on a slow connection | `firebase/bootCache.js`, `firebase/cacheFirst.js`, `www/sw.js` | the first screen from what the device has, then live data in place |
| A swrl's cover full screen | `components/imageViewer.js`, `views/swrlFullPage.js` | |

## Friends and other people

| Journey | Where in the code | Notes |
| --- | --- | --- |
| A swrler's page: tabs (Later, In progress, Loved, Done) | `views/swrlerList.js`, `#swrlerTabs` | the query must carry the visibility constraint; tabs must fit on one line at 360px |
| Swrl page: friends card (who has it, grouped) | `views/swrlFullPage.js` (`swrlersCard`, `swrlersCardSections`) | |
| Discover: "Friends' recent activity" captions (and the strips' 12px inset, `scroll-padding-inline`) | `model/activity.js` (`activityCaption`), `components/categoryStrips.js` | |
| Discover: taste matches | `model/taste.js` | |
| Friends screen | `views/friends.js` | |
| Push notifications (and where a tap lands) | `functions/messages.js`, `src/firebase/messaging-sw.js` (loaded by `www/sw.js`), `src/firebase/messaging.js` | a tap opens the installed app at the link's path |
| Shared links and their previews | `server.js`, `actions/shareSwrl.js` | |
| Sharing from another app into Swrl List | `model/share.js`, `search/sharedLink.js`, `shareRoute` in `index.js` | which links open a swrl and which search: `swrl-detail-getters` |

## Data and back end

| Journey | Where | Notes |
| --- | --- | --- |
| Entry shape and writes | `model/listEntry.js`, `model/listEntryWrite.js`, `actions/*` | other actions may need to clear or set the new field (done clears in progress) |
| Rules | `firestore.rules`, `test-rules/` | applied by hand: say so in the PR |
| Counts and other functions | `functions/` | |
| Account deletion, migration | `functions/deleteUserData.js`, `scripts/` | |
| Docs | `CLAUDE.md`, `.claude/skills/*`, `docs/*` | |

## Worked example: "in progress" (3.12.0–3.13.0)

3.12.0 covered the swrl page, the Your list badge and order, the friends card
and the activity caption. It missed the swrler page tab, a quick button on Your
list, a filter, the inbox badge, the home counts and the picker, which 3.13.0
added. Walking this table first would have caught all six.
