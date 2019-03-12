export default { zip };

export function zip() {
    var merged = [];
    var index = 0;
    var shouldContinue;
    do {
        shouldContinue = false;
        for (var i = 0; i < arguments.length; i++) {
            var array = arguments[i];
            if (index < array.length) {
                shouldContinue = true;
                merged.push(array[index]);
            }
        }
        index++;
    } while (shouldContinue);
    return merged;
}