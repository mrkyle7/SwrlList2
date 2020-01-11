import { DetailGetter } from "./detailGetter";
import { Details } from "../model/details";
import { Link } from "../model/link";
const Entities = require('html-entities').XmlEntities;

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
        // to be overidden
        return new Promise(async (resolve, reject) => {
            try {
                const url = 'https://api.geekdo.com/xmlapi2/thing?id=' + id;
                const response = await fetch(url, { signal });
                const xmlData = await response.text();
                const parser = new DOMParser();
                const xmlResult = parser.parseFromString(xmlData, 'application/xml');
                const detailsItems = xmlResult.getElementsByTagName('item');
                let imageUrl = undefined;
                let designers = [];
                let genres = [];
                let title = 'Unknown';
                let platforms = [];
                let publishers = [];
                let playerCount = undefined;
                let twoPlayerRecommendation = undefined;
                let playingTime = undefined;
                let releaseYear = undefined;

                const links = [new Link(`https://${this.type}geek.com/${this.type}/${id}`,
                    'Geek URL', 'img/bgg.svg')];
                let overview = undefined;
                if (!detailsItems || detailsItems.length == 0) {
                    console.log('ID from geek returned no items!');
                } else {
                    const data = detailsItems[0];
                    title = data.getElementsByTagName('name')[0].getAttribute('value');
                    imageUrl = getImageUrl(data);
                    releaseYear = getReleaseYear(data, this.type);
                    designers = getDesigners(data);
                    genres = getGenres(data);
                    const entities = new Entities();
                    overview = data.getElementsByTagName('description')[0].textContent;
                    overview = entities.decode(overview);
                    platforms = getPlatforms(data);
                    publishers = getPublishers(data);
                    playerCount = getPlayerCount(data);
                    twoPlayerRecommendation = getTwoPlayerRecommendation(data);
                    playingTime = getPlayingTime(data);
                }
                resolve({
                    id: searchId,
                    details: new Details(id, title, imageUrl || 'img/NoPoster.jpg',
                        undefined, undefined, releaseYear,
                        genres,
                        links,
                        undefined,
                        overview,
                        [],
                        undefined,
                        [],
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        [],
                        designers,
                        platforms,
                        publishers,
                        playerCount,
                        twoPlayerRecommendation,
                        playingTime)
                })

            } catch (err) {
                console.error('Error getting details from Geekdo for ID: ' + id);
                console.error(err);
                reject(err);
            }
        });
    }
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
    if (type === 'boardgame') {
        return data.getElementsByTagName('yearpublished')
            ? data.getElementsByTagName('yearpublished')[0].getAttribute('value')
            : undefined;
    } else {
        return data.getElementsByTagName('releasedate')
            ? data.getElementsByTagName('releasedate')[0].getAttribute('value').length >= 4
                ? data.getElementsByTagName('releasedate')[0].getAttribute('value').substring(0, 4)
                : data.getElementsByTagName('releasedate')[0].getAttribute('value')
            : undefined;
    }
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