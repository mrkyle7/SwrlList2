import { zip } from '../utils/zip';

/** How long to wait, after the first source answers, for others to join the first batch. */
export const GRACE_MS = 400;

/**
 * Runs several searches side by side and hands their results over in batches
 * as they arrive, so the fastest sources show at once instead of everything
 * waiting for the slowest:
 *
 * - The first batch is every source that answered within `graceMs` of the
 *   first one, interleaved (one from each in turn), the order a full search
 *   would have.
 * - After that, each source that answers is a batch of its own, to be added
 *   below what is showing, so nothing on screen moves.
 * - Resolves, once every source has answered, with everything interleaved
 *   (the same as waiting for all of them) and the sources that failed.
 *
 * A source that throws counts as answering with nothing.
 *
 * @template T
 * @param {(() => Promise<{results: T[], failed?: string[]}>)[]} runners
 * @param {(batch: T[], first: boolean) => void} [onBatch]
 * @param {number} [graceMs]
 * @return {Promise<{results: T[], failed: string[]}>}
 */
export function runProgressively(runners, onBatch, graceMs = GRACE_MS) {
    return new Promise(resolve => {
        /** @type {(T[] | undefined)[]} */
        const answers = runners.map(() => undefined);
        /** @type {string[]} */
        const failed = [];
        let remaining = runners.length;
        let firstSent = false;
        /** @type {ReturnType<typeof setTimeout> | undefined} */
        let graceTimer;
        const sendFirst = () => {
            if (firstSent) return;
            firstSent = true;
            clearTimeout(graceTimer);
            const arrived = answers.filter(answer => answer !== undefined);
            if (onBatch) onBatch(zip(...arrived), true);
        };
        if (remaining === 0) {
            resolve({ results: [], failed: [] });
            return;
        }
        runners.forEach((run, i) => {
            Promise.resolve()
                .then(run)
                .catch(() => ({ results: [], failed: [] }))
                .then(found => {
                    answers[i] = (found && found.results) || [];
                    failed.push(...((found && found.failed) || []));
                    remaining--;
                    if (!firstSent) {
                        if (graceTimer === undefined) graceTimer = setTimeout(sendFirst, graceMs);
                        if (remaining === 0) sendFirst();
                    } else if (onBatch) {
                        onBatch(answers[i], false);
                    }
                    if (remaining === 0) {
                        resolve({ results: zip(...answers), failed });
                    }
                });
        });
    });
}
