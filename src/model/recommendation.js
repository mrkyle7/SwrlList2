import { Swrl } from "./swrl";
import { firestore } from "firebase/app";
import { Collection } from "../constants/Collection";

export class Recommendation {
    
    /** @type {Swrl} */
    swrl = undefined;

    /** @type {firebase.User} */
    fromSwrler = undefined;

    /** @type {string[]} */
    toSwrlers = undefined

    /**
     * @param {string} id
     * @param {string} from
     * @param {string[]} to
     * @param {string} message
     * @param {string} swrlID
     * @param {Date} created
     * @param {string[]} read
     * @param {string[]} dismissed
     */
    constructor(id, from, to, message, swrlID, created, read, dismissed) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.message = message;
        this.swrlID = swrlID;
        this.created = created;
        this.read = read || [];
        this.dismissed = dismissed || [];
    }

    /**
     * @param {firestore.QueryDocumentSnapshot} doc
     * @param {firestore.Firestore} firestore
     * @return {Recommendation}
     */
    static fromFirestore(doc, firestore) {
        const data = doc.data();
        // const swrlDoc = await firestore.collection(Collection.SWRLS).doc(data.swrlID).get();
        return new Recommendation(doc.id, data.from, data.to, data.message, data.swrlID,
            data.created !== undefined && data.created != null ? data.created.toDate() : undefined,
            data.read,
            data.dismissed);
    }
}