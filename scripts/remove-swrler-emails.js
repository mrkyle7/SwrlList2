#!/usr/bin/env node
// One-off migration: removes the legacy `email` field from every swrlers doc.
// Profiles are readable by all users, so emails must not be stored there.
//
// Usage (needs admin credentials, e.g. `gcloud auth application-default login`):
//   (cd functions && npm ci)   # once, installs firebase-admin
//   ./scripts/remove-swrler-emails.js [--dry-run]
const path = require('path');
// firebase-admin is a dependency of functions/, not of the root package.
const functionsModules = { paths: [path.join(__dirname, '..', 'functions')] };
const { initializeApp } = require(require.resolve('firebase-admin/app', functionsModules));
const { getFirestore, FieldValue } = require(require.resolve('firebase-admin/firestore', functionsModules));

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
