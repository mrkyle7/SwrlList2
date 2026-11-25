import { getAllListEntries, getListEntry } from '../listeners/listEntries';
import { categoryWords } from '../model/categoryWords';
import { cleanGenre, myGenres } from '../model/myGenres';
import setMyGenres from '../actions/setMyGenres';
import { showToasterMessage } from './toaster';

/**
 * The sheet where I change a swrl's genres (cuisines for places to eat) for
 * myself: remove one with its ×, type one to add (suggestions are the ones
 * already on my lists in that category), then Save. Stored on my list entry
 * (actions/setMyGenres.js); only for swrls on one of my lists.
 */

const sheet = document.getElementById('genreSheet');
const backdrop = document.getElementById('genreSheetBackdrop');
const chips = document.getElementById('genreSheetChips');
const form = document.getElementById('genreSheetForm');
const input = /** @type {HTMLInputElement} */ (document.getElementById('genreSheetInput'));
const suggestions = document.getElementById('genreSheetSuggestions');

/** @type {{swrl: import('../model/swrl').Swrl, firestore: import('firebase/firestore').Firestore, wanted: string[], done: () => void, opener: Element | null} | undefined} */
let open;

/**
 * Whether I can change this swrl's genres: it is on one of my lists.
 *
 * @param {string} swrlID
 * @return {boolean}
 */
export function canEditGenres(swrlID) {
    const entry = getListEntry(swrlID);
    return Boolean(entry && !entry.deleted && (entry.later || entry.done || entry.loved));
}

/**
 * @param {number} categoryID
 * @return {{singular: string, plural: string, Plural: string}} "cuisine", "cuisines", "Cuisines"
 */
export function genreWords(categoryID) {
    const singular = categoryWords(categoryID).genre;
    const plural = singular + 's';
    return { singular, plural, Plural: plural.charAt(0).toUpperCase() + plural.slice(1) };
}

/**
 * @param {import('../model/swrl').Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {() => void} done after a save, to draw the new genres
 */
export function openGenreEditor(swrl, firestore, done) {
    const words = genreWords(swrl.category.id);
    open = { swrl, firestore, wanted: myGenres(swrl.details.genres, getListEntry(swrl.swrlID)), done, opener: document.activeElement };
    document.getElementById('genreSheetTitle').textContent = words.Plural;
    input.placeholder = `Add a ${words.singular}`;
    document.getElementById('genreSheetAddButton').setAttribute('aria-label', `Add ${words.singular}`);
    const mine = new Set();
    getAllListEntries().filter(entry => entry.category.id === swrl.category.id)
        .forEach(entry => myGenres(entry.details.genres, entry).forEach(genre => mine.add(genre)));
    suggestions.replaceChildren(...[...mine].sort().map(genre => {
        const option = document.createElement('option');
        option.value = genre;
        return option;
    }));
    input.value = '';
    drawChips();
    sheet.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    input.focus();
}

function drawChips() {
    if (!open) return;
    const words = genreWords(open.swrl.category.id);
    chips.replaceChildren(...open.wanted.map(genre => {
        const chip = document.createElement('span');
        chip.className = 'genreSheetChip';
        chip.textContent = genre;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'genreSheetRemove';
        remove.setAttribute('aria-label', `Remove ${genre}`);
        remove.title = `Remove ${genre}`;
        remove.textContent = '×';
        remove.addEventListener('click', () => {
            open.wanted = open.wanted.filter(g => g !== genre);
            drawChips();
            input.focus();
        });
        chip.appendChild(remove);
        return chip;
    }));
    if (open.wanted.length === 0) {
        const none = document.createElement('p');
        none.className = 'genreSheetNone';
        none.textContent = `No ${words.plural} yet. Add one below.`;
        chips.appendChild(none);
    }
}

function close() {
    sheet.classList.add('hidden');
    backdrop.classList.add('hidden');
    const opener = open && open.opener;
    open = undefined;
    if (opener instanceof HTMLElement) opener.focus();
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!open) return;
    const genre = cleanGenre(input.value);
    if (genre && !open.wanted.some(g => g.toLocaleLowerCase() === genre.toLocaleLowerCase())) {
        open.wanted = [...open.wanted, genre];
        drawChips();
    }
    input.value = '';
    input.focus();
});

document.getElementById('genreSheetSave').addEventListener('click', () => {
    if (!open) return;
    const { swrl, firestore, wanted, done } = open;
    // something typed but not added yet counts too
    const typed = cleanGenre(input.value);
    const all = typed && !wanted.some(g => g.toLocaleLowerCase() === typed.toLocaleLowerCase()) ? [...wanted, typed] : wanted;
    const words = genreWords(swrl.category.id);
    close();
    setMyGenres(swrl.swrlID, swrl.details.genres, all, firestore)
        .then(() => {
            showToasterMessage(`Saved ${words.plural} for ${swrl.details.title}`);
            done();
        })
        .catch(error => {
            console.error('Could not save genres');
            console.error(error);
            showToasterMessage(`Couldn't save the ${words.plural}`, { kind: 'warning' });
        });
});
document.getElementById('genreSheetCancel').addEventListener('click', close);
backdrop.addEventListener('click', close);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) close();
});
