/**
 * @param {Object} object
 * @param {any} property
 */
export function assertObjectHasDefinedProperty(object, property) {
    if (!object.hasOwnProperty(property)
        || object[property] === undefined
        || object[property] === null) throw Error(`Object does not have property: ${property}`);
}