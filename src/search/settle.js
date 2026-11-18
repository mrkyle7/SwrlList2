/**
 * Runs a search's sources side by side and keeps whatever comes back: one
 * source failing (a site down, a request blocked) must not hide the others'
 * results, but the person should be told what is missing.
 *
 * @template T
 * @param {{name: string, run: () => Promise<T[]>}[]} sources each named for people, e.g. "albums"
 * @param {AbortSignal} [signal] a source that fails because the search was superseded is not a failure
 * @return {Promise<{results: T[][], failed: string[]}>} results in source order ([] for a failed one)
 */
export async function settle(sources, signal) {
    const outcomes = await Promise.allSettled(sources.map(source => source.run()));
    /** @type {string[]} */
    const failed = [];
    const results = outcomes.map((outcome, i) => {
        if (outcome.status === 'fulfilled') return outcome.value;
        if (!(signal && signal.aborted)) {
            console.error(`Search of ${sources[i].name} failed`);
            console.error(outcome.reason);
            failed.push(sources[i].name);
        }
        return [];
    });
    return { results, failed };
}

/**
 * Fetches JSON, treating anything but a 2xx answer as a failure.
 *
 * @param {string} url
 * @param {AbortSignal} [signal]
 * @return {Promise<any>}
 */
export async function getJson(url, signal) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`${url.split('?')[0]} answered HTTP ${response.status}`);
    return response.json();
}
