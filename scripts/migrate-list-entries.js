#!/usr/bin/env node
// Migration for friends and list visibility (docs/friends-and-visibility-plan.md).
//
// Membership used to live on the shared swrls/{id} doc as arrays of uids
// (later, done, deleted, loved, isRecommended). It now lives in one doc per
// user per swrl, swrlers/{uid}/listEntries/{swrlID}, and the shared doc keeps
// only the counts (laterCount, doneCount, lovedCount).
//
// Usage (needs admin credentials, e.g. `gcloud auth application-default login`,
// and Node 22):
//   (cd functions && npm ci)   # once, installs firebase-admin
//   ./scripts/migrate-list-entries.js [--dry-run] [--recount] [--strip-arrays]
//
//   (default)      create every user's missing entry from the legacy arrays
//                  (never overwriting an existing entry), then recount
//                  laterCount / doneCount / lovedCount for every swrl
//   --dry-run      report only; writes nothing (combine with any mode)
//   --recount      only redo the counts, from the entries
//   --strip-arrays remove the legacy arrays from every swrl doc. Run this
//                  last, once no old client is left.
//
// Set FIRESTORE_EMULATOR_HOST to run against the emulator instead.
//
// Note: the listEntryCounts Cloud Function also reacts to every entry this
// script creates. If the function is deployed, run `--recount` again a minute
// after the script finishes, so the counts are the absolute values.
const path = require('path');
// firebase-admin is a dependency of functions/, not of the root package.
const functionsDir = path.join(__dirname, '..', 'functions');
const functionsModules = { paths: [functionsDir] };
const { initializeApp } = require(require.resolve('firebase-admin/app', functionsModules));
const { getFirestore, FieldValue } = require(require.resolve('firebase-admin/firestore', functionsModules));
const { entriesFromLegacySwrl, addToCounts, legacyArraysPresent } = require(path.join(functionsDir, 'listEntries.js'));

const BATCH_SIZE = 400;
const ALREADY_EXISTS = 6;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const recountOnly = args.includes('--recount');
const stripArrays = args.includes('--strip-arrays');
const known = ['--dry-run', '--recount', '--strip-arrays'];
const unknown = args.filter(a => !known.includes(a));
if (unknown.length > 0 || (recountOnly && stripArrays)) {
    console.error(`Usage: ${path.basename(__filename)} [--dry-run] [--recount | --strip-arrays]`);
    process.exit(2);
}

/**
 * Runs operations in batches of at most BATCH_SIZE.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {Array<(batch: FirebaseFirestore.WriteBatch) => void>} operations
 */
async function inBatches(db, operations) {
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
        const batch = db.batch();
        operations.slice(i, i + BATCH_SIZE).forEach(operation => operation(batch));
        await batch.commit();
    }
}

/**
 * Creates the missing entries. Uses create(), which fails on an existing doc,
 * so an entry written by the app in the meantime is never overwritten.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @returns {Promise<{created: number, existing: number, planned: Object[]}>}
 */
async function createEntries(db) {
    const swrlerSnapshot = await db.collection('swrlers').get();
    /** @type {Object<string, string>} */
    const defaults = {};
    swrlerSnapshot.forEach(s => { defaults[s.id] = s.data().defaultVisibility; });

    const swrlSnapshot = await db.collection('swrls').get();
    let existing = 0;
    const missing = [];
    for (const swrlDoc of swrlSnapshot.docs) {
        const entries = entriesFromLegacySwrl(swrlDoc.data(), swrlDoc.id, defaults);
        if (entries.length === 0) continue;
        const refs = entries.map(e => db.doc(`swrlers/${e.uid}/listEntries/${swrlDoc.id}`));
        const found = await db.getAll(...refs);
        found.forEach((snapshot, i) => {
            if (snapshot.exists) existing++;
            else missing.push({ ref: refs[i], data: entries[i].data });
        });
    }
    console.log(`${swrlSnapshot.size} swrls: ${missing.length} entries to create, ${existing} already exist`);
    if (dryRun) return { created: 0, existing, planned: missing.map(m => m.data) };

    let created = 0;
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        const chunk = missing.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        chunk.forEach(m => batch.create(m.ref, m.data));
        try {
            await batch.commit();
            created += chunk.length;
        } catch (err) {
            if (err.code !== ALREADY_EXISTS) throw err;
            // Something in this chunk appeared since we looked: do it one by one.
            for (const m of chunk) {
                try {
                    await m.ref.create(m.data);
                    created++;
                } catch (e) {
                    if (e.code !== ALREADY_EXISTS) throw e;
                    existing++;
                }
            }
        }
    }
    console.log(`Created ${created} entries`);
    return { created, existing, planned: [] };
}

/**
 * Sets laterCount / doneCount / lovedCount on every swrl from the entries.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {Object[]} [extraEntries] entries a dry run would have created
 */
async function recount(db, extraEntries) {
    const totals = {};
    const entrySnapshot = await db.collectionGroup('listEntries').get();
    entrySnapshot.forEach(s => addToCounts(totals, s.id, s.data()));
    (extraEntries || []).forEach(e => addToCounts(totals, e.swrlID, e));

    const swrlSnapshot = await db.collection('swrls').get();
    const operations = [];
    for (const swrlDoc of swrlSnapshot.docs) {
        const counts = totals[swrlDoc.id] || { laterCount: 0, doneCount: 0, lovedCount: 0 };
        const data = swrlDoc.data();
        if (data.laterCount === counts.laterCount && data.doneCount === counts.doneCount
            && data.lovedCount === counts.lovedCount) continue;
        operations.push(batch => batch.set(swrlDoc.ref, counts, { merge: true }));
    }
    if (!dryRun) await inBatches(db, operations);
    console.log(`${dryRun ? 'Would update' : 'Updated'} counts on ${operations.length} of ${swrlSnapshot.size} swrls `
        + `(from ${entrySnapshot.size} entries${extraEntries && extraEntries.length ? ` plus ${extraEntries.length} that would be created` : ''})`);
}

/**
 * Removes the legacy uid arrays from every swrl doc.
 *
 * @param {FirebaseFirestore.Firestore} db
 */
async function strip(db) {
    const swrlSnapshot = await db.collection('swrls').get();
    const operations = [];
    for (const swrlDoc of swrlSnapshot.docs) {
        const present = legacyArraysPresent(swrlDoc.data());
        if (present.length === 0) continue;
        const removal = {};
        present.forEach(name => { removal[name] = FieldValue.delete(); });
        operations.push(batch => batch.update(swrlDoc.ref, removal));
    }
    if (!dryRun) await inBatches(db, operations);
    console.log(`${dryRun ? 'Would strip' : 'Stripped'} legacy arrays from ${operations.length} of ${swrlSnapshot.size} swrls`);
}

async function main() {
    initializeApp({ projectId: 'swrl-1118' });
    const db = getFirestore();
    if (stripArrays) {
        await strip(db);
    } else if (recountOnly) {
        await recount(db);
    } else {
        const { planned } = await createEntries(db);
        await recount(db, planned);
    }
}

main().catch(err => { console.error(err); process.exit(1); });
