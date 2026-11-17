#!/usr/bin/env node
// Read-only: explains why a friend's swrls do or don't show in "Friends'
// recent activity" on the Discover tab, item by item. Writes nothing.
//
// Usage (same set-up as migrate-list-entries.js: Node 22, `(cd functions &&
// npm ci)`, `gcloud auth application-default login`):
//   ./scripts/explain-friend-activity.js "<your display name>" "<friend's display name>" [watch|read|listen|play]
const path = require('path');
const functionsModules = { paths: [path.join(__dirname, '..', 'functions')] };
const { initializeApp } = require(require.resolve('firebase-admin/app', functionsModules));
const { getFirestore } = require(require.resolve('firebase-admin/firestore', functionsModules));

const CATEGORIES = { watch: 1, read: 2, listen: 3, play: 4 };
const NAMES = { 1: 'watch', 2: 'read', 3: 'listen', 4: 'play' };
const STRIP_SIZE = 12;

async function main() {
    const [meName, friendName, categoryName] = process.argv.slice(2);
    if (!meName || !friendName) {
        console.error('Usage: ./scripts/explain-friend-activity.js "<your name>" "<friend\'s name>" [watch|read|listen|play]');
        process.exit(1);
    }
    initializeApp({ projectId: 'swrl-1118' });
    const db = getFirestore();
    const find = async (name) => {
        const found = await db.collection('swrlers').where('displayName', '==', name).get();
        if (found.size !== 1) throw new Error(`Found ${found.size} people called "${name}"`);
        return found.docs[0].id;
    };
    const me = await find(meName);
    const friend = await find(friendName);
    const areFriends = (await db.doc(`swrlers/${me}/friends/${friend}`).get()).exists;
    const friendDefault = (await db.doc(`swrlers/${friend}`).get()).data().defaultVisibility || 'friends (not set)';
    console.log(`Friends: ${areFriends ? 'yes' : 'NO, so only their public swrls can show'}`);
    console.log(`${friendName}'s default visibility: ${friendDefault}\n`);

    const entries = async (uid) => (await db.collection(`swrlers/${uid}/listEntries`).get()).docs.map(d => d.data());
    const mine = new Map((await entries(me)).map(e => [e.swrlID, e]));
    const theirs = await entries(friend);
    const wanted = categoryName ? CATEGORIES[categoryName] : undefined;

    const rows = [];
    for (const entry of theirs) {
        if (wanted !== undefined && entry.category !== wanted) continue;
        const my = mine.get(entry.swrlID);
        let reason = '';
        if (typeof entry.category !== 'number') reason = `category is stored as ${JSON.stringify(entry.category)}, not a number`;
        else if (entry.visibility === 'private') reason = 'they keep it private';
        else if (entry.visibility !== 'public' && entry.visibility !== 'friends') reason = `visibility is ${JSON.stringify(entry.visibility)}`;
        else if (entry.visibility === 'friends' && !areFriends) reason = 'friends only, and you are not friends';
        else if (entry.deleted || !(entry.later || entry.done || entry.loved)) reason = 'not on their list any more';
        else if (my && my.deleted) reason = 'you dismissed or deleted it (possibly years ago)';
        else if (my && my.done) reason = 'you have finished it';
        else if (my && my.later) reason = 'it is on your list';
        const updated = entry.updated && entry.updated.toDate ? entry.updated.toDate() : undefined;
        rows.push({ title: entry.details && entry.details.title, category: NAMES[entry.category] || entry.category, reason, updated });
    }
    const shown = rows.filter(r => !r.reason).sort((a, b) => (b.updated || 0) - (a.updated || 0));
    const hidden = rows.filter(r => r.reason);
    console.log(`Could show (newest first; the row shows up to ${STRIP_SIZE} per category, across all friends, minus any in the taste row):`);
    shown.forEach(r => console.log(`  ${r.category.padEnd(6)} ${(r.updated ? r.updated.toISOString().slice(0, 10) : 'no date').padEnd(10)} ${r.title}`));
    console.log(`\nHidden (${hidden.length}):`);
    const byReason = new Map();
    hidden.forEach(r => byReason.set(r.reason, [...(byReason.get(r.reason) || []), r]));
    for (const [reason, list] of byReason) {
        console.log(`  ${reason}: ${list.length}`);
        list.slice(0, 5).forEach(r => console.log(`      ${r.category.padEnd(6)} ${r.title}`));
        if (list.length > 5) console.log(`      ... and ${list.length - 5} more`);
    }
}

main().catch(error => { console.error(error.message || error); process.exit(1); });
