import { DetailGetter } from "./detailGetter";
import { Details } from "../model/details";
import { Link } from "../model/link";
import { decode } from 'html-entities';

export class GeekDetailGetter extends DetailGetter {
    /**
     * @param {string} type
     */
    constructor(type) {
        super();
        this.type = type;
    }

    /**
     * @param {string} id
     * @param {AbortSignal} signal
     * @param {number} searchId
     * @return {Promise<{id: number, details: Details}>}
     */
    get(id, signal, searchId) {
        return fetchGeekItems([id], signal)
            .then(items => {
                if (items.length === 0) {
                    // Reject rather than resolve with placeholder details: the
                    // caller writes whatever we return over the saved Swrl.
                    throw new Error('Geek returned no item for ID: ' + id);
                }
                return { id: searchId, details: detailsFromGeekItem(items[0], this.type) };
            })
            .catch(err => {
                console.error('Error getting details from Geek for ID: ' + id);
                console.error(err);
                throw err;
            });
    }
}

/**
 * Fetch one or more "things" from BoardGameGeek in a single request.
 *
 * BGG only answers authenticated requests, so this goes through our own
 * server (see /api/v1/geek in server.js), which holds the API token.
 *
 * @param {string[]} ids at most 20
 * @param {AbortSignal} signal
 * @return {Promise<Element[]>}
 */
export async function fetchGeekItems(ids, signal) {
    if (ids.length === 0) {
        return [];
    }
    const url = `/api/v1/geek/thing?id=${ids.join(',')}`;
    return Array.from(await fetchGeekXml(url, signal).then(xml => xml.getElementsByTagName('item')));
}

/**
 * @param {string} url
 * @param {AbortSignal} signal
 * @return {Promise<Document>}
 */
export async function fetchGeekXml(url, signal) {
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(`Geek request failed with HTTP ${response.status}`);
    }
    const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
    if (xml.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Geek response was not valid XML');
    }
    return xml;
}

/**
 * @param {Element} data an <item> element from the Geek "thing" API
 * @param {string} type boardgame | videogame
 * @return {Details}
 */
export function detailsFromGeekItem(data, type) {
    const id = data.getAttribute('id');
    const names = data.getElementsByTagName('name');
    const descriptions = data.getElementsByTagName('description');
    const overview = descriptions.length > 0
        ? decode(descriptions[0].textContent, { level: 'xml' })
        : undefined;
    const links = [new Link(`https://${type}geek.com/${type}/${id}`,
        'Geek URL', 'img/bgg.svg')];

    return new Details(id,
        names.length > 0 ? names[0].getAttribute('value') : 'Unknown',
        getImageUrl(data) || 'img/NoPoster.jpg',
        undefined, undefined, getReleaseYear(data, type),
        getGenres(data),
        links,
        undefined,
        overview,
        [],
        [],
        undefined,
        [],
        [],
        undefined,
        undefined,
        undefined,
        undefined,
        [],
        getDesigners(data),
        getPlatforms(data),
        getPublishers(data),
        getPlayerCount(data),
        getTwoPlayerRecommendation(data),
        getPlayingTime(data));
}

/**
 * @param {Element} data
 */
function getImageUrl(data) {
    const images = data.getElementsByTagName('image');
    if (images && images.length > 0) {
        return images[0].textContent;
    } else {
        return undefined;
    }
}

/**
 * @param {Element} data
 * @param {string} type
 */
function getReleaseYear(data, type) {
    const elements = data.getElementsByTagName(type === 'boardgame' ? 'yearpublished' : 'releasedate');
    if (elements.length === 0) {
        return undefined;
    }
    const value = elements[0].getAttribute('value');
    return value && value.length >= 4 ? value.substring(0, 4) : value;
}

/**
 * @param {Element} data
 */
function getPlayerCount(data) {
    const minPlayerCount = data.getElementsByTagName('minplayers');
    const maxPlayerCount = data.getElementsByTagName('maxplayers');
    const polls = data.getElementsByTagName('poll');

    if (minPlayerCount.length === 0 || maxPlayerCount.length === 0) {
        return undefined;
    }

    const minPlayerCountNum = minPlayerCount[0].getAttribute('value');
    const maxPlayerCountNum = maxPlayerCount[0].getAttribute('value');
    let playerCount = undefined;

    if (minPlayerCountNum === maxPlayerCountNum) {
        playerCount = maxPlayerCountNum;
    } else {
        playerCount = `${minPlayerCountNum}-${maxPlayerCountNum}`;
    }

    if (polls.length > 0) {
        const bestPlayers = [];
        for (let i = 0; i < polls.length; i++) {
            const poll = polls[i];
            if (poll.getAttribute('name') === 'suggested_numplayers') {
                const results = poll.getElementsByTagName('results');
                for (let r = 0; r < results.length; r++) {
                    const result = results[r];
                    const numplayers = result.getAttribute('numplayers');
                    const resultDetails = result.getElementsByTagName('result');
                    let best = 0;
                    let recommended = 0;
                    let notRecommended = 0;
                    for (let d = 0; d < resultDetails.length; d++) {
                        const detail = resultDetails[d];
                        switch (detail.getAttribute('value')) {
                            case 'Best':
                                best = parseInt(detail.getAttribute('numvotes'));
                                break;
                            case 'Recommended':
                                recommended = parseInt(detail.getAttribute('numvotes'));
                                break;
                            case 'Not Recommended':
                                notRecommended = parseInt(detail.getAttribute('numvotes'));
                                break;
                            default:
                                break;
                        }
                    }
                    if (best >= recommended && best >= notRecommended) {
                        bestPlayers.push(numplayers);
                    }
                }
            }
        }
        if (bestPlayers.length > 0) {
            playerCount += ` Best: ${bestPlayers.join(',')}`
        }
    }
    return playerCount;
}

/**
 * @param {Element} data
 */
function getPlayingTime(data) {
    const minPlayingTime = data.getElementsByTagName('minplaytime');
    const maxPlayingTime = data.getElementsByTagName('maxplaytime');

    if (minPlayingTime.length === 0 || maxPlayingTime.length === 0) {
        return undefined;
    }

    let playingTime = undefined;

    const minPlayingTimeMins = minPlayingTime[0].getAttribute('value');
    const maxPlayingTimeMins = maxPlayingTime[0].getAttribute('value');

    if (minPlayingTimeMins === maxPlayingTimeMins) {
        playingTime = `${maxPlayingTimeMins} mins`;
    } else {
        playingTime = `${minPlayingTimeMins}-${maxPlayingTimeMins} mins`;
    }

    return playingTime;
}

/**
 * @param {Element} data
 */
function getTwoPlayerRecommendation(data) {
    const polls = data.getElementsByTagName('poll');

    let recommendation = undefined;

    if (polls.length > 0) {
        for (let i = 0; i < polls.length; i++) {
            const poll = polls[i];
            if (poll.getAttribute('name') === 'suggested_numplayers') {
                const results = poll.getElementsByTagName('results');
                for (let r = 0; r < results.length; r++) {
                    const result = results[r];
                    const numplayers = result.getAttribute('numplayers');
                    if (numplayers === '2') {
                        const resultDetails = result.getElementsByTagName('result');
                        let best = 0;
                        let recommended = 0;
                        let notRecommended = 0;
                        for (let d = 0; d < resultDetails.length; d++) {
                            const detail = resultDetails[d];
                            switch (detail.getAttribute('value')) {
                                case 'Best':
                                    best = parseInt(detail.getAttribute('numvotes'));
                                    break;
                                case 'Recommended':
                                    recommended = parseInt(detail.getAttribute('numvotes'));
                                    break;
                                case 'Not Recommended':
                                    notRecommended = parseInt(detail.getAttribute('numvotes'));
                                    break;
                                default:
                                    break;
                            }
                        }
                        const max = Math.max(best, recommended, notRecommended);
                        if (max === 0) {
                            recommendation = 'No Votes';
                        } else if (best === max) {
                            recommendation = 'Best';
                        } else if (recommended === max) {
                            recommendation = 'Recommended';
                        } else if (notRecommended === max) {
                            recommendation = 'Not Recommended';
                        }
                    }
                }
            }
        }

    }
    return recommendation;
}

/**
 * @param {Element} data
 */
function getDesigners(data) {
    const links = data.getElementsByTagName('link');
    if (links.length == 0) {
        console.log('ID from geek returned no links!');
        return undefined;
    }

    const designers = [];
    for (let i = 0; i < links.length; i++) {
        const element = links[i];
        if (element.getAttribute('type') === 'boardgamedesigner') {
            designers.push(element.getAttribute('value'))
        }
    }
    return designers;
}

/**
 * @param {Element} data
 */
function getPlatforms(data) {
    const links = data.getElementsByTagName('link');
    if (links.length == 0) {
        console.log('ID from geek returned no links!');
        return undefined;
    }

    const platforms = [];
    for (let i = 0; i < links.length; i++) {
        const element = links[i];
        if (element.getAttribute('type') === 'videogameplatform') {
            platforms.push(element.getAttribute('value'))
        }
    }
    return platforms;
}

/**
 * @param {Element} data
 */
function getPublishers(data) {
    const links = data.getElementsByTagName('link');
    if (links.length == 0) {
        console.log('ID from geek returned no links!');
        return undefined;
    }

    const publishers = [];
    for (let i = 0; i < links.length; i++) {
        const element = links[i];
        if (element.getAttribute('type') === 'videogamepublisher') {
            publishers.push(element.getAttribute('value'))
        }
    }
    return publishers;
}

/**
 * @param {Element} data
 */
function getGenres(data) {
    const links = data.getElementsByTagName('link');
    if (links.length == 0) {
        console.log('ID from geek returned no links!');
        return [];
    }

    const genres = [];
    for (let i = 0; i < links.length; i++) {
        const element = links[i];
        if (element.getAttribute('type') === 'boardgamecategory'
            || element.getAttribute('type') === 'boardgamemechanic'
            || element.getAttribute('type') === 'videogamegenre'
            || element.getAttribute('type') === 'videogametheme'
        ) {
            genres.push(element.getAttribute('value'))
        }
    }
    return genres;
}