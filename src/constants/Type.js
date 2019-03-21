export default { Type };

export var Type = {
    FILM: 1,
    TV: 2,
    BOOK: 3,
    PODCAST: 4,
    ALBUM: 5,
    BOARDGAME: 6,
    VIDEOGAME: 7,
    properties: {
        1: { name: "FILM" },
        2: { name: "TV" },
        3: { name: "BOOK" },
        4: { name: "PODCAST" },
        5: { name: "ALBUM" },
        6: { name: "BOARDGAME", geekType: 'boardgame' },
        7: { name: "VIDEO GAME", geekType: 'videogame' }
    }
}
Object.freeze(Type);