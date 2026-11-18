import { doc, getDoc } from 'firebase/firestore';
import { UIView } from './UIView';
import { StateController } from './stateController';
import { State } from '../model/state';
import { Swrl } from '../model/swrl';
import { swrlUser } from '../firebase/login';
import { getAllListEntries, whenListEntriesReady } from '../listeners/listEntries';
import { recommendationsInboxCache, inboxReady } from '../listeners/recommendations';
import { countsByCategory, latestRecommendedSwrls } from '../model/listView';
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
        document.getElementById('homeSwrledAll').addEventListener('click', (e) => {
            e.preventDefault();
            stateController.changeState(new State(stateController.inboxView));
        });
    }

    show() {
        this.sections.classList.remove('hidden');
        showDesktopExtras(this.stateController);
    }

    destroy() {
        visit++;
        this.sections.classList.add('hidden');
    }
}

/** Bumped on every show and hide, so a late answer is not drawn on a later visit. */
let visit = 0;

/**
 * The parts of the home screen only the desktop layout shows (the stylesheet
 * hides them on phones): a greeting, how many swrls are on my list in each
 * category, and the newest swrls sent to me.
 *
 * @param {StateController} stateController
 */
async function showDesktopExtras(stateController) {
    const thisVisit = ++visit;
    const signedIn = swrlUser && !swrlUser.isAnonymous;
    const firstName = signedIn && swrlUser.displayName ? swrlUser.displayName.split(' ')[0] : '';
    document.getElementById('homeGreetingText').textContent = firstName ? `Hi ${firstName}` : 'Welcome to Swrl List';
    const swrled = document.getElementById('homeSwrled');
    const counts = document.querySelectorAll('.sectionCount');
    counts.forEach(count => { count.textContent = ''; });
    if (!signedIn) {
        swrled.classList.add('hidden');
        return;
    }
    await whenListEntriesReady();
    if (visit !== thisVisit) return;
    const byCategory = countsByCategory(getAllListEntries());
    counts.forEach(count => {
        const n = byCategory[/** @type {HTMLElement} */ (count).dataset.category] || 0;
        count.textContent = n === 0 ? 'Nothing on your list yet' : `${n} on your list`;
    });
    if (desktop.matches) showSwrledToMe(stateController, thisVisit);
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
    swrls.forEach(swrl => renderSwrl(stateController, SEARCH, swrl, stateController.firestore, list));
    swrled.classList.toggle('hidden', swrls.length === 0);
}
