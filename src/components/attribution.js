import { Attribution } from '../constants/Attribution';

/**
 * Builds the "Powered by ..." credit for a data provider.
 *
 * @param {Attribution} attribution
 * @return {HTMLElement}
 */
export function createAttribution(attribution) {
    const element = document.createElement('div');
    element.className = 'attribution';

    const link = document.createElement('a');
    link.className = 'attributionLink';
    link.href = attribution.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.title = attribution.name;

    if (!attribution.logoSaysPoweredBy) {
        const poweredBy = document.createElement('span');
        poweredBy.className = 'attributionPoweredBy';
        poweredBy.innerText = 'Powered by';
        link.appendChild(poweredBy);
    }

    const logo = document.createElement('img');
    logo.className = attribution.logoOnDark ? 'attributionLogo attributionLogoOnDark' : 'attributionLogo';
    logo.src = attribution.logo;
    logo.alt = attribution.logoSaysPoweredBy ? `Powered by ${attribution.name}` : attribution.name;
    link.appendChild(logo);
    element.appendChild(link);

    if (attribution.notice) {
        const notice = document.createElement('p');
        notice.className = 'attributionNotice';
        notice.innerText = attribution.notice;
        element.appendChild(notice);
    }
    return element;
}

/**
 * Shows the credit for the data on screen in a view's own attribution slot,
 * or empties the slot when the data's provider does not ask for one.
 *
 * The slot must sit inside the view's scrolling container: the views are
 * absolutely positioned, so anything beside them lands on top of them.
 *
 * @param {string} containerId the view's attribution slot
 * @param {Attribution | undefined} attribution
 */
export function showAttribution(containerId, attribution) {
    hideAttribution(containerId);
    if (!attribution) {
        return;
    }
    const container = document.getElementById(containerId);
    container.appendChild(createAttribution(attribution));
    container.classList.remove('hidden');
}

/**
 * @param {string} containerId
 */
export function hideAttribution(containerId) {
    const container = document.getElementById(containerId);
    container.classList.add('hidden');
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}

/**
 * Puts the credit at the very end of a list that is filled in stages (more
 * items, a "show more" button), replacing any credit already in it.
 *
 * @param {HTMLElement} list
 * @param {Attribution | undefined} attribution
 */
export function appendAttribution(list, attribution) {
    list.querySelectorAll(':scope > .attribution').forEach(existing => list.removeChild(existing));
    if (attribution) {
        list.appendChild(createAttribution(attribution));
    }
}
