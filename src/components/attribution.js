import { Attribution } from '../constants/Attribution';

/**
 * Shows the "Powered by ..." credit for the data on screen, or hides it when
 * the data's provider does not ask for one.
 *
 * @param {string} containerId the view's own attribution element
 * @param {Attribution | undefined} attribution
 */
export function showAttribution(containerId, attribution) {
    hideAttribution(containerId);
    const container = document.getElementById(containerId);
    if (!attribution) {
        return;
    }
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
    container.appendChild(link);

    if (attribution.notice) {
        const notice = document.createElement('p');
        notice.className = 'attributionNotice';
        notice.innerText = attribution.notice;
        container.appendChild(notice);
    }
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
