import { describe, it, expect } from 'vitest';
// Category first, as the app loads it: it builds the searches, and readSearch needs it
import '../src/constants/Category';
import { booksFromSearch, SEARCH_FIELDS } from '../src/search/readSearch';
import { BOOK } from '../src/constants/Type';

describe('booksFromSearch', () => {
    it('builds a card from the search result alone, keyed by ISBN as before', () => {
        const [book] = booksFromSearch([{
            key: '/works/OL893415W', title: 'Dune', isbn: ['9780441013593', '0441013597'],
            author_name: ['Frank Herbert'], first_publish_year: 1965, cover_i: 11481354,
            subject: ['Science fiction', 'Deserts', 'Ecology']
        }]);
        expect(book.swrlID).toBe('OPENLIBRARY-ISBN_9780441013593');
        expect(book.type).toBe(BOOK);
        expect(book.details.id).toBe('9780441013593');
        expect(book.details.title).toBe('Dune');
        expect(book.details.author).toBe('Frank Herbert');
        expect(book.details.releaseYear).toBe('1965');
        expect(book.details.imageUrl).toBe('https://covers.openlibrary.org/b/id/11481354-L.jpg');
        expect(book.details.genres).toEqual(['Science fiction', 'Deserts', 'Ecology']);
        expect(book.details.links[0].url).toBe('https://openlibrary.org/works/OL893415W');
    });
    it('leaves out results without an ISBN and fills gaps', () => {
        const books = booksFromSearch([{ title: 'No ISBN' }, { title: '', isbn: ['123'] }]);
        expect(books).toHaveLength(1);
        expect(books[0].details.title).toBe('No title');
        expect(books[0].details.author).toBe('Unknown');
        expect(books[0].details.imageUrl).toBe('img/NoPoster.jpg');
        expect(books[0].details.genres).toEqual([]);
    });
    it('asks Open Library for every field it uses', () => {
        ['isbn', 'author_name', 'first_publish_year', 'cover_i', 'subject'].forEach(field =>
            expect(SEARCH_FIELDS.split(',')).toContain(field));
    });
});
