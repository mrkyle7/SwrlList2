import { Category } from '../constants/Category';
import { typeFromId, typeLabel } from '../constants/Type';
import { getSwrlerCached } from '../firebase/swrler';
import { getAllMyLabels, getLabelsFor } from '../listeners/labels';
import { getAllListEntries } from '../listeners/listEntries';
import { inboxRecommendationsFor, isRecommendedToMe } from '../listeners/recommendations';
import { hasLabel, matchesLabels } from '../model/labels';
import { pickWeighted } from '../model/taste';
import { State } from '../model/state';

const VERBS = { 1: 'watch', 2: 'read', 3: 'listen to', 4: 'play' };
const PICKS = 3;
/** How much likelier a swrl from a friend is to come up than anything else on the list. */
const SWRLED_WEIGHT = 3;

const sheet = document.getElementById('pickSheet');
const backdrop = document.getElementById('pickSheetBackdrop');
const types = document.getElementById('pickTypes');
const labels = document.getElementById('pickLabels');
/** @type {HTMLInputElement} */
// @ts-ignore
const swrledOnly = document.getElementById('pickSwrledOnly');
const results = document.getElementById('pickResults');
const empty = document.getElementById('pickEmpty');
/** @type {HTMLButtonElement} */
// @ts-ignore
const go = document.getElementById('pickGo');

/**
 * "Can't decide?": a sheet that picks three things from my list in a
 * category, at random, with swrls from friends more likely, narrowed by type,
 * label or only what was swrled to me. Shuffle for three more.
 *
 * @param {Category} category
 * @param {import('../views/stateController').StateController} stateController
 */
export function showTonightPicker(category, stateController) {
    document.getElementById('pickSheetTitle').textContent = `What should you ${VERBS[category.id] || 'try'}?`;
    fillChoices(category);
    swrledOnly.checked = false;
    results.classList.add('hidden');
    empty.classList.add('hidden');
    go.textContent = 'Pick three for me';
    go.onclick = () => pick(category, stateController);
    sheet.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    document.addEventListener('keydown', onKey);
    go.focus();
}

/** @param {Category} category */
function fillChoices(category) {
    while (types.firstChild) types.removeChild(types.firstChild);
    if (category.typeFilters.length > 1) {
        [{ id: 'all', text: 'All' }, ...category.typeFilters.map(filter => ({ id: String(filter.value), text: typeLabel(typeFromId(filter.value)) }))]
            .forEach((choice, i) => chip(types, 'radio', 'pickType', 'pickType' + choice.id, choice.id, choice.text, i === 0));
    }
    while (labels.firstChild) labels.removeChild(labels.firstChild);
    // only labels on something in this list, or the choice would find nothing
    const onList = listed(category);
    getAllMyLabels()
        .filter(label => onList.some(entry => hasLabel(getLabelsFor(entry.swrlID), label)))
        .forEach((label, i) => chip(labels, 'checkbox', 'pickLabel', 'pickLabel' + i, label, label, false));
}

/**
 * @param {HTMLElement} parent
 * @param {'radio' | 'checkbox'} kind
 * @param {string} name
 * @param {string} id
 * @param {string} value
 * @param {string} text
 * @param {boolean} checked
 */
function chip(parent, kind, name, id, value, text, checked) {
    const input = document.createElement('input');
    input.type = kind;
    input.name = name;
    input.id = id;
    input.value = value;
    input.checked = checked;
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = text;
    parent.append(input, label);
}

/**
 * Everything on my list (not done) in a category.
 *
 * @param {Category} category
 */
function listed(category) {
    return getAllListEntries().filter(entry => entry.later && !entry.deleted && entry.category.id === category.id);
}

/**
 * @param {Category} category
 * @param {import('../views/stateController').StateController} stateController
 */
function pick(category, stateController) {
    /** @type {HTMLInputElement} */
    const type = types.querySelector('input:checked');
    const chosenLabels = [...labels.querySelectorAll('input:checked')].map(input => /** @type {HTMLInputElement} */ (input).value);
    const all = listed(category);
    const candidates = all.filter(entry => (!type || type.value === 'all' || String(entry.type.id) === type.value)
        && matchesLabels(getLabelsFor(entry.swrlID), chosenLabels)
        && (!swrledOnly.checked || isRecommendedToMe(entry.swrlID)));
    const picks = pickWeighted(candidates.map(entry => ({ item: entry, weight: isRecommendedToMe(entry.swrlID) ? SWRLED_WEIGHT : 1 })), PICKS, Math.random);
    while (results.firstChild) results.removeChild(results.firstChild);
    results.classList.toggle('hidden', picks.length === 0);
    empty.classList.toggle('hidden', picks.length > 0);
    if (picks.length === 0) {
        empty.textContent = all.length === 0
            ? 'Your list is empty. Add a few things first.'
            : 'Nothing on your list matches. Try fewer choices.';
        return;
    }
    picks.forEach(entry => results.appendChild(tile(entry, stateController)));
    go.textContent = candidates.length > PICKS ? 'Shuffle' : 'Pick again';
}

/**
 * @param {import('../model/listEntry').ListEntry} entry
 * @param {import('../views/stateController').StateController} stateController
 * @return {HTMLElement}
 */
function tile(entry, stateController) {
    const swrl = entry.toSwrl();
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'stripTile pickTile';
    const poster = document.createElement('img');
    poster.className = 'stripPoster';
    poster.alt = '';
    poster.src = swrl.details.imageUrl || 'img/NoPoster.jpg';
    poster.addEventListener('error', () => { poster.src = 'img/NoPoster.jpg'; }, { once: true });
    const name = document.createElement('span');
    name.className = 'stripTitle';
    name.textContent = swrl.details.title;
    const why = document.createElement('span');
    why.className = 'stripCaption';
    why.textContent = entry.added
        ? 'On your list since ' + entry.added.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        : 'On your list';
    // a friend's swrl says who sent it
    const swrled = inboxRecommendationsFor(entry.swrlID)[0];
    if (swrled) {
        getSwrlerCached(swrled.from, stateController.firestore).then(swrler => {
            if (swrler) why.textContent = 'Swrled by ' + swrler.displayName;
        });
    }
    element.append(poster, name, why);
    element.addEventListener('click', () => {
        close();
        const state = new State(stateController.swrlView);
        state.swrl = swrl;
        state.selectedCategory = swrl.category;
        stateController.changeState(state);
    });
    return element;
}

function close() {
    sheet.classList.add('hidden');
    backdrop.classList.add('hidden');
    document.removeEventListener('keydown', onKey);
}

/** Closes the picker; also called when the list goes. */
export function closeTonightPicker() {
    close();
}

/** @param {KeyboardEvent} e */
function onKey(e) {
    if (e.key === 'Escape') close();
}

document.getElementById('pickClose').addEventListener('click', close);
backdrop.addEventListener('click', close);
