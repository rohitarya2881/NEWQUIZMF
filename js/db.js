/* =============================================
   db.js — IndexedDB Operations
   ============================================= */

let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('QuizMasterProDB', 4);

        req.onupgradeneeded = e => {
            const d = e.target.result;
            if (!d.objectStoreNames.contains('folderStructure')) {
                const s = d.createObjectStore('folderStructure', { keyPath: 'id' });
                s.createIndex('parentId', 'parentId', { unique: false });
                s.createIndex('type', 'type', { unique: false });
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
