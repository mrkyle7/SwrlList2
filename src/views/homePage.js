import { doc, getDoc } from 'firebase/firestore';
import { UIView } from './UIView';
import { StateController } from './stateController';
import { State } from '../model/state';
import { Swrl } from '../model/swrl';
import { swrlUser } from '../firebase/login';
import { addHomeLayoutListener, addListEntriesChangeListener, getAllListEntries, getHomeLayout, whenListEntriesReady } from '../listeners/listEntries';
import { recommendationsInboxCache, inboxReady } from '../listeners/recommendations';
import { countsByCategory, inProgressByCategory, latestRecommendedSwrls } from '../model/listView';
import { CARDS, homeTileCounts } from '../model/homeLayout';
import { Categories } from '../constants/Category';
import { renderSwrl } from '../components/swrl';
import { Collection } from '../constants/Collection';
import { SEARCH } from '../constants/View';

/** The desktop layout starts here (www/css/index.css uses the same width). */
const desktop = window.matchMedia('(min-width: 1025px)');
/** How many swrls the home screen's "Swrled to you" shows. */
const SWRLED_SHOWN = 3;

export class Home extends UIView {
    /**
    * @param {StateController} stateController
    */
    constructor(stateController) {
        super(stateController, stateController.homeScreen);
        this.sections = document.getElementById('sections');
        this.showing = false;
        // follow sign-in, my list changing and a new layout while home shows
        let pending;
        const refresh = () => {
            if (!this.showing) return;
            clearTimeout(pending);
            pending = setTimeout(() => { if (this.showing) showExtras(stateController); }, 150);
        };
        addListEntriesChangeListener(refresh);
        addHomeLayoutListener(refresh);
        document.getElementById('homeSwrledAll').addEventListener('click', (e) => {
            e.preventDefault();
            stateController.changeState(new State(stateController.inboxView));
        });
    }

    show() {
        this.showing = true;
        this.sections.classList.remove('hidden');
        showExtras(this.stateController);
    }

    destroy() {
        visit++;
        shownSwrledIds = '';
        this.showing = false;
        this.sections.classList.add('hidden');
    }
}

/** Bumped on every show and hide, so a late answer is not drawn on a later visit. */
let visit = 0;
/** The swrls "Swrled to you" last drew, so a refresh with the same ones keeps the cards. */
let shownSwrledIds = '';

/**
 * Whether "Swrled to you" is on screen: always on desktop, and on phones
 * with the cards layout (the stylesheet hides it on phones otherwise).
 *
 * @return {boolean}
 */
function showsSwrled() {
    return desktop.matches || getHomeLayout() === CARDS;
}

/**
 * The parts of the home screen beyond the four tiles, shown on desktop and
 * on phones with the cards layout (the stylesheet hides them otherwise): a
 * greeting, how many swrls are on my list in each category, and the newest
 * swrls sent to me.
 *
 * @param {StateController} stateController
 */
async function showExtras(stateController) {
    const thisVisit = ++visit;
    const signedIn = swrlUser && !swrlUser.isAnonymous;
    const firstName = signedIn && swrlUser.displayName ? swrlUser.displayName.split(' ')[0] : '';
    document.getElementById('homeGreetingText').textContent = firstName ? `Hi ${firstName}` : 'Welcome to Swrl List';
    const swrled = document.getElementById('homeSwrled');
    const counts = document.querySelectorAll('.sectionCount');
    const pills = document.querySelectorAll('.sectionPills');
    if (!signedIn) {
        counts.forEach(count => { count.textContent = ''; });
        pills.forEach(pill => { pill.replaceChildren(); });
        swrled.classList.add('hidden');
        return;
    }
    await whenListEntriesReady();
    if (visit !== thisVisit) return;
    const byCategory = countsByCategory(getAllListEntries());
    const started = inProgressByCategory(getAllListEntries());
    /** @param {Element} element */
    const tileCounts = element => {
        const name = /** @type {HTMLElement} */ (element).dataset.category;
        return homeTileCounts(byCategory[name] || 0, started[name] || 0, Categories.find(c => c.name === name));
    };
    // desktop: one line on the tile
    counts.forEach(count => {
        const words = tileCounts(count);
        count.textContent = words.onList + (words.started ? ` · ${words.started}` : '');
    });
    // phone cards: white pills, readable on every tile colour (purple included)
    pills.forEach(pill => {
        const words = tileCounts(pill);
        pill.replaceChildren(...[words.onList, words.started].filter(Boolean).map(text => {
            const span = document.createElement('span');
            span.className = 'sectionPill';
            span.textContent = text;
            return span;
        }));
    });
    if (showsSwrled()) {
        showSwrledToMe(stateController, thisVisit);
    } else {
        swrled.classList.add('hidden');
    }
}

/**
 * The newest swrls sent to me, as compact cards.
 *
 * @param {StateController} stateController
 * @param {number} thisVisit
 */
async function showSwrledToMe(stateController, thisVisit) {
    const swrled = document.getElementById('homeSwrled');
    const list = document.getElementById('homeSwrledList');
    // the inbox fills in shortly after sign-in
    for (let tries = 0; !inboxReady && tries < 20; tries++) {
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (visit !== thisVisit) return;
    const ids = latestRecommendedSwrls(Object.values(recommendationsInboxCache), SWRLED_SHOWN);
    if (ids.length > 0 && ids.join() === shownSwrledIds) {
        swrled.classList.remove('hidden');
        return;
    }
    const swrls = (await Promise.all(ids.map(async id => {
        try {
            const snapshot = await getDoc(doc(stateController.firestore, Collection.SWRLS, id));
            return snapshot.exists() ? Swrl.fromFirestore(snapshot.data()) : undefined;
        } catch (error) {
            console.error(`Could not get swrl ${id} for the home screen`);
            console.error(error);
            return undefined;
        }
    }))).filter(swrl => swrl !== undefined);
    if (visit !== thisVisit) return;
    list.replaceChildren();
    shownSwrledIds = swrls.length === ids.length ? ids.join() : '';
    swrls.forEach(swrl => renderSwrl(stateController, SEARCH, swrl, stateController.firestore, list));
    swrled.classList.toggle('hidden', swrls.length === 0);
}
