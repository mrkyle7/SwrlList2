export const Collection = {
    SWRLS: 'swrls',
    SWRLERS: 'swrlers',
    RECOMMENDATIONS: 'recommendations',
    MESSAGINGTOKENS: 'messagingtokens',
    SAVEDSEARCHES: 'savedsearches'
}
Object.freeze(Collection);

/**
 * Where one user's private comments about one Swrl live:
 * swrlers/{uid}/privateComments/{swrlID}/comments/{commentID}.
 *
 * They sit under the user's own document, not on the shared swrls document,
 * so that a security rule can limit them to that user.
 *
 * @param {string} uid
 * @param {string} swrlID
 * @return {string[]} path segments, for collection(firestore, ...segments)
 */
export const privateCommentsPath = (uid, swrlID) =>
    [Collection.SWRLERS, uid, 'privateComments', swrlID, 'comments'];
