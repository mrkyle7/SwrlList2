import { Swrl } from "./swrl";
import { firestore } from "firebase";
import { Collection } from "../constants/Collection";

export class Recommendation {
    // from: fromSwrler,
    //             to: toSwrlers,
    //             message: message,
    //             swrlID: swrlID,
    //             created: firebase.firestore.FieldValue.serverTimestamp()

    /**
     * @param {string} id
     * @param {string} from
     * @param {string[]} to
     * @param {string} message
     * @param {string} swrlID
     * @param {Date} created
     * @param {Swrl} swrl
     * @param {string[]} read
     * @param {string[]} dismissed
     */
    constructor(id, from, to, message, swrlID, created, swrl, read, dismissed) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.message = message;
        this.swrlID = swrlID;
        this.created = created;
        this.swrl = swrl;
        this.read = read || [];
        this.dismissed = dismissed || [];
    }

    /**
     * @param {firestore.QueryDocumentSnapshot} doc
     * @param {firestore.Firestore} firestore
     * @return {Promise<Recommendation>}
     */
    static async fromFirestore(doc, firestore) {
        const data = doc.data();
        const swrlDoc = await firestore.collection(Collection.SWRLS).doc(data.swrlID).get();
        console.log(swrlDoc.data())
        return new Recommendation(doc.id, data.from, data.to, data.message, data.swrlID,
            data.created !== undefined && data.created != null ? data.created.toDate() : undefined,
            Swrl.fromFirestore(swrlDoc.data()),
            data.read,
            data.dismissed);
    }
}