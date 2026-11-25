/**
 * Every word that depends on a category, in one place: the verbs people use
 * with each category's things, and the words for "in progress". Tested in
 * test/categoryWords.test.js. (server.js keeps its own copy of `verb` for link
 * previews: it cannot import this file.)
 *
 * For places to eat, "in progress" is a table booked: on my list means I want
 * to go, booked means a table is booked, done means I have been.
 */

/**
 * @typedef {Object} CategoryWords
 * @property {string} verb with a thing: "You should watch Dune"
 * @property {string} past "Alice watched it"
 * @property {string} doneIt what someone did with it: "watched it", "ate there"
 * @property {string} doIt what someone wants to do with it: "watch it", "eat there"
 * @property {string} now the state, on a pill or a button that is on: "Watching", "Booked"
 * @property {string} start the button that turns it on: "Start watching", "Mark as booked"
 * @property {string} caption the state in a sentence: "2 watching", "2 booked"
 * @property {string} isStarted one person in that state: "is watching it", "has booked it"
 * @property {string} areStarted several people: "are watching it", "have booked it"
 * @property {string} reminder why the picker suggests something started: "Carry on watching"
 * @property {string} pickQuestion the picker's title: "What should you watch?"
 */

/** @type {Object<number, CategoryWords>} by category id */
const WORDS = {
    1: {
        verb: 'watch', past: 'watched', doneIt: 'watched it', doIt: 'watch it',
        now: 'Watching', start: 'Start watching', caption: 'watching',
        isStarted: 'is watching it', areStarted: 'are watching it',
        reminder: 'Carry on watching', pickQuestion: 'What should you watch?'
    },
    2: {
        verb: 'read', past: 'read', doneIt: 'read it', doIt: 'read it',
        now: 'Reading', start: 'Start reading', caption: 'reading',
        isStarted: 'is reading it', areStarted: 'are reading it',
        reminder: 'Carry on reading', pickQuestion: 'What should you read?'
    },
    3: {
        verb: 'listen to', past: 'listened to', doneIt: 'listened to it', doIt: 'listen to it',
        now: 'Listening', start: 'Start listening', caption: 'listening to',
        isStarted: 'is listening to it', areStarted: 'are listening to it',
        reminder: 'Carry on listening to', pickQuestion: 'What should you listen to?'
    },
    4: {
        verb: 'play', past: 'played', doneIt: 'played it', doIt: 'play it',
        now: 'Playing', start: 'Start playing', caption: 'playing',
        isStarted: 'is playing it', areStarted: 'are playing it',
        reminder: 'Carry on playing', pickQuestion: 'What should you play?'
    },
    6: {
        verb: 'eat at', past: 'ate at', doneIt: 'ate there', doIt: 'eat there',
        now: 'Booked', start: 'Mark as booked', caption: 'booked',
        isStarted: 'has booked it', areStarted: 'have booked it',
        reminder: 'You have a table booked', pickQuestion: 'Where should you eat?'
    }
};

/** For a category without words of its own. */
const FALLBACK = {
    verb: 'try', past: 'tried', doneIt: 'tried it', doIt: 'try it',
    now: 'In progress', start: 'Start', caption: 'on',
    isStarted: 'is on it', areStarted: 'are on it',
    reminder: 'Carry on', pickQuestion: 'What should you try?'
};

/**
 * @param {number} categoryID
 * @return {CategoryWords}
 */
export function categoryWords(categoryID) {
    return WORDS[categoryID] || FALLBACK;
}
