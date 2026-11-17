import { describe, it, expect } from 'vitest';
import { genreCounts, genresToShow, matchesGenres, searchGenres } from '../src/model/genres';

describe('genres', function () {
    const counts = genreCounts([['Drama', 'Comedy'], ['drama', 'Thriller'], ['Comedy', 'Drama'], [], undefined, ['Drama ', 'Horror', '']]);
    it('are counted once per swrl, ignoring case, most common first', function () {
        expect(counts).to.deep.equal([
            { genre: 'Drama', count: 4 }, { genre: 'Comedy', count: 2 }, { genre: 'Horror', count: 1 }, { genre: 'Thriller', count: 1 }
        ]);
        expect(genreCounts([['Drama', 'drama']])).to.deep.equal([{ genre: 'Drama', count: 1 }]);
    });
    it('match a swrl with any chosen genre', function () {
        expect(matchesGenres(['Drama', 'Comedy'], [])).to.equal(true);
        expect(matchesGenres(['Drama'], ['comedy', 'DRAMA'])).to.equal(true);
        expect(matchesGenres(['Horror'], ['Comedy', 'Drama'])).to.equal(false);
        expect(matchesGenres(undefined, ['Drama'])).to.equal(false);
    });
    it('show the common few plus anything chosen', function () {
        expect(genresToShow(counts, [], 2).map(c => c.genre)).to.deep.equal(['Drama', 'Comedy']);
        expect(genresToShow(counts, ['thriller'], 2).map(c => c.genre)).to.deep.equal(['Drama', 'Comedy', 'Thriller']);
    });
    it('can be searched', function () {
        expect(searchGenres(counts, 'RR').map(c => c.genre)).to.deep.equal(['Horror']);
        expect(searchGenres(counts, '  ')).to.have.length(4);
    });
});
