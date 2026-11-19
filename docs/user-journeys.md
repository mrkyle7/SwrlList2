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
| Home tiles (counts per category) | `views/homePage.js`, `model/listView.js` (`countsByCategory`, `inProgressByCategory`) | desktop shows the counts; phones show the tiles only |
| Home "Swrled to you" strip (desktop) | `views/homePage.js` | |
| Your list: card order and sort | `views/swrlList.js` (`loadSwrls`, `sortListEntries`, `inProgressFirst`) | |
| Your list: card badges and quick buttons, compact and detailed | `components/swrl.js`, `components/buttons.js`, `#swrlButtons` in `www/index.html` | quick Start/Watching button is Your list only |
| Filter sheet and the count on the Filter button | `views/stateController.js` (`showFilters`, `applyFilters`, `_show*Filter`), `constants/Filter.js`, `model/listView.js` (`activeFilterCount`) | Your-list-only filters must not be carried to Discover, Search or a swrler (`withoutYourListOnlyFilters`) |
| "Can't decide? Pick for me" | `components/tonightPicker.js` | tile captions |
| Swrl page: header buttons and toggles (phone and desktop) | `views/swrlFullPage.js`, `#swrlPageButtons` | toggles must line up at 360px with the longest label |
| Search results cards | `views/searchResults.js` → `components/swrl.js` | |
| Discover: list (leaves out what is on my list or done) | `views/swrlList.js` | |
| Swrls inbox (For you) and Sent cards | `views/recommendations.js`, `components/recommendation.js`, `#recommendation` template | |
| Swrl to a friend (recommend screen) | `views/recommend.js` | |
| Labels and private comments on the swrl page | `components/labels.js`, `views/swrlFullPage.js` | |
| Settings (defaults: visibility, list view, page layout) | `views/settings.js` | |

## Friends and other people

| Journey | Where in the code | Notes |
| --- | --- | --- |
| A swrler's page: tabs (Later, In progress, Loved, Done) | `views/swrlerList.js`, `#swrlerTabs` | the query must carry the visibility constraint; tabs must fit on one line at 360px |
| Swrl page: friends card (who has it, grouped) | `views/swrlFullPage.js` (`swrlersCard`, `swrlersCardSections`) | |
| Discover: "Friends' recent activity" captions | `model/activity.js` (`activityCaption`), `components/categoryStrips.js` | |
| Discover: taste matches | `model/taste.js` | |
| Friends screen | `views/friends.js` | |
| Push notifications | `functions/messages.js` | |
| Shared links and their previews | `server.js`, `actions/shareSwrl.js` | |

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
