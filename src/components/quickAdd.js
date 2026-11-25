import { getQuickAdd } from '../listeners/listEntries';
import { QUICK_MENU, QUICK_WHEEL, pickOption, wheelPositions } from '../model/quickAdd';

/**
 * The search button at the bottom right of phones and tablets, for adding
 * something quickly. What it does is chosen on Settings (model/quickAdd.js):
 *
 * - Search everything: straight there.
 * - Choose a category: the page dims and the categories stack above the
 *   button, each with its name; tap one.
 * - Swirl: hold the button and the categories swirl out round it; slide to
 *   one and let go (on the button itself: search everything; anywhere else:
 *   nothing). A quick tap leaves the swirl open to tap instead, and the
 *   keyboard opens it with the first category focused.
 *
 * Either way it lands on that category's search with the cursor in the box.
 * The category icons are the bottom bar's (#phoneNav), so they always match.
 */

const button = /** @type {HTMLButtonElement} */ (document.getElementById('quickAddButton'));
const backdrop = document.getElementById('quickAddBackdrop');
const menu = document.getElementById('quickAddMenu');
const wheel = document.getElementById('quickAddWheel');
const wheelLabel = document.getElementById('quickAddWheelLabel');

const WHEEL_RADIUS = 165;
/** Held at least this long, or moved this far, counts as a hold-and-slide rather than a tap. */
const HOLD_MS = 280;
const MOVE_PX = 12;

/** @typedef {{key: string, label: string, colour?: string}} QuickOption */

/** @type {{all: () => void, category: (name: string) => void}} */
let go;
/** @type {QuickOption[]} */
let categories = [];
/** @type {'menu' | 'wheel' | undefined} */
let openAs;

/**
 * Wires the button up. Call once.
 *
 * @param {readonly {name: string, displayName: string, colour: string}[]} categoryList the categories, in order
 * @param {{all: () => void, category: (name: string) => void}} actions
 */
export function initQuickAdd(categoryList, actions) {
    go = actions;
    categories = categoryList.map(category => ({ key: category.name, label: category.displayName, colour: category.colour }));
    buildMenu();
    buildWheel();
    button.addEventListener('click', onClick);
    button.addEventListener('pointerdown', onPointerDown);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && openAs) {
            close();
            button.focus();
        }
    });
}

/**
 * An option's icon: the bottom bar's for a category, a magnifier for everything.
 *
 * @param {string} key
 * @return {HTMLElement}
 */
function icon(key) {
    const holder = document.createElement('span');
    holder.className = 'quickAddIcon';
    const source = document.querySelector(`.phoneNavItem[data-nav="${key === 'all' ? 'search' : key}"] svg`);
    if (source) holder.appendChild(source.cloneNode(true));
    return holder;
}

/**
 * @param {QuickOption} option
 * @param {string} className
 * @return {HTMLButtonElement}
 */
function optionButton(option, className) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = className;
    item.setAttribute('role', 'menuitem');
    item.dataset.key = option.key;
    if (option.colour) item.style.setProperty('--option-colour', option.colour);
    item.addEventListener('click', () => choose(option.key));
    return item;
}

function buildMenu() {
    const options = [{ key: 'all', label: 'Search everything' }, ...categories];
    menu.replaceChildren(...options.map(option => {
        const item = optionButton(option, 'quickAddMenuItem');
        const label = document.createElement('span');
        label.className = 'quickAddMenuLabel';
        label.textContent = option.label;
        item.append(label, icon(option.key));
        return item;
    }));
}

function buildWheel() {
    const positions = wheelPositions(categories.length, WHEEL_RADIUS);
    wheel.replaceChildren(...categories.map((option, i) => {
        const item = optionButton(option, 'quickAddWheelItem');
        item.setAttribute('aria-label', `Search ${option.label}`);
        item.title = option.label;
        item.style.setProperty('--x', `${positions[i].x}px`);
        item.style.setProperty('--y', `${positions[i].y}px`);
        item.appendChild(icon(option.key));
        item.addEventListener('focus', () => showLabel(option.label));
        item.addEventListener('pointerenter', () => showLabel(option.label));
        return item;
    }));
}

/** @param {string} key 'all' or a category's name */
function choose(key) {
    close();
    if (key === 'all') go.all();
    else go.category(key);
}

/**
 * @param {'menu' | 'wheel'} as
 * @param {boolean} [focusFirst] for the keyboard
 */
function open(as, focusFirst) {
    openAs = as;
    document.body.classList.add('quickAddOpen');
    button.classList.add('open');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', 'Close');
    backdrop.classList.remove('hidden');
    const panel = as === 'menu' ? menu : wheel;
    panel.classList.remove('hidden');
    // next frame, so the swirl animates in
    requestAnimationFrame(() => panel.classList.add('shown'));
    if (as === 'wheel') showLabel('Slide to a category');
    if (focusFirst) {
        const first = /** @type {HTMLElement | null} */ (panel.querySelector('button'));
        if (first) first.focus();
    }
}

function close() {
    openAs = undefined;
    document.body.classList.remove('quickAddOpen');
    button.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Search to add');
    backdrop.classList.add('hidden');
    [menu, wheel].forEach(panel => panel.classList.remove('shown'));
    menu.classList.add('hidden');
    wheel.classList.add('hidden');
    wheelLabel.classList.add('hidden');
    highlight(undefined);
}

/** @param {string} text */
function showLabel(text) {
    wheelLabel.textContent = text;
    wheelLabel.classList.remove('hidden');
}

/** @param {number | 'centre' | undefined} pick */
function highlight(pick) {
    [...wheel.children].forEach((item, i) => item.classList.toggle('active', pick === i));
    button.classList.toggle('active', pick === 'centre');
}

/** @param {MouseEvent} e */
function onClick(e) {
    const mode = getQuickAdd();
    if (openAs) {
        close();
        return;
    }
    if (mode === QUICK_MENU) {
        open('menu', e.detail === 0);
    } else if (mode === QUICK_WHEEL) {
        // pointers are handled on pointerdown; this is the keyboard
        if (e.detail === 0) open('wheel', true);
    } else {
        go.all();
    }
}

/** @type {{x: number, y: number, at: number, moved: boolean, pick: number | 'centre' | undefined, id: number} | undefined} */
let drag;

/** @param {PointerEvent} e */
function onPointerDown(e) {
    if (getQuickAdd() !== QUICK_WHEEL || openAs || !e.isPrimary) return;
    e.preventDefault();
    swallowClick = true;
    const box = button.getBoundingClientRect();
    drag = { x: box.left + box.width / 2, y: box.top + box.height / 2, at: Date.now(), moved: false, pick: 'centre', id: e.pointerId };
    button.setPointerCapture(e.pointerId);
    open('wheel');
    button.addEventListener('pointermove', onPointerMove);
    button.addEventListener('pointerup', onPointerUp);
    button.addEventListener('pointercancel', onPointerCancel);
}

/** @param {PointerEvent} e */
function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > MOVE_PX) drag.moved = true;
    const pick = pickOption(dx, dy, wheelPositions(categories.length, WHEEL_RADIUS));
    if (pick !== drag.pick) {
        drag.pick = pick;
        highlight(pick);
        showLabel(pick === 'centre' ? 'Search everything' : pick === undefined ? 'Slide to a category' : categories[pick].label);
        if (pick !== undefined && navigator.vibrate) navigator.vibrate(8);
    }
}

/** @param {PointerEvent} e */
function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const { moved, at, pick } = drag;
    endDrag();
    if (!moved && Date.now() - at < HOLD_MS) {
        // a tap: leave the swirl open to tap a category (or the button to close)
        showLabel('Tap a category');
        return;
    }
    if (pick === 'centre') choose('all');
    else if (pick !== undefined) choose(categories[pick].key);
    else close();
}

function onPointerCancel() {
    endDrag();
    close();
}

function endDrag() {
    button.removeEventListener('pointermove', onPointerMove);
    button.removeEventListener('pointerup', onPointerUp);
    button.removeEventListener('pointercancel', onPointerCancel);
    drag = undefined;
    highlight(undefined);
}

/** The click that follows a press the swirl handled is not a click of its own. */
let swallowClick = false;
button.addEventListener('click', (e) => {
    if (swallowClick) {
        swallowClick = false;
        e.stopImmediatePropagation();
    }
}, { capture: true });
