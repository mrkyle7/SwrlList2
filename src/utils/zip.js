export default { zip };

/**
 * Interleaves arrays: zip([a, b], [1, 2, 3]) -> [a, 1, b, 2, 3].
 * @template T
 * @param {...T[]} arrays
 * @return {T[]}
 */
export function zip(...arrays) {
    var merged = [];
    var index = 0;
    var shouldContinue;
    do {
        shouldContinue = false;
        for (var i = 0; i < arrays.length; i++) {
            var array = arrays[i];
            if (index < array.length) {
                shouldContinue = true;
                merged.push(array[index]);
            }
        }
        index++;
    } while (shouldContinue);
    return merged;
}