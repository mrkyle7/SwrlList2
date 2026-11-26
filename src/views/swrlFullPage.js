import { swrlKind } from '../constants/Type';
import { myGenres } from '../model/myGenres';
import { canEditGenres, genreWords, openGenreEditor } from '../components/genreEditor';
import { showPrivateComments, hidePrivateComments } from '../components/privateComments';
import { showLabels, hideLabels } from '../components/labels';
import shareSwrl from '../actions/shareSwrl';
import { showAttribution, hideAttribution } from '../components/attribution';
import { showSwrlVisibility, hideSwrlVisibility } from '../components/swrlVisibility';
import { doc, setDoc } from 'firebase/firestore';
import { getDocFast } from '../firebase/cacheFirst';
import { UIView } from './UIView';
import { StateController } from './stateController';
import { State } from '../model/state';
import { getSwrler } from '../firebase/swrler';
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';
import { recommendationsSentCache, inboxRecommendationsFor } from '../listeners/recommendations';
import { addListEntriesChangeListener, getListEntry, getPageLayout, whenListEntriesReady } from '../listeners/listEntries';
import { getEntriesForSwrl } from '../firebase/swrlEntries';
import { Recommendation } from '../model/recommendation';
import { Swrl } from '../model/swrl';
import { TABS, activeTab, artShape, capitalise, metaLine, splitGenres, tabsToShow } from '../model/swrlPage';
import { addAddButton, addLoveButton, addRecommendButton, addDoneButton, addProgressButton } from '../components/buttons';
import { progressWords } from '../model/progress';
import { drawTabs, markActiveTab } from '../components/pageTabs';
import { makeImageZoomable } from '../components/imageViewer';
import { largeImage } from '../model/imageSize';
import {
    avatar, buildCast, buildLinks, buildRatings, buildStory, element, pageBlock
} from '../components/swrlPageSections';
import { FULL_PAGE } from '../constants/View';
import { WATCH } from '../constants/Category';

const swrlFullPageView = document.getElementById('swrlFullPage');

const pageButtons = swrlFullPageView.querySelector('.pageButtons');
/** @type {HTMLTemplateElement} */
// @ts-ignore
const swrlButtonsTemplate = document.getElementById('swrlPageButtons');
const hero = document.getElementById('swrlImageContainer');
const heroType = document.getElementById('swrlHeroType');
const heroTitle = document.getElementById('swrlHeroTitle');
const heroMeta = document.getElementById('swrlHeroMeta');
const heroGenres = document.getElementById('swrlHeroGenres');
const heroTagline = document.getElementById('swrlHeroTagline');
const loadingbar = document.querySelector('#swrlImageContainer .loadingbar');
const tabBar = document.getElementById('swrlFullPageTabs');
const detailsContainer = document.getElementById('swrlFullPageCards');
const castContainer = document.getElementById('pageSection-cast');
const linksContainer = document.getElementById('pageSection-links');
const friendsContainer = document.getElementById('pageSection-friends');
const ratingsContainer = document.getElementById('swrlFullPageRatings');
const notesContainer = document.getElementById('swrlFullPagePrivateComments');
const overviewSection = document.getElementById('pageSection-overview');
const notesSection = document.getElementById('pageSection-notes');
const sectionsContainer = document.getElementById('swrlFullPageSections');
const desktopMain = document.getElementById('swrlDesktopMain');
const desktopAside = document.getElementById('swrlDesktopAside');
const labelsContainer = document.getElementById('swrlFullPageLabels');
const heroRow = hero.querySelector('.pageHeroRow');
const heroText = hero.querySelector('.pageHeroText');
const buttonsContainer = swrlFullPageView.querySelector('.pageButtonsContainer');

/** The desktop layout starts here (www/css/index.css uses the same width). */
const desktopQuery = window.matchMedia('(min-width: 1025px)');
desktopQuery.addEventListener('change', () => {
    if (!swrlFullPageView.classList.contains('hidden')) applyLayout();
});

/** The page's sections, by the id of the tab that shows each. */
const sectionIds = ['friends', 'overview', 'cast', 'links', 'notes'];

/** @type {AbortController} */
let detailController = undefined;
let searchId = undefined;
/** Changes whenever the page is shown or closed, so a late result is not added to the wrong page. */
let socialCardsToken = undefined;
/** The tab open in the tab layout. */
let openTab = 'overview';
/** People who have swrled this to me, shown on the Friends tab. */
let friendsBadge = 0;
/** How many notes I have on this swrl: the Notes tab gets a dot when there are any. */
let notesCount = 0;
/** Whether the header shows every genre, after "+N more". */
let allGenresShown = false;

export class SwrlFullPage extends UIView {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.swrlScreen);
    }

    show() {
        showSwrlFullPage(this.stateController);
    }

    destroy() {
        destroySwrlFullPage();
    }
}

/** @type {HTMLImageElement} */
// @ts-ignore
const swrlImageLarge = document.getElementById('swrlImageLarge');
// tap the cover to see it full screen
makeImageZoomable(/** @type {HTMLImageElement} */ (swrlImageLarge));
// square art (albums, podcasts) is sized and lined up differently from tall posters
swrlImageLarge.addEventListener('load', () => {
    hero.dataset.shape = artShape(swrlImageLarge.naturalWidth, swrlImageLarge.naturalHeight);
});
swrlImageLarge.addEventListener('error', () => {
    console.error('could not load image');
    if (!swrlImageLarge.src.endsWith('img/NoPoster.jpg')) {
        swrlImageLarge.src = 'img/NoPoster.jpg';
    }
});

/**
 * @param {StateController} stateController
 */
async function showSwrlFullPage(stateController) {
    swrlFullPageView.classList.remove('hidden');
    socialCardsToken = Math.random();
    openTab = 'overview';
    friendsBadge = 0;
    notesCount = 0;
    allGenresShown = false;
    const swrl = stateController.currentState.swrl;
    const firestore = stateController.firestore;
    swrlFirestore = firestore;
    showAttribution('swrlAttribution', swrl.type.attribution);
    showLabels(swrl, firestore);
    showPrivateComments(swrl, firestore, count => {
        const changed = (count > 0) !== (notesCount > 0);
        notesCount = count;
        if (changed) applyLayout();
    });
    showSwrlVisibility(swrl, firestore);
    showShareBanner(stateController);

    renderHero(swrl);

    const buttons = swrlButtonsTemplate.content.cloneNode(true);

    pageButtons.appendChild(buttons);
    pageButtons.querySelector('.swrlShare').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        shareSwrl(swrl, '', firestore);
    });

    pageButtons.querySelector('.swrlButtonSpinner').classList.remove('hidden');

    let swrlExists = false;
    // The page may be left (or shown again for another swrl) before the
    // lookups below answer; a late answer must not touch the page then.
    const thisVisit = socialCardsToken;

    // my own entries must have loaded, or the buttons would all say "not on my list"
    Promise.all([getDocFast(doc(firestore, Collection.SWRLS, swrl.swrlID)), whenListEntriesReady()])
        .then(([docSnapshot]) => {
            if (socialCardsToken !== thisVisit) return;
            let currentSwrl = swrl;
            if (docSnapshot.exists()) {
                try {
                    const data = docSnapshot.data();
                    currentSwrl = Swrl.fromFirestore(data);
                    swrlExists = true;
                } catch (err) {
                    console.error('Could not get data for swrl');
                    console.error(err);
                }
            }

            pageButtons.querySelector('.swrlButtonSpinner').classList.add('hidden');

            addAddButton(FULL_PAGE, swrlFullPageView, currentSwrl, firestore, null, null);
            addLoveButton(FULL_PAGE, currentSwrl, swrlFullPageView, firestore, null);
            addRecommendButton(swrlFullPageView, currentSwrl, stateController);
            addDoneButton(swrlFullPageView, currentSwrl, firestore, null, FULL_PAGE);
            addProgressButton(swrlFullPageView, currentSwrl, firestore);

            // my layout is read with my entries, so it may only be known now
            applyLayout();
            renderFriends(currentSwrl, firestore, stateController);
            updateDetails(swrl, swrlExists, firestore, stateController);

        })
        .catch(err => {
            console.error('Could not get data for swrl');
            console.error(err);
            if (socialCardsToken !== thisVisit) return;

            pageButtons.querySelector('.swrlButtonSpinner').classList.add('hidden');

            addAddButton(FULL_PAGE, swrlFullPageView, swrl, firestore, null, null);
            addLoveButton(FULL_PAGE, swrl, swrlFullPageView, firestore, null);
            addRecommendButton(swrlFullPageView, swrl, stateController);
            addDoneButton(swrlFullPageView, swrl, firestore, null, FULL_PAGE);
            addProgressButton(swrlFullPageView, swrl, firestore);
            renderFriends(swrl, firestore, stateController);
            updateDetails(swrl, swrlExists, firestore, stateController);
        })

    renderDetailSections(swrl, stateController);
}

/**
 * The header: poster, kind, title, who and when, genres and tagline, on a
 * band in the colour of the swrl's category.
 *
 * @param {Swrl} swrl
 */
function renderHero(swrl) {
    const details = swrl.details;
    hero.dataset.category = swrl.category ? swrl.category.name : '';
    swrlImageLarge.src = details.imageUrl;
    swrlImageLarge.alt = `Cover of ${details.title}`;
    // only a real cover opens full screen
    const zoomable = Boolean(largeImage(details.imageUrl));
    swrlImageLarge.classList.toggle('zoomable', zoomable);
    swrlImageLarge.tabIndex = zoomable ? 0 : -1;
    swrlImageLarge.title = zoomable ? 'See the cover full size' : '';
    heroType.textContent = swrlKind(swrl.type, details);
    heroTitle.textContent = details.title;
    heroMeta.textContent = metaLine(details);
    heroMeta.classList.toggle('hidden', !heroMeta.textContent);
    heroSwrl = swrl;
    drawHeroGenres(myGenres(details.genres, getListEntry(swrl.swrlID)));
    heroTagline.textContent = details.tagline ? `“${details.tagline.replace(/^["“]|["”]$/g, '')}”` : '';
    heroTagline.classList.toggle('hidden', !details.tagline);
}

/**
 * The genre chips in the header: the first few, then "+N more", which shows
 * the rest in place (and "Show fewer" folds them away again).
 *
 * @param {string[]} genres
 */
function drawHeroGenres(genres) {
    const { shown, hidden } = splitGenres(genres, allGenresShown);
    const editable = heroSwrl && canEditGenres(heroSwrl.swrlID);
    const chips = shown.map(genre => element('span', 'pageHeroChip', genre));
    if (allGenresShown || hidden > 0) {
        const more = /** @type {HTMLButtonElement} */ (element('button', 'pageHeroChip pageHeroMore',
            allGenresShown ? 'Show fewer' : `+${hidden} more`));
        more.type = 'button';
        more.setAttribute('aria-expanded', String(allGenresShown));
        more.addEventListener('click', () => {
            allGenresShown = !allGenresShown;
            drawHeroGenres(genres);
        });
        chips.push(more);
    }
    if (editable) {
        // my own genres (cuisines), for my filters: only for swrls on my lists
        const swrl = heroSwrl;
        const words = genreWords(swrl.category.id);
        const edit = /** @type {HTMLButtonElement} */ (element('button', 'pageHeroChip pageHeroEdit',
            genres.length > 0 ? `Edit ${words.plural}` : `Add a ${words.singular}`));
        edit.type = 'button';
        edit.addEventListener('click', () => openGenreEditor(swrl, swrlFirestore, () => {
            if (heroSwrl === swrl) drawHeroGenres(myGenres(swrl.details.genres, getListEntry(swrl.swrlID)));
        }));
        chips.push(edit);
    }
    heroGenres.replaceChildren(...chips);
}

/** The swrl in the header now, for the genre editor. @type {Swrl | undefined} */
let heroSwrl;
// adding it to my list (or taking it off) shows or hides "Edit cuisines"
addListEntriesChangeListener(() => {
    if (heroSwrl && !swrlFullPageView.classList.contains('hidden')) {
        drawHeroGenres(myGenres(heroSwrl.details.genres, getListEntry(heroSwrl.swrlID)));
    }
});
/** @type {import('firebase/firestore').Firestore} */
let swrlFirestore;

/**
 * Lays the page out the way the user likes it: one scrolling page, or tabs
 * with one section at a time. Safe to call again whenever something that
 * affects the tabs changes (details arriving, the badge).
 */
function applyLayout() {
    const desktop = desktopQuery.matches;
    placeForDesktop(desktop);
    if (desktop) {
        // room for everything at once: the Tabs / Poster choice is for phones
        swrlFullPageView.dataset.layout = 'desktop';
        tabBar.classList.add('hidden');
        sectionIds.forEach(id => document.getElementById(`pageSection-${id}`).classList.remove('hidden'));
        return;
    }
    const layout = getPageLayout();
    const tabsLayout = layout === TABS;
    swrlFullPageView.dataset.layout = layout.id;
    tabBar.classList.toggle('hidden', !tabsLayout);
    if (!tabsLayout) {
        sectionIds.forEach(id => document.getElementById(`pageSection-${id}`).classList.remove('hidden'));
        return;
    }
    const tabs = tabsToShow({
        overview: true,
        cast: castContainer.childElementCount > 0,
        links: linksContainer.childElementCount > 0,
        // only someone signed in keeps notes
        notes: Boolean(swrlUser && !swrlUser.isAnonymous)
    });
    openTab = activeTab(tabs, openTab);
    drawTabs(tabBar, tabs, openTab, { friends: friendsBadge }, id => {
        openTab = id;
        showOpenSection();
        markActiveTab(tabBar, openTab);
    }, notesCount > 0 ? ['notes'] : []);
    showOpenSection();
}

/**
 * Moves the page's blocks between the phone order and the desktop one. On a
 * desktop the genres, tagline and buttons join the title in the header, the
 * story and cast fill the main column under my labels, and friends, ratings, links and my
 * notes sit in the side column. Safe to call again either way.
 *
 * @param {boolean} desktop
 */
function placeForDesktop(desktop) {
    if (desktop) {
        heroText.append(heroGenres, heroTagline, buttonsContainer);
        // my labels head the main column, not a band of their own under the header
        desktopMain.append(labelsContainer, detailsContainer, castContainer);
        desktopAside.append(friendsContainer, ratingsContainer, linksContainer, notesContainer);
    } else if (buttonsContainer.parentElement === heroText) {
        heroRow.after(heroGenres, heroTagline);
        hero.after(buttonsContainer);
        buttonsContainer.after(labelsContainer);
        overviewSection.append(ratingsContainer, detailsContainer);
        notesSection.append(notesContainer);
        sectionsContainer.append(friendsContainer, overviewSection, castContainer, linksContainer, notesSection);
    }
}

/** In the tab layout, shows only the open tab's section. */
function showOpenSection() {
    sectionIds.forEach(id => document.getElementById(`pageSection-${id}`).classList.toggle('hidden', id !== openTab));
}

/**
 * Opens a search for the films and shows a person has worked on.
 *
 * @param {import('../model/swrlPage').Person} person
 * @param {StateController} stateController
 */
function searchForPerson(person, stateController) {
    const searchView = new State(stateController.searchView);
    searchView.selectedCategory = WATCH;
    searchView.searchTerms = `personID:${person.id}`;
    stateController.changeState(searchView);
}

/**
 * Opens a swrler's list.
 *
 * @param {import('firebase/auth').User} swrler
 * @param {StateController} stateController
 */
function openSwrler(swrler, stateController) {
    const swrlerList = new State(stateController.swrlerLaterView);
    swrlerList.swrler = swrler;
    stateController.changeState(swrlerList);
}

/**
 * A row of someone's face and a sentence, which opens their list.
 *
 * @param {import('firebase/auth').User} swrler
 * @param {string} text
 * @param {StateController} stateController
 * @return {HTMLElement}
 */
function swrlerRow(swrler, text, stateController) {
    const row = /** @type {HTMLButtonElement} */ (element('button', 'who whoLink'));
    row.type = 'button';
    row.appendChild(avatar(swrler.displayName, swrler.photoURL, 'avatarSmall'));
    row.appendChild(element('span', 'whoText', text));
    row.addEventListener('click', () => openSwrler(swrler, stateController));
    return row;
}

/**
 * @param {string} message
 * @return {HTMLElement}
 */
function quote(message) {
    return element('p', 'quote', message);
}

/**
 * Who sent me this swrl and what they said.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 * @return {Promise<HTMLElement[]>}
 */
async function recommendationsToMe(swrl, firestore, stateController) {
    const cards = await Promise.all(inboxRecommendationsFor(swrl.swrlID).map(
        /** @param {Recommendation} recommendation */
        async recommendation => {
            try {
                const from = await getSwrler(recommendation.from, firestore);
                if (!from) return undefined;
                const card = element('div', 'socialCard');
                card.appendChild(swrlerRow(from, `${from.displayName} swrled you this`, stateController));
                if (recommendation.message) card.appendChild(quote(recommendation.message));
                return card;
            } catch (err) {
                console.error(err);
                return undefined;
            }
        }));
    return cards.filter(card => card !== undefined);
}

/**
 * Who I have swrled this to and what I said.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<HTMLElement[]>}
 */
async function recommendationsFromMe(swrl, firestore) {
    /** @type {Recommendation[]} */
    const sent = swrl.recommendations
        .filter(id => recommendationsSentCache.hasOwnProperty(id))
        .map(id => recommendationsSentCache[id])
        .filter(recommendation => recommendation.swrlID === swrl.swrlID);
    const cards = await Promise.all(sent.map(async recommendation => {
        try {
            const swrlers = await Promise.all(recommendation.to.map(uid => getSwrler(uid, firestore)));
            const names = swrlers.filter(swrler => swrler).map(swrler => swrler.displayName);
            if (names.length === 0) return undefined;
            const card = element('div', 'socialCard');
            const who = element('div', 'who');
            who.appendChild(element('span', 'whoText', `You swrled this to ${names.join(', ')}`));
            card.appendChild(who);
            if (recommendation.message) card.appendChild(quote(recommendation.message));
            return card;
        } catch (err) {
            console.error(err);
            return undefined;
        }
    }));
    return cards.filter(card => card !== undefined);
}

/**
 * The groups of people on the card of who has a swrl: title and who is in it.
 * Someone who has started it shows under "Watching" (or reading, ...), not "Later".
 *
 * @param {number} categoryID
 * @return {[string, (entry: import('../model/listEntry').ListEntry) => boolean][]}
 */
const swrlersCardSections = (categoryID) => [
    [progressWords(categoryID).now, entry => entry.later && entry.inProgress],
    ['Later', entry => entry.later && !entry.inProgress],
    ['Done', entry => entry.done],
    ['Loved', entry => entry.loved]];

/**
 * The card of who has the swrl on later, done or loved, as far as I may
 * know. That is me (own entries), my friends' entries I may read and
 * everyone with a public entry (see swrlersCardSources). The counts on the
 * swrl stay anonymous and include private entries, so they can be higher than
 * the names shown.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 * @return {Promise<HTMLElement[]>} one card, or none when nobody qualifies
 */
async function swrlersCard(swrl, firestore, stateController) {
    try {
        const entries = (await getEntriesForSwrl(swrl.swrlID, firestore))
            .filter(entry => entry.later || entry.done || entry.loved);
        if (entries.length === 0) return [];
        const uids = [...new Set(entries.map(entry => entry.uid))];
        const swrlers = new Map();
        await Promise.all(uids.map(async uid => {
            try {
                const swrler = await getSwrler(uid, firestore);
                if (swrler) swrlers.set(uid, swrler);
            } catch (err) {
                console.error('could not add swrler');
                console.error(err);
            }
        }));
        if (swrlers.size === 0) return [];
        const card = element('div', 'socialCard');
        const heading = element('div', 'who');
        const faces = element('span', 'faceStack');
        [...swrlers.values()].slice(0, 5).forEach(swrler =>
            faces.appendChild(avatar(swrler.displayName, swrler.photoURL, 'avatarSmall')));
        heading.appendChild(faces);
        heading.appendChild(element('span', 'whoText',
            swrlers.size === 1 ? '1 person has this on a list' : `${swrlers.size} people have this on a list`));
        card.appendChild(heading);
        swrlersCardSections(swrl.category.id).forEach(([title, inGroup]) => {
            const people = entries.filter(inGroup).map(entry => swrlers.get(entry.uid)).filter(s => s);
            if (people.length === 0) return;
            const group = element('div', 'swrlerGroup');
            group.appendChild(element('span', 'swrlerGroupTitle', title));
            const chips = element('div', 'swrlerChips');
            people.forEach(swrler => {
                const chip = /** @type {HTMLButtonElement} */ (element('button', 'swrlerChip'));
                chip.type = 'button';
                chip.appendChild(avatar(swrler.displayName, swrler.photoURL, 'avatarTiny'));
                chip.appendChild(element('span', undefined, swrler.displayName));
                chip.addEventListener('click', () => openSwrler(swrler, stateController));
                chips.appendChild(chip);
            });
            group.appendChild(chips);
            card.appendChild(group);
        });
        return [card];
    } catch (err) {
        console.error('could not render swrlers');
        console.error(err);
        return [];
    }
}

/**
 * The Friends section: who swrled this to me, who I swrled it to, and who has
 * it on a list. It always shows something, so its tab is never blank.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
async function renderFriends(swrl, firestore, stateController) {
    const token = socialCardsToken;
    friendsContainer.replaceChildren();
    const { block, body } = pageBlock('Friends', { tabTitle: true });
    const social = element('div', 'social');
    const loading = document.createElement('img');
    loading.className = 'loadingSpinnerSmall';
    loading.src = 'img/spinner.gif';
    loading.alt = 'Loading';
    social.appendChild(loading);
    body.appendChild(social);
    friendsContainer.appendChild(block);

    const [toMe, fromMe, onLists] = await Promise.all([
        recommendationsToMe(swrl, firestore, stateController),
        recommendationsFromMe(swrl, firestore),
        swrlersCard(swrl, firestore, stateController)
    ]);
    if (token !== socialCardsToken) return;
    const cards = [...toMe, ...fromMe, ...onLists];
    social.replaceChildren(...(cards.length > 0 ? cards :
        [element('p', 'pageEmpty', 'None of your friends have this on a list yet. Swrl it to a friend and see what they think.')]));
    if (toMe.length !== friendsBadge) {
        friendsBadge = toMe.length;
        applyLayout();
    }
}

function updateDetails(swrl, swrlExists, firestore, stateController) {
    detailController = new AbortController();
    searchId = Math.random();
    loadingbar.classList.remove('hidden');
    console.log('getting new details');
    try {
        swrl.type.detailGetter.get(swrl.details.id, detailController.signal, searchId)
            .then(result => {
                if (result && result.details && result.id === searchId) {
                    const updatedSwrl = swrl;
                    updatedSwrl.details = result.details;
                    if (swrlExists) {
                        const firestoreData = updatedSwrl.toPartialFireStoreData();
                        setDoc(doc(firestore, Collection.SWRLS, updatedSwrl.swrlID), firestoreData,
                            { merge: true });
                    }
                    renderHero(updatedSwrl);
                    renderDetailSections(updatedSwrl, stateController);
                    console.log('got new details');
                    loadingbar.classList.add('hidden');
                }
            })
            .catch(err => {
                console.error('Could not get details');
                console.error(err);
                loadingbar.classList.add('hidden');
            });
    }
    catch (err) {
        console.error('Could not get details');
        console.error(err);
        loadingbar.classList.add('hidden');
    }
}

/**
 * Fills the overview (ratings and the story), cast and links sections from a
 * swrl's details, replacing what was there, then lays the page out again.
 *
 * @param {Swrl} swrl
 * @param {StateController} stateController
 */
function renderDetailSections(swrl, stateController) {
    const details = swrl.details;
    destroyDetailSections();
    const ratings = buildRatings(details);
    if (ratings) ratingsContainer.appendChild(ratings);
    const story = buildStory(details);
    if (story) detailsContainer.appendChild(story);
    const cast = buildCast(details, person => searchForPerson(person, stateController));
    if (cast) castContainer.appendChild(cast);
    const links = buildLinks(details);
    if (links) linksContainer.appendChild(links);
    applyLayout();
}

function destroySwrlFullPage() {
    shareBanner.classList.add('hidden');
    socialCardsToken = undefined;
    hideAttribution('swrlAttribution');
    hideLabels();
    hidePrivateComments();
    hideSwrlVisibility();
    swrlFullPageView.classList.add('hidden');
    loadingbar.classList.add('hidden');
    if (detailController) {
        detailController.abort();
    }

    while (pageButtons.firstChild) {
        pageButtons.removeChild(pageButtons.firstChild);
    }

    destroyDetailSections();
    friendsContainer.replaceChildren();
    tabBar.replaceChildren();
}

function destroyDetailSections() {
    ratingsContainer.replaceChildren();
    detailsContainer.replaceChildren();
    castContainer.replaceChildren();
    linksContainer.replaceChildren();
}

const shareBanner = document.getElementById('swrlFullPageShare');

/**
 * When the swrl was opened from a link someone shared: who sent it, what they
 * said, and, for someone not logged in, what a swrl is.
 *
 * @param {StateController} stateController
 */
function showShareBanner(stateController) {
    const share = stateController.currentState.share;
    shareBanner.classList.toggle('hidden', !share);
    if (!share) return;
    // textContent, never innerHTML: both are whatever a person typed
    shareBanner.querySelector('.sharedBannerWho').textContent = `${share.fromName} swrled you this`;
    const message = shareBanner.querySelector('.sharedBannerMessage');
    message.textContent = share.message ? `“${share.message}”` : '';
    message.classList.toggle('hidden', !share.message);
    shareBanner.querySelector('.sharedBannerNew').classList.toggle('hidden', Boolean(swrlUser && !swrlUser.isAnonymous));
    /** @type {HTMLAnchorElement} */
    const about = shareBanner.querySelector('.sharedBannerAbout');
    about.onclick = (e) => {
        e.preventDefault();
        stateController.changeState(new State(stateController.aboutView));
    };
}
