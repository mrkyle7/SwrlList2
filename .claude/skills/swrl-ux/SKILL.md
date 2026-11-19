---
name: swrl-ux
description: Use for any change people will see in Swrl List - a new feature, state, button, screen, sheet, card, wording or restyle. The app's own UX rules - its audience, the journeys a change must reach, the patterns and components to reuse, sizes, colours, wording, feedback - and how to check them in the browser by measuring. Read before designing, and again before saying UI work is done.
---

# Swrl List UX

Swrl List is an app, not a website: people come back to it to find something
to watch tonight, to add a thing a friend mentioned in five seconds, and to
swrl something they loved to a friend. Ordinary, non-technical people, mostly
on phones, often one-handed. Every rule below serves those three moments.

The owner's instructions and `CLAUDE.md` win over this skill. The
`design-taste-frontend` kit is background reading on type, buttons and copy;
where it and this skill differ, this skill is the app's.

## 1. Before designing: the journeys

A change to what a swrl shows (a state, a field, a button) is rarely one
screen. Walk `docs/user-journeys.md` first, mark every row "changes" or "not
affected, because ...", and build every "changes" row in the same PR. Ask, for
the change:

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
| A thing in a list | One card: compact (56px poster, icon buttons bottom right) or detailed (92px poster, labelled buttons in an equal grid). The Filter / Compact / Detailed toolbar switches them | `#swrl` template, `components/swrl.js` |
| My state on a card | A small pink pill under the title (`.swrlProgress`: "Watching") | `components/buttons.js` |
| An on/off action | A pair of buttons, one shown: off is an outline icon, on is filled or pink (`.swrlLoved`/`.swrlNotLoved`, ...) with "Tap to undo" in its label | `#swrlButtons`, `#swrlPageButtons` |
| Actions on the swrl page | Two big actions (On your list, Swrl to a friend), then an equal grid of toggles that stacks icon over label on phones; pills in the header on desktop | `.pageActions`, `.pageToggles` |
| Choosing filters or options | A bottom sheet (a dialog on desktop) with chips, "Clear all" and one filled "Show results" | `#filters`, `#pickSheet` |
| Telling people something happened | A toast at the bottom, a few words, the swrl's title in it ("Watching Past Lives") | `components/toaster.js` |
| Switching views of one thing | Tabs under the header (Your list / Discover / Search; Later / In progress / Loved / Done) | `.tabs` |
| Nothing to show | A sentence saying what to do next, never just "No results" | `#message`, `noSwrlsMessage` |
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

**Colour** (keep the palette: hot pink, the four category colours, the blue)
- Text and icons that carry meaning reach 4.5:1 (3:1 at 24px, or 19px bold).
- Pink **text** on white is `#b3123f` or `#d81b4f`, never `#FF2E63` (3.6:1).
  `#FF2E63` is for fills with large text, the logo and accents.
- On green, orange and light blue, text is dark (`#222222`, 6-8:1), as on the
  home tiles; white text on them fails (2.0-2.7:1). On Listen's purple
  `#b042f4` neither passes at small sizes (white 4.3:1, dark 3.7:1): only large
  text (24px, or 19px bold) goes on purple; small text sits on white.
- The inbox and sidebar count badges sit on blue `#4990e2`: white text there is
  3.3:1, so use the darker blue `#1769d6` or bold 14px+.
- Never say something with colour alone: a state also has a word or a shape.

**Wording**
- Sentence case. A button is a verb and an object ("Add to your list",
  "Swrl to a friend", never a bare "Swrl").
- The verb fits the category: watch, read, listen to, play (from the helper).
- Toasts say what happened in under 40 characters and name the swrl.
- Plain words for ordinary people: no "entry", "status", "sync", "item".

**Feedback and safety**
- Every tap answers at once (the button flips before the write finishes) and
  says so in a toast.
- Anything that loses something (Dismiss, Remove friend, Delete account) can
  be undone, or asks first; the opposite action is always one tap away.
- A signed-out visitor who taps an action gets the login sheet saying why
  ("to keep track of what you are watching").

**Phone and desktop**
- Design at 390px first; check 360 and 430. Desktop (1025px+) has the sidebar,
  a wider grid of cards and the swrl page in two columns; check 1280.
- One filled main action per view.

## 4. Checking (measure, then look)

1. Run the app against the emulators (`swrl-testing`, "What does not").
2. On every screen the change touches, at 360, 390, 430 and 1280, run the
   functions in `audit.js` (in this folder) with `page.evaluate`: `AUDIT`
   reports small text, contrast, tap targets and button styles; `ROWS(selector)`
   checks a row lines up. Scroll and run again on long pages.
3. Then look at every screenshot yourself, for what no script sees: does it
   read clearly to someone who has never seen the app, is the state obvious,
   is anything cut off, crowded or floating.
4. Say in the PR which journeys and widths you checked.

## 5. Known gaps (audit of 3.13.0, November 2026)

What `AUDIT` and a look found on 13 screens at 390 and 1280. Fix them when you
work nearby, or as their own change; tick them off here when fixed.

- [ ] Category header bars: white title on green/light blue/orange, 2.5-2.7:1.
- [ ] Desktop home: the Listen tile's count ("1 on your list", 15px dark on
      purple) is 3.7:1.
- [ ] Inbox card actions "Reply", "Dismiss", "Mark as read" are `#FF2E63` text
      (3.6:1), three links of equal weight, and "Reply" is 39px tall. Inbox
      card buttons are 40px wide.
- [ ] "Show results", "Pick three for me" / "Shuffle" and other `.sheetApply`
      buttons: white on `#FF2E63`, 3.6:1 at 16px.
- [ ] Count badges (inbox, sidebar): white on `#4990e2`, 3.3:1; the sidebar's
      is 12px.
- [ ] Grey hints `#808080` (settings option hints, inbox dates, friend search
      hint): 3.95:1.
- [ ] "Friends" label on a swrler's page: green text on white, 2.7:1; "Remove"
      friend: blue on white 3.3:1 and 32px tall.
- [ ] About page: the pink letters and "verb"/"noun" are `#FF2E63` text.
- [ ] Tap targets under 44px: filter and picker chips (40px), the list
      toolbar's Filter / Compact / Detailed (40px), "Add label" (28px),
      the visibility lock (40px), "Delete my account…" (32px), sidebar
      "Privacy" / "Support" (15px) and "See all" on desktop home (19px),
      the phone menu button (24px), search fields (36-39px).
- [ ] Two card styles: list cards are flat rows, inbox cards are bordered
      with a pink shadow and a different layout.
- [ ] Phone home shows only the four category tiles: no counts, nothing in
      progress and no "Swrled to you", which desktop has.
- [ ] Phone header says "Swrl List 2"; the sidebar and everything else say
      "Swrl List".
- [ ] The category verbs are written out in four places
      (`model/share.js`, `model/activity.js`, `components/tonightPicker.js`,
      `model/progress.js`); one helper should own them.
