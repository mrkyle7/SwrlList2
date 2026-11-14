// One-off migration: removes the legacy `email` field from every swrlers doc.
// Profiles are readable by all users, so emails must not be stored there.
//
// Usage (needs admin credentials, e.g. `gcloud auth application-default login`):
//   cd functions && node ../scripts/remove-swrler-emails.js [--dry-run]
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const dryRun = process.argv.includes('--dry-run');

async function main() {
    initializeApp({ projectId: 'swrl-1118' });
    const db = getFirestore();
    const snapshot = await db.collection('swrlers').get();
    let batch = db.batch();
    let pending = 0;
    let total = 0;
    for (const docSnapshot of snapshot.docs) {
        if (!('email' in docSnapshot.data())) continue;
        total++;
        if (dryRun) continue;
        batch.update(docSnapshot.ref, { email: FieldValue.delete() });
        if (++pending === 400) {
            await batch.commit();
            batch = db.batch();
            pending = 0;
        }
    }
    if (pending > 0) await batch.commit();
    console.log(`${dryRun ? 'Would remove' : 'Removed'} email from ${total} of ${snapshot.size} swrlers`);
}

main().catch(err => { console.error(err); process.exit(1); });
