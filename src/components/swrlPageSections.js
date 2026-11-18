import { Details } from '../model/details';
import {
    castAndCrew, peopleToShow, detailFacts, groupLinks, initials, hueFor, PEOPLE_SHOWN
} from '../model/swrlPage';

/**
 * DOM builders for the swrl page: ratings, the story and its facts, cast and
 * crew, and links. They only make elements; the page decides where they go.
 * Everything is set with textContent, never innerHTML: the details come from
 * third parties.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_LINK = 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1';
const ICON_EXTERNAL = 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5';

/** A plain icon for each kind of site a link goes to (see linkDisplay). */
const LINK_ICONS = {
    music: 'M9 18V5l10-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    podcast: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
    boardgame: 'M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM8.5 8.5h.01M15.5 15.5h.01M12 12h.01M15.5 8.5h.01M8.5 15.5h.01',
    videogame: 'M6 9h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5.2 2L15 14H9l-1.8 2A3 3 0 0 1 2 14v-1a4 4 0 0 1 4-4zM8 11v4M6 13h4M15.5 12.5h.01M17.5 14.5h.01',
    film: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4',
    book: 'M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2zM5 20a2 2 0 0 0 2 1h12v-3',
    site: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.6 5.6 3.6 9s-1.1 6.4-3.6 9M12 3c-2.5 2.6-3.6 5.6-3.6 9s1.1 6.4 3.6 9',
    link: ICON_LINK
};

/**
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @return {HTMLElement}
 */
export function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

/**
 * A small line icon.
 *
 * @param {string} path SVG path data on a 24 x 24 grid
 * @return {SVGElement}
 */
function icon(path) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'pageIcon');
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', path);
    svg.appendChild(p);
    return svg;
}

/**
 * A round badge with someone's initials, in a colour of their own.
 *
 * @param {string} name
 * @param {string} [className] extra class, usually a size
 * @return {HTMLElement}
 */
export function initialsBadge(name, className) {
    const badge = element('span', 'avatar' + (className ? ' ' + className : ''), initials(name));
    const hue = hueFor(name || '');
    badge.style.background = `hsl(${hue} 55% 86%)`;
    badge.style.color = `hsl(${hue} 55% 24%)`;
    badge.setAttribute('aria-hidden', 'true');
    return badge;
}

/**
 * A round photo, or the person's initials when there is no photo or it will not load.
 *
 * @param {string} name
 * @param {string} [imageUrl]
 * @param {string} [className] extra class, usually a size
 * @return {HTMLElement}
 */
export function avatar(name, imageUrl, className) {
    if (!imageUrl) {
        return initialsBadge(name, className);
    }
    const wrapper = element('span', 'avatar avatarPhoto' + (className ? ' ' + className : ''));
    const image = document.createElement('img');
    image.alt = '';
    image.loading = 'lazy';
    image.src = imageUrl;
    image.addEventListener('error', () => {
        wrapper.replaceWith(initialsBadge(name, className));
    });
    wrapper.appendChild(image);
    return wrapper;
}

/**
 * A titled block of the page. The title is always read by screen readers; the
 * `tabTitle` ones are hidden by the stylesheet in the tab layout, where the
 * tab already says it.
 *
 * @param {string} title
 * @param {{ tabTitle?: boolean }} [options] tabTitle: the title repeats the tab's name
 * @return {{ block: HTMLElement, body: HTMLElement, heading: HTMLElement }}
 */
export function pageBlock(title, options = {}) {
    const block = element('section', 'pageBlock');
    const heading = element('h3', 'blockTitle' + (options.tabTitle ? ' blockTitleTab' : ''), title);
    const body = element('div', 'blockBody');
    block.appendChild(heading);
    block.appendChild(body);
    return { block, body, heading };
}

/**
 * Rating tiles: the number big, the source under it.
 *
 * @param {Details} details
 * @return {HTMLElement | undefined} undefined when there are no ratings
 */
export function buildRatings(details) {
    if (details.ratings.length === 0) return undefined;
    const { block, body } = pageBlock('Ratings');
    const tiles = element('div', 'ratingTiles');
    details.ratings.forEach(rating => {
        const tile = element('div', 'ratingTile');
        tile.appendChild(element('b', 'ratingValue', rating.rating));
        tile.appendChild(element('span', 'ratingSource', rating.source));
        tiles.appendChild(tile);
    });
    body.appendChild(tiles);
    return block;
}

/**
 * The story: the overview in readable lines, then the plain facts in two
 * columns, then where it is shown (networks).
 *
 * @param {Details} details
 * @return {HTMLElement | undefined} undefined when there is nothing to say
 */
export function buildStory(details) {
    const facts = detailFacts(details);
    const hasStory = Boolean(details.overview && details.overview.trim());
    if (!hasStory && facts.length === 0 && details.networks.length === 0) return undefined;
    const { block, body } = pageBlock(hasStory ? 'The story' : 'Details', { tabTitle: true });
    if (hasStory) {
        body.appendChild(element('p', 'story', details.overview));
    }
    if (facts.length > 0 || details.networks.length > 0) {
        const list = element('dl', 'facts');
        facts.forEach(fact => {
            const item = element('div', 'fact');
            item.appendChild(element('dt', undefined, fact.label));
            item.appendChild(element('dd', undefined, fact.value));
            list.appendChild(item);
        });
        if (details.networks.length > 0) {
            const item = element('div', 'fact factWide');
            item.appendChild(element('dt', undefined, 'Shown on'));
            const names = element('dd', 'networkList');
            details.networks.forEach(network => {
                if (network.logo) {
                    const image = document.createElement('img');
                    image.className = 'networkLogo';
                    image.src = network.logo;
                    image.alt = network.name;
                    image.title = network.name;
                    names.appendChild(image);
                } else {
                    names.appendChild(element('span', 'networkName', network.name));
                }
            });
            item.appendChild(names);
            list.appendChild(item);
        }
        body.appendChild(list);
    }
    return block;
}

/**
 * Cast and crew as round faces in a grid, six to begin with and a button for
 * the rest. A person with a TMDB id opens a search for their work.
 *
 * @param {Details} details
 * @param {(person: import('../model/swrlPage').Person) => void} onPerson
 * @return {HTMLElement | undefined} undefined when there is nobody to show
 */
export function buildCast(details, onPerson) {
    const people = castAndCrew(details);
    if (people.length === 0) return undefined;
    const { block, body, heading } = pageBlock('Cast and crew', { tabTitle: true });
    const grid = element('div', 'people');
    const more = /** @type {HTMLButtonElement} */ (element('button', 'pageMoreButton'));
    more.type = 'button';
    const count = element('span', 'blockCount');
    heading.appendChild(count);
    let showAll = false;

    const render = () => {
        grid.replaceChildren();
        peopleToShow(people, showAll).forEach(person => {
            const tile = person.id !== undefined ? element('button', 'person personLinked') : element('div', 'person');
            if (tile instanceof HTMLButtonElement) {
                tile.type = 'button';
                tile.addEventListener('click', () => onPerson(person));
            }
            tile.appendChild(avatar(person.name, person.imageUrl, 'avatarLarge'));
            const text = element('span', 'personText');
            text.appendChild(element('span', 'personName', person.name));
            text.appendChild(element('span', 'personRole', person.role));
            tile.appendChild(text);
            grid.appendChild(tile);
        });
        count.textContent = people.length > PEOPLE_SHOWN && !showAll ? `${PEOPLE_SHOWN} of ${people.length}` : '';
        more.textContent = showAll ? 'Show fewer' : `Show all ${people.length} people`;
        more.setAttribute('aria-expanded', String(showAll));
    };
    more.addEventListener('click', () => {
        showAll = !showAll;
        render();
    });
    render();
    body.appendChild(grid);
    if (people.length > PEOPLE_SHOWN) {
        body.appendChild(more);
    }
    return block;
}

/**
 * Links as full-width rows, grouped by what they are for. The group names only
 * show when there is more than one group.
 *
 * @param {Details} details
 * @return {HTMLElement | undefined} undefined when there are no links
 */
export function buildLinks(details) {
    const groups = groupLinks(details.links);
    if (groups.length === 0) return undefined;
    const { block, body } = pageBlock('Links', { tabTitle: true });
    groups.forEach(group => {
        const section = element('div', 'linkGroup');
        if (groups.length > 1) {
            section.appendChild(element('p', 'linkGroupTitle', group.title));
        }
        const rows = element('div', 'linkRows');
        group.links.forEach(link => {
            const row = /** @type {HTMLAnchorElement} */ (element('a', 'linkRow'));
            row.href = link.url;
            row.target = '_blank';
            row.rel = 'noopener';
            const badge = element('span', 'linkRowIcon');
            badge.appendChild(icon(LINK_ICONS[link.icon] || ICON_LINK));
            row.appendChild(badge);
            row.appendChild(element('span', 'linkRowName', link.name));
            const external = element('span', 'linkRowExternal');
            external.appendChild(icon(ICON_EXTERNAL));
            row.appendChild(external);
            rows.appendChild(row);
        });
        section.appendChild(rows);
        body.appendChild(section);
    });
    return block;
}
