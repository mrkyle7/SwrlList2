import { doc, getDoc } from 'firebase/firestore';
import { Collection } from '../constants/Collection';
import { Category } from '../constants/Category';
import { swrlUser } from '../firebase/login';
import { getSwrlerCached } from '../firebase/swrler';
import { friendEntries } from '../firebase/friendEntries';
import { getAllListEntries } from '../listeners/listEntries';
import { tasteOverlap, tastePicks } from '../model/taste';
import { getFriends, whenFriendsReady } from '../listeners/friends';
import { getListEntry, whenListEntriesReady } from '../listeners/listEntries';
import { recommendationsInboxCache } from '../listeners/recommendations';
import { activityCaption, friendsActivity, nameList, newForYou } from '../model/activity';
import { State } from '../model/state';
import { Swrl } from '../model/swrl';

const STRIP_SIZE = 12;

/**
 * Rows of posters at the top of a category's Discover tab, for a signed-in
 * user: "Swrled to you" (swrls friends sent me that I have not opened yet),
 * "Your friends are into" (what friends recently added, finished or loved,
 * that I do not have) and "Loved by friends with your taste" (what friends
 * whose loves overlap with mine loved). Each row only appears when it has
 * something in it.
 *
 * @param {HTMLElement} container the Discover list; the rows go in at its top
 * @param {Category} category
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {import('../views/stateController').StateController} stateController
 * @param {() => boolean} isCurrent false once the list has moved on
 */
export async function renderCategoryStrips(container, category, firestore, stateController, isCurrent) {
    if (!swrlUser || swrlUser.isAnonymous) return;
    try {
        await Promise.all([whenFriendsReady(), whenListEntriesReady()]);
        const [fresh, activity, taste] = await Promise.all([
            newForYouIn(category, firestore),
            friendsInto(category, firestore),
            tasteIn(category, firestore)
        ]);
        // a swrl shows once: the taste row is the more telling, so it keeps its own
        const inTaste = new Set(taste.map(item => item.swrl.swrlID));
        const activityOnly = activity.filter(item => !inTaste.has(item.swrl.swrlID));
        if (!isCurrent() || (fresh.length === 0 && activityOnly.length === 0 && taste.length === 0)) return;
        const strips = document.createElement('div');
        strips.className = 'categoryStrips';
        if (fresh.length > 0) {
            strips.appendChild(strip('Swrled to you', fresh, stateController, () => stateController.changeState(new State(stateController.inboxView))));
        }
        if (taste.length > 0) {
            strips.appendChild(strip('Loved by friends with your taste', taste, stateController));
        }
        if (activityOnly.length > 0) {
            strips.appendChild(strip('Your friends are into', activityOnly, stateController));
        }
        // a heading for the list below the rows, so the two read as separate
        if (container.querySelector('.swrl')) {
            const rest = document.createElement('h3');
            rest.className = 'stripListHeading';
            rest.textContent = 'More to discover';
            strips.appendChild(rest);
        }
        container.querySelectorAll(':scope > .categoryStrips').forEach(old => old.remove());
        container.prepend(strips);
    } catch (error) {
        console.error('Could not show what is new from friends');
        console.error(error);
    }
}

/**
 * @param {Category} category
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<{swrl: Swrl, caption: string}[]>}
 */
async function newForYouIn(category, firestore) {
    // only what still needs a look: not already on my list, done or dismissed
    const fresh = newForYou(Object.values(recommendationsInboxCache), swrlUser.uid)
        .filter(item => {
            const mine = getListEntry(item.swrlID);
            return !(mine && (mine.later || mine.done || mine.deleted));
        })
        .slice(0, 30);
    const found = await Promise.all(fresh.map(async item => {
        const [swrl, senders] = await Promise.all([
            sharedSwrl(item.swrlID, firestore),
            Promise.all(item.from.map(uid => getSwrlerCached(uid, firestore)))
        ]);
        return swrl && swrl.category.id === category.id
            ? { swrl, caption: 'Swrled by ' + nameList(senders.map(s => s && s.displayName)) }
            : undefined;
    }));
    return found.filter(Boolean).slice(0, STRIP_SIZE);
}

/**
 * @param {Category} category
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<{swrl: Swrl, caption: string}[]>}
 */
async function friendsInto(category, firestore) {
    const friends = getFriends();
    const friendsEntries = await Promise.all(friends.map(async friend =>
        ({ uid: friend.uid, entries: await friendEntries(friend.uid, firestore, category.id) })));
    const activity = friendsActivity(friendsEntries, swrlID => getListEntry(swrlID), STRIP_SIZE);
    return Promise.all(activity.map(async item => {
        const people = await Promise.all(item.friends.map(async f => {
            const swrler = await getSwrlerCached(f.uid, firestore);
            return { name: swrler ? swrler.displayName : '', loved: f.loved };
        }));
        return { swrl: item.entry.toSwrl(), caption: activityCaption(people.filter(p => p.name)) };
    }));
}

/** @type {Map<string, Promise<Swrl | undefined>>} */
const swrlLookups = new Map();

/**
 * The shared swrl, remembered for the life of the page.
 *
 * @param {string} swrlID
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<Swrl | undefined>}
 */
function sharedSwrl(swrlID, firestore) {
    if (!swrlLookups.has(swrlID)) {
        swrlLookups.set(swrlID, getDoc(doc(firestore, Collection.SWRLS, swrlID))
            .then(snapshot => snapshot.exists() ? Swrl.fromFirestore(snapshot.data()) : undefined)
            .catch(error => {
                swrlLookups.delete(swrlID);
                console.error(error);
                return undefined;
            }));
    }
    return swrlLookups.get(swrlID);
}

/**
 * What friends whose loves overlap with mine loved, in this category, best
 * match first. The overlap is worked out across every category.
 *
 * @param {Category} category
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<{swrl: Swrl, caption: string}[]>}
 */
async function tasteIn(category, firestore) {
    const mine = getAllListEntries();
    const friends = await Promise.all(getFriends().map(async friend => {
        const all = await friendEntries(friend.uid, firestore);
        const overlap = tasteOverlap(mine, all);
        return { uid: friend.uid, score: overlap.score, bothLoved: overlap.bothLoved, entries: all.filter(e => e.category.id === category.id) };
    }));
    const picks = tastePicks(friends, swrlID => getListEntry(swrlID), STRIP_SIZE);
    const loves = new Map(friends.map(f => [f.uid, f.bothLoved]));
    return Promise.all(picks.map(async pick => {
        const best = pick.friends[0];
        const swrler = await getSwrlerCached(best, firestore);
        const both = loves.get(best) || 0;
        const name = swrler ? swrler.displayName : 'A friend';
        const caption = both > 0 ? `${name} loved it \u00b7 you agree on ${both}` : `${name} loved it`;
        return { swrl: pick.entry.toSwrl(), caption };
    }));
}

/**
 * @param {string} title
 * @param {{swrl: Swrl, caption: string}[]} items
 * @param {import('../views/stateController').StateController} stateController
 * @param {() => void} [seeAll]
 * @return {HTMLElement}
 */
function strip(title, items, stateController, seeAll) {
    const section = document.createElement('section');
    section.className = 'strip';
    const head = document.createElement('div');
    head.className = 'stripHead';
    const heading = document.createElement('h3');
    heading.textContent = title;
    head.appendChild(heading);
    if (seeAll) {
        const all = document.createElement('button');
        all.type = 'button';
        all.className = 'stripAll';
        all.textContent = 'See all';
        all.addEventListener('click', seeAll);
        head.appendChild(all);
    }
    section.appendChild(head);
    const row = document.createElement('div');
    row.className = 'stripRow';
    items.forEach(({ swrl, caption }) => {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'stripTile';
        const poster = document.createElement('img');
        poster.className = 'stripPoster';
        poster.alt = '';
        poster.loading = 'lazy';
        poster.src = swrl.details.imageUrl || 'img/NoPoster.jpg';
        poster.addEventListener('error', () => { poster.src = 'img/NoPoster.jpg'; }, { once: true });
        const name = document.createElement('span');
        name.className = 'stripTitle';
        // textContent: titles and names come from other people
        name.textContent = swrl.details.title;
        const why = document.createElement('span');
        why.className = 'stripCaption';
        why.textContent = caption;
        tile.append(poster, name, why);
        tile.setAttribute('aria-label', `${swrl.details.title}. ${caption}`);
        tile.addEventListener('click', () => {
            const state = new State(stateController.swrlView);
            state.swrl = swrl;
            state.selectedCategory = swrl.category;
            stateController.changeState(state);
        });
        row.appendChild(tile);
    });
    section.appendChild(row);
    return section;
}
