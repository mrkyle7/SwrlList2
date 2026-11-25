---
name: swrl-ux
description: Use for any change people will see in Swrl List, on phones (app) and desktop (website) - a new feature, state, button, screen, sheet, card, wording or restyle. The app's own UX rules - its audience, the journeys a change must reach, the patterns and components to reuse, sizes, colours, wording, feedback - and how to check them in the browser by measuring. Read before designing, and again before saying UI work is done.
---

# Swrl List UX

Swrl List is both an installable app on phones and a website on computers,
and both must feel made for the device: one-handed and thumb-sized on a
phone; a proper desktop site with a sidebar, room to see more at once, hover,
and a keyboard on a computer. Never a phone layout stretched across a big
screen. People come to it to find something to watch tonight, to add a thing
a friend mentioned in five seconds, and to swrl something they loved to a
friend. Ordinary, non-technical people. Every rule below serves those three
moments, on both.

The owner's instructions and `CLAUDE.md` win over this skill. The
`design-taste-frontend` kit is background reading on type, buttons and copy;
where it and this skill differ, this skill is the app's.

## 1. Before designing: the journeys

A change to what a swrl shows (a state, a field, a button) is rarely one
screen. Walk `docs/user-journeys.md` first, mark every row "changes" or "not
affected, because ...", and build every "changes" row in the same PR. Ask, for
the change:

- **Both layouts:** every journey on a phone (360-430px) and on desktop
  (1025px and up), signed in and signed out.
- **Me:** home tiles, Your list (order, card, quick buttons, filter), Pick for
  me, search results, the swrl page (phone and desktop), the Swrls inbox.
- **My friends:** their page's tabs, the swrl page's friends card, Discover's
  friends' activity.
- **Everyone else and signed-out visitors:** what a public page shows, and the
  login prompt a button gives them.
- **Ways out:** undo, the opposite action, what other states it clears (done
  clears in progress).

## 2. Reuse these patterns before inventing one

| Need | Pattern | Where |
| --- | --- | --- |
| A thing in a list (lists, search, Swrls inbox) | One card, built from the `#swrl` template everywhere (the inbox adds who sent it, a "New" pill and a footer of date, Reply, Mark as read, Dismiss): compact (56px poster, icon buttons bottom right) or detailed (92px poster, labelled buttons in an equal grid). The Filter / Compact / Detailed toolbar switches them (on Your list it starts with the Later / Watching / Done switch). On desktop the cards sit in a grid of columns, never one card stretched across the page | `#swrl` template, `components/swrl.js` |
| My note on a card | My latest note under the swrled-by line, same 16px icon column: one grey line in compact, a quiet box with a pink edge (up to 3 lines) in detailed (`.swrlNote`, `showNote`) | `components/swrl.js` |
| Something is in a tab | A small pink dot after the tab's name (Notes); a count badge only when the number matters (Friends) | `components/pageTabs.js` |
| My state on a card | A small pink pill under the title (`.swrlProgress`: "Watching") | `components/buttons.js` |
| An on/off action | A pair of buttons, one shown: off is an outline icon, on is filled or pink (`.swrlLoved`/`.swrlNotLoved`, ...) with "Tap to undo" in its label | `#swrlButtons`, `#swrlPageButtons` |
| Actions on the swrl page | Two big actions (On your list, Swrl to a friend), then an equal grid of toggles that stacks icon over label on phones; pills in the header on desktop | `.pageActions`, `.pageToggles` |
| Choosing filters or options | A bottom sheet on phones, a centred dialog on desktop, with chips, "Clear all" and one filled "Show results"; Esc and a click outside close it | `#filters`, `#pickSheet` |
| Getting around | Phones: header with back arrow, menu on home, tabs; with the Cards home layout also a bottom bar (Home and the five categories, marks where you are; search is the round button above it) on home and the category lists. Desktop: the sidebar (always there, marks where you are), tabs and the toolbar on one line under the title | `components/desktopSidebar.js`, `components/phoneNav.js` |
| The search button (phones and tablets) | A round pink button bottom right on home and the category lists, above the bottom bar when it shows. Settings → "The search button": straight to Search everything (default); a menu of labelled round category buttons stacked above it on a dimmed page; or a swirl (hold, slide to a category on an arc, let go; let go on the button for everything; a tap leaves it open; Enter opens it with the first category focused, Esc closes). Lands on that category's search with the cursor in the box | `components/quickAdd.js`, `model/quickAdd.js` |
| Changing a swrl's genres for myself | On the swrl page, a dashed "Edit genres" ("Edit cuisines" on Eat) chip after the genre chips, once it is on one of my lists; it opens a sheet (dialog on desktop) of removable chips, a text box with suggestions from my own genres in that category, and Save. Stored on my list entry, so it changes my filters and cards only. The filter sheet calls them "Cuisine" on Eat | `components/genreEditor.js`, `model/myGenres.js` |
| Small facts on a coloured tile | White pills with 13px bold dark text (`.sectionPill`): readable on every category colour, purple included | phone Cards home |
| A coloured bar with text | `setHeaderColour(colour)` picks white or dark text and icons by contrast (`model/contrast.js`); never set the header's colour directly | `components/headerColour.js` |
| Something clickable that is not a button | `makeKeyboardClickable(element, role)`: Tab reaches it, Enter and Space use it (cards, tabs) | `components/keyboard.js` |
| Telling people something happened | A toast at the bottom, a few words, the swrl's title in it ("Watching Past Lives"); after a quick action that can be taken back, an **Undo** button in the toast (`showToasterMessage(text, {action: {label, run}})`) | `components/toaster.js` |
| Adding something, fast | Every home and the sidebar have a one-tap way into Search everything with the cursor in the box: the search box on the Cards and desktop homes (`#homeSearch`), the header's search button on the Tiles home (`#headerSearch`), the round search button bottom right on phones, and Search in the desktop sidebar. All call `StateController.openSearchEverything()` | `views/stateController.js` |
| Switching views of one thing | Tabs under the header (Your list / Discover / Search; Later / In progress / Loved / Done) | `.tabs` |
| Which part of my list (inside a tab) | A segmented switch at the start of the list toolbar, not another row of tabs: a grey track with the part on show raised in white ("Later 32 · Watching 1 · Done 12": the middle word from `categoryWords`, each with how many, uncounted by filters). Beside it, under 1280px, Filter and Compact / Detailed keep only their icons (with `title`s), and on phones Compact / Detailed is one button to the view not on show, so it all stays one row at 360px with "Listening" and two-digit numbers | `#listStates`, `showListStates` in `components/listToolbar.js` |
| Nothing to show | A sentence saying what to do next, never just "No results"; when a filter is hiding things, say how many and offer a button that switches it on ("Show 3 on your list") | `#message`, `noSwrlsMessage`, `.inboxEmpty` (`emptyInboxMessage`) |
| Words that depend on the category | One helper, never written out again: `progressWords` (Watching, Start watching), the verbs in `model/activity.js` | `model/progress.js` |

## 3. Rules

**Size and touch**
- Reading text (overviews, messages, comments) 16px; secondary text 13-15px;
  nothing under 13px.
- Every control 44px tall and wide, chips and the toolbar's buttons included;
  8px between neighbouring targets.
- Rows of buttons and tabs line up: same top, same height, icons on one line,
  at 360px with the longest label in any category ("Start listening",
  "Mark as done", "Swrl to a friend").

**Colour** (keep the palette: hot pink, the five category colours, the blue)
- Text and icons that carry meaning reach 4.5:1 (3:1 at 24px, or 19px bold).
- Pink **text** on white, and pink behind white text, is `var(--swrl-pink-strong)`
  (`#d81b4f`, 5:1) or `#b3123f`, never `#FF2E63` (3.6:1). `#FF2E63` is for fills
  with large text (the header), the logo and accents. Muted text is
  `var(--text-muted)`; blue behind small white text is `var(--swrl-blue-strong)`.
- On green, orange, light blue and Eat's teal `#2A9D8F`, text is dark (`#222222`,
  4.8-8:1), as on the home tiles; white text on them fails (2.0-3.3:1). Teal
  text on white is `#1f6f66` (6:1). On Listen's purple
  `#b042f4` neither passes at small sizes (white 4.3:1, dark 3.7:1): only large
  text (24px, or 19px bold) goes on purple; small text sits on white.
- The inbox and sidebar count badges sit on blue `#4990e2`: white text there is
  3.3:1, so use the darker blue `#1769d6` or bold 14px+.
- Never say something with colour alone: a state also has a word or a shape.

**Wording**
- Sentence case. A button is a verb and an object ("Add to your list",
  "Swrl to a friend", never a bare "Swrl").
- The verb fits the category: watch, read, listen to, play, eat at (from
  `model/categoryWords.js`, which owns every category word: "Booked" is Eat's
  "in progress", "ate there", "Where should you eat?").
- Toasts say what happened in under 40 characters and name the swrl.
- Words that work with a finger and a mouse: "Select", "Undo", "Remove", not
  "Tap to ..." in labels people see or hear on desktop.
- Plain words for ordinary people: no "entry", "status", "sync", "item".

**Feedback and safety**
- Every tap answers at once (the button flips before the write finishes) and
  says so in a toast.
- Anything that loses something (Dismiss, Remove friend, Delete account) can
  be undone, or asks first; the opposite action is always one tap away.
- A signed-out visitor who taps an action gets the login sheet saying why
  ("to keep track of what you are watching").

**Phone**
- Design at 390px; check 360 and 430. Thumb reach: the main actions low or
  in the card, sheets from the bottom, one filled main action per view.

**Desktop (1025px and up): a website, not a stretched phone**
- Use the width: the sidebar, cards in a grid of columns, the swrl page in
  two columns. Nothing that people read runs wider than about 75 characters
  (about 720px); forms, settings and single cards keep a sensible width and
  sit in the content column, not edge to edge.
- Every row and grid still lines up, with the longest labels, at the widths
  where columns change (1025, 1280, 1440, 1920).
- Hover: every clickable thing changes on hover (a button steps, a card
  lifts, a link underlines) and the pointer is a hand. Icon-only buttons have
  a tooltip (`title`) saying what they do.
- Keyboard: everything can be reached with Tab in reading order and used with
  Enter or Space; a card opens with Enter; Esc closes sheets, dialogs and
  menus; the focus ring is always visible; a "Skip to content" link comes
  first, before the sidebar.
- Targets: 44px is still the goal (touch laptops and tablets use this
  layout); never under 32px for a control, and no link in a menu or footer
  under 24px tall.
- Dialogs instead of bottom sheets, centred, with the page dimmed behind.

## 4. Checking (measure, then look)

1. Run the app against the emulators (`swrl-testing`, "What does not").
2. On every screen the change touches, at 360, 390, 430, 1280 and 1440, run the
   functions in `audit.js` (in this folder) with `page.evaluate`: `AUDIT`
   reports small text, contrast, tap targets and button styles; `ROWS(selector)`
   checks a row lines up. Scroll and run again on long pages.
3. On desktop, also Tab through the screen: every control reached in order
   with a visible ring, cards open with Enter, Esc closes what is open.
4. Then look at every screenshot yourself, for what no script sees: does it
   read clearly to someone who has never seen the app, is the state obvious,
   is anything cut off, crowded or floating; on desktop, does it use the
   width like a website, or look like a phone screen made wide.
5. Say in the PR which journeys and widths you checked.

## 5. Known gaps (audit of 3.13.0, November 2026; fixed in 3.14.0 where ticked)

What `AUDIT`, a keyboard pass and a look found on 13 screens at 390 and 1280. Fix them when you
work nearby, or as their own change; tick them off here when fixed.

- [x] Category header bars: white title on green/light blue/orange, 2.5-2.7:1.
- [x] Desktop home: the Listen tile's count ("1 on your list", 15px dark on
      purple) is 3.7:1.
- [x] Inbox card actions "Reply", "Dismiss", "Mark as read" are `#FF2E63` text
      (3.6:1), three links of equal weight, and "Reply" is 39px tall. Inbox
      card buttons are 40px wide.
- [x] "Show results", "Pick three for me" / "Shuffle" and other `.sheetApply`
      buttons: white on `#FF2E63`, 3.6:1 at 16px.
- [x] Count badges (inbox, sidebar): white on `#4990e2`, 3.3:1; the sidebar's
      is 12px.
- [x] Grey hints `#808080` (settings option hints, inbox dates, friend search
      hint): 3.95:1.
- [x] "Friends" label on a swrler's page: green text on white, 2.7:1; "Remove"
      friend: blue on white 3.3:1 and 32px tall.
- [x] About page: the pink letters and "verb"/"noun" are `#FF2E63` text.
- [x] Tap targets under 44px: filter and picker chips (40px), the list
      toolbar's Filter / Compact / Detailed (40px), "Add label" (28px),
      the visibility lock (40px), "Delete my account…" (32px), sidebar
      "Privacy" / "Support" (15px) and "See all" on desktop home (19px),
      the phone menu button (24px), search fields (36-39px).
- [x] Two card styles: list cards are flat rows, inbox cards are bordered
      with a pink shadow and a different layout.
- [x] Phone home shows only the four category tiles: no counts, nothing in
      progress and no "Swrled to you", which desktop has. (3.17.0: the Cards
      home layout, the default since 3.23.0, has them; Tiles stays a choice on Settings.)
- [x] Phone header says "Swrl List 2"; the sidebar and everything else say
      "Swrl List".
- [x] Desktop: the Swrls inbox is one card stretched across the page (icons
      and actions at the far edges, the "Everyone" picker about 900px wide);
      it should use the list's grid of cards.
- [x] Desktop: detailed cards in a three-column grid squeeze five labelled
      buttons ("Swrl to a friend" wraps onto three lines); fewer columns or
      header-style pills for detailed view.
- [x] Desktop: Settings options stretch to about 1100px; keep them to the
      reading width. (Measured in 3.14.0: they are about 720px; the screenshot's
      scale misled. Measure, do not judge sizes from a 2x screenshot.)
- [x] Desktop: on the swrl page "Add label" sits alone in a wide empty band
      between the header and the two columns.
- [x] Keyboard: the Your list / Discover / Search tabs (and the swrler and
      inbox tabs) are `<a>` with no href, so Tab skips them; cards cannot be
      opened with the keyboard (only their buttons); Esc does not close the
      filter sheet; no "Skip to content" link (13 sidebar stops first).
- [x] Wording: on/off button labels say "Tap to undo" / "Tap to remove",
      which reads oddly with a mouse or a screen reader on desktop.
- [x] The category verbs are written out in four places
      (`model/share.js`, `model/activity.js`, `components/tonightPicker.js`,
      `model/progress.js`); one helper should own them. (3.24.0:
      `model/categoryWords.js`; only `server.js`, which cannot import it, keeps
      a copy of the verbs.)
