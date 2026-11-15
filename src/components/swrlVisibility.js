import { swrlUser } from '../firebase/login';
import { Swrl } from '../model/swrl';
import { PRIVATE, FRIENDS, PUBLIC, Visibility, visibilities } from '../constants/Visibility';
import {
    addListEntriesChangeListener, getDefaultVisibility, getListEntry, whenListEntriesReady
} from '../listeners/listEntries';
import setSwrlVisibility from '../actions/setSwrlVisibility';
import { USE_DEFAULT, currentChoice } from '../model/visibilitySettings';
import { showToasterMessage } from './toaster';

const container = document.getElementById('swrlFullPageVisibility');
/** @type {HTMLButtonElement} */
// @ts-ignore
const button = document.getElementById('swrlVisibilityButton');
const buttonIcon = document.getElementById('swrlVisibilityIcon');
const menu = document.getElementById('swrlVisibilityMenu');

/** One 24px icon (an SVG path) and one line of explanation per visibility. */
const LOOK = {
    [PRIVATE.id]: {
        icon: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z',
        who: 'Only you'
    },
    [FRIENDS.id]: {
        icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
        who: 'Your friends'
    },
    [PUBLIC.id]: {
        icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
        who: 'Anyone'
    }
};
const CHECK = 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z';
const SVG = 'http://www.w3.org/2000/svg';

/** @type {(() => void) | undefined} */
let stopListening;
/** Changes on every show/hide so a late answer is not applied to another swrl's page. */
let visit = 0;
let saving = false;

/**
 * The visibility control on the swrl's full page: a round icon button in the
 * corner of the poster area showing who can see my entry for this swrl (a
 * padlock for only me, people for friends, a globe for anyone). Pressing it
 * opens a menu to change it: my default, or private / friends / public for
 * this swrl only. It is only shown while the swrl is on one of my lists
 * (later, done or loved), and follows my entry live. Not shown to anonymous
 * users.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function showSwrlVisibility(swrl, firestore) {
    hideSwrlVisibility();
    if (!swrlUser || swrlUser.isAnonymous) return;
    const thisVisit = ++visit;

    /** @param {Visibility | 'default'} choice */
    const choose = (choice) => {
        closeMenu();
        button.focus();
        const entry = getListEntry(swrl.swrlID);
        if (saving || !entry || sameChoice(currentChoice(entry), choice)) return;
        saving = true;
        container.classList.add('saving');
        setSwrlVisibility(swrl.swrlID, choice, firestore)
            .then(() => showToasterMessage('Visibility saved'))
            .catch(error => {
                console.error('Could not change the visibility of this swrl');
                console.error(error);
                showToasterMessage("Couldn't change who can see this swrl");
            })
            .finally(() => {
                if (visit !== thisVisit) return;
                saving = false;
                container.classList.remove('saving');
                update(swrl);
            });
    };

    button.onclick = () => {
        if (menu.classList.contains('hidden')) {
            openMenu(swrl, choose);
        } else {
            closeMenu();
        }
    };
    stopListening = addListEntriesChangeListener(() => {
        if (visit === thisVisit && !saving) update(swrl);
    });
    whenListEntriesReady().then(() => {
        if (visit === thisVisit) update(swrl);
    });
}

/** Hides the control and stops following my entry. */
export function hideSwrlVisibility() {
    visit++;
    if (stopListening) stopListening();
    stopListening = undefined;
    button.onclick = null;
    saving = false;
    closeMenu();
    container.classList.remove('saving');
    container.classList.add('hidden');
}

/**
 * Shows or hides the button and sets its icon from my entry.
 *
 * @param {Swrl} swrl
 */
function update(swrl) {
    const entry = getListEntry(swrl.swrlID);
    const onAList = entry !== undefined && (entry.later || entry.done || entry.loved);
    container.classList.toggle('hidden', !onAList);
    if (!onAList) {
        closeMenu();
        return;
    }
    const choice = currentChoice(entry);
    const effective = choice === USE_DEFAULT ? getDefaultVisibility() : choice;
    buttonIcon.setAttribute('d', LOOK[effective.id].icon);
    container.dataset.visibility = effective.id;
    const text = `Visible to: ${LOOK[effective.id].who.toLowerCase()}${choice === USE_DEFAULT ? ' (your default)' : ''}`;
    button.title = text;
    button.setAttribute('aria-label', `${text}. Change who can see this swrl on your lists`);
}

/**
 * @param {Visibility | 'default'} a
 * @param {Visibility | 'default'} b
 */
function sameChoice(a, b) {
    return a === b || (a !== USE_DEFAULT && b !== USE_DEFAULT && a.id === b.id);
}

/**
 * @param {Swrl} swrl
 * @param {(choice: Visibility | 'default') => void} choose
 */
function openMenu(swrl, choose) {
    const entry = getListEntry(swrl.swrlID);
    if (!entry) return;
    const current = currentChoice(entry);
    const myDefault = getDefaultVisibility();
    while (menu.firstChild) menu.removeChild(menu.firstChild);

    const heading = document.createElement('p');
    heading.className = 'visibilityMenuHeading';
    heading.textContent = 'Who can see this on your lists';
    menu.appendChild(heading);

    /** @type {{choice: Visibility | 'default', icon: string, label: string, who: string}[]} */
    const items = [
        { choice: USE_DEFAULT, icon: LOOK[myDefault.id].icon, label: 'Your default', who: `${myDefault.label}: ${LOOK[myDefault.id].who.toLowerCase()}` },
        ...visibilities.map(v => ({ choice: v, icon: LOOK[v.id].icon, label: v.label, who: LOOK[v.id].who }))
    ];
    items.forEach(item => {
        const selected = sameChoice(current, item.choice);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'visibilityMenuItem';
        row.setAttribute('role', 'menuitemradio');
        row.setAttribute('aria-checked', String(selected));
        row.appendChild(icon(item.icon, 'visibilityMenuIcon'));
        const text = document.createElement('span');
        text.className = 'visibilityMenuText';
        const label = document.createElement('span');
        label.className = 'visibilityMenuLabel';
        label.textContent = item.label;
        const who = document.createElement('span');
        who.className = 'visibilityMenuWho';
        who.textContent = item.who;
        text.appendChild(label);
        text.appendChild(who);
        row.appendChild(text);
        row.appendChild(icon(CHECK, 'visibilityMenuCheck'));
        row.addEventListener('click', () => choose(item.choice));
        menu.appendChild(row);
    });

    menu.classList.remove('hidden');
    button.setAttribute('aria-expanded', 'true');
    /** @type {HTMLElement} */
    const first = menu.querySelector('[aria-checked="true"]') || menu.querySelector('.visibilityMenuItem');
    if (first) first.focus();
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKey);
}

function closeMenu() {
    menu.classList.add('hidden');
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside);
    document.removeEventListener('keydown', onKey);
}

/** @param {Event} e */
function onOutside(e) {
    // @ts-ignore
    if (!container.contains(e.target)) closeMenu();
}

/** @param {KeyboardEvent} e */
function onKey(e) {
    if (e.key === 'Escape') {
        closeMenu();
        button.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        /** @type {HTMLElement[]} */
        const rows = Array.from(menu.querySelectorAll('.visibilityMenuItem'));
        // @ts-ignore
        const at = rows.indexOf(document.activeElement);
        const next = rows[(at + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length];
        if (next) next.focus();
    }
}

/**
 * @param {string} path
 * @param {string} className
 * @return {SVGElement}
 */
function icon(path, className) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', className);
    const shape = document.createElementNS(SVG, 'path');
    shape.setAttribute('d', path);
    svg.appendChild(shape);
    return svg;
}
