/* =============================================
   db.js — IndexedDB Operations
   ============================================= */

let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('QuizMasterProDB', 5);

        req.onupgradeneeded = e => {
            const d = e.target.result;
            if (!d.objectStoreNames.contains('folderStructure')) {
                const s = d.createObjectStore('folderStructure', { keyPath: 'id' });
                s.createIndex('parentId', 'parentId', { unique: false });
                s.createIndex('type', 'type', { unique: false });
            }
            // Journal store — key/value pairs, key = string like 'goals', 'logs' etc.
            if (!d.objectStoreNames.contains('journal')) {
                d.createObjectStore('journal', { keyPath: 'key' });
            }
        };

        req.onsuccess = e => { db = e.target.result; resolve(db); };
        req.onerror   = e => reject(e.target.error);
    });
}

function loadFolderStructure() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['folderStructure'], 'readonly');
        tx.objectStore('folderStructure').getAll().onsuccess = e => {
            folderStructure = buildHierarchy(e.target.result);
            resolve(folderStructure);
        };
        tx.onerror = e => reject(e.target.error);
    });
}

function buildHierarchy(items) {
    const root = { id:'root', name:'Root', type:'folder', children:[], path:'/' };
    const map  = new Map(); map.set('root', root);

    items.forEach(item => {
        if (item.id !== 'root')
            map.set(item.id, { ...item, children: item.type === 'folder' ? [] : undefined });
    });

    items.forEach(item => {
        if (item.id !== 'root' && item.parentId) {
            const p = map.get(item.parentId);
            if (p && p.type === 'folder') p.children.push(map.get(item.id));
        }
    });

    return root;
}

function saveItem(item) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['folderStructure'], 'readwrite');
        tx.objectStore('folderStructure').put(item).onsuccess = () => resolve();
        tx.onerror = e => reject(e.target.error);
    });
}

function deleteItemFromDB(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['folderStructure'], 'readwrite');
        tx.objectStore('folderStructure').delete(id).onsuccess = () => resolve();
        tx.onerror = e => reject(e.target.error);
    });
}

function clearAllData() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['folderStructure'], 'readwrite');
        tx.objectStore('folderStructure').clear().onsuccess = () => resolve();
        tx.onerror = e => reject(e.target.error);
    });
}

// ── Journal DB helpers ────────────────────────
function jnlGet(key) {
    return new Promise(resolve => {
        const tx  = db.transaction(['journal'], 'readonly');
        const req = tx.objectStore('journal').get(key);
        req.onsuccess = e => resolve(e.target.result?.value ?? null);
        req.onerror   = () => resolve(null);
    });
}

function jnlSet(key, value) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['journal'], 'readwrite');
        tx.objectStore('journal').put({ key, value }).onsuccess = () => resolve();
        tx.onerror = e => reject(e.target.error);
    });
}

// ── Study Notes & Bookmarks ───────────────────
// Stored in journal store under key 'studyNotes'
// studyNotes = { [itemId]: { note, bookmark:{q,total,date}, sessions:[...] } }

async function getStudyNotes() {
    const d = await jnlGet('studyNotes');
    return d || {};
}

async function saveStudyNote(itemId, note) {
    const all = await getStudyNotes();
    if (!all[itemId]) all[itemId] = {};
    all[itemId].note = note;
    all[itemId].noteDate = new Date().toISOString();
    await jnlSet('studyNotes', all);
}

async function saveStudyBookmark(quizId, questionIndex, total, score, totalQ) {
    const all = await getStudyNotes();
    if (!all[quizId]) all[quizId] = {};
    all[quizId].bookmark = {
        q:     questionIndex + 1,   // 1-based
        total,
        score,
        totalQ,
        date:  new Date().toISOString()
    };
    // Save session
    if (!all[quizId].sessions) all[quizId].sessions = [];
    all[quizId].sessions.unshift({
        date:   new Date().toISOString(),
        fromQ:  1,
        toQ:    questionIndex + 1,
        score,
        total:  totalQ
    });
    if (all[quizId].sessions.length > 5) all[quizId].sessions = all[quizId].sessions.slice(0, 5);
    await jnlSet('studyNotes', all);
}

async function clearStudyBookmark(quizId) {
    const all = await getStudyNotes();
    if (all[quizId]) { delete all[quizId].bookmark; await jnlSet('studyNotes', all); }
}
