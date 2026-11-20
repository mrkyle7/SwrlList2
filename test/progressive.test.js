import { describe, it, expect, vi, afterEach } from 'vitest';
import { runProgressively } from '../src/search/progressive';

/** A source that answers with `results` after `ms`. */
const after = (ms, results, failed) => () => new Promise(resolve => setTimeout(() => resolve({ results, failed }), ms));

describe('runProgressively', () => {
    afterEach(() => vi.useRealTimers());

    it('sends the sources that answer close together as one interleaved batch, then the rest one by one', async () => {
        vi.useFakeTimers();
        const batches = [];
        const done = runProgressively([
            after(100, ['w1', 'w2']),
            after(300, ['r1']),
            after(2000, ['p1', 'p2'])
        ], (batch, first) => batches.push([first, batch]), 400);
        await vi.advanceTimersByTimeAsync(499);
        expect(batches).toEqual([]);
        await vi.advanceTimersByTimeAsync(1);
        expect(batches).toEqual([[true, ['w1', 'r1', 'w2']]]);
        await vi.advanceTimersByTimeAsync(1500);
        expect(batches[1]).toEqual([false, ['p1', 'p2']]);
        const result = await done;
        // the final answer is the same as waiting for everything
        expect(result.results).toEqual(['w1', 'r1', 'p1', 'w2', 'p2']);
    });

    it('sends the first batch at once when everything has answered', async () => {
        vi.useFakeTimers();
        const batches = [];
        const done = runProgressively([after(10, ['a']), after(20, ['b'])], (batch, first) => batches.push([first, batch]), 400);
        await vi.advanceTimersByTimeAsync(20);
        expect(batches).toEqual([[true, ['a', 'b']]]);
        await done;
    });

    it('treats a source that fails as answering nothing, and collects what failed', async () => {
        vi.useFakeTimers();
        const done = runProgressively([
            () => Promise.reject(new Error('down')),
            after(5, ['x'], ['albums'])
        ], undefined, 400);
        await vi.advanceTimersByTimeAsync(10);
        expect(await done).toEqual({ results: ['x'], failed: ['albums'] });
    });

    it('copes with no sources', async () => {
        expect(await runProgressively([], undefined)).toEqual({ results: [], failed: [] });
    });
});
