/* =============================================
   share.js — Quiz/Folder Sharing via npoint.io
   (No API key, no CORS issues)
   ============================================= */

const SHARE_BASE_URL = 'https://rohitarya2881.github.io/NEWQUIZMF/';

// ══════════════════════════════════════════════
// SHARE — Upload and get link
// ══════════════════════════════════════════════
async function shareItem(itemId) {
    const item = findItemById(itemId);
    if (!item) { showToast('Item not found', 'warning'); return; }

    const payload = _buildSharePayload(item);
    showToast('Generating share link…', 'info');

    try {
        const resp = await fetch('https://api.npoint.io', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) throw new Error('Upload failed');

        const data = await resp.json();

        // npoint returns key like: { key: "abcd1234" }
        const binId = data.key;
        if (!binId) throw new Error('No ID returned');

        const shareUrl = `${SHARE_BASE_URL}?import=${binId}`;
        _showShareModal(item.name, item.type, shareUrl, payload);

    } catch (err) {
        console.error(err);
        showToast('❌ Share failed: ' + err.message, 'error');
    }
}

// ══════════════════════════════════════════════
// BUILD PAYLOAD
// ══════════════════════════════════════════════
function _buildSharePayload(item) {
    const payload = {
        version:   '1.0',
        type:      'qmp_share',
        itemType:  item.type,
        name:      item.name,
        sharedAt:  new Date().toISOString(),
        data:      null
    };

    if (item.type === 'quiz') {
        payload.data = {
            name: item.name,
            questions: item.questions || []
        };
        payload.questionCount = item.questions?.length || 0;

    } else if (item.type === 'folder') {
        const quizzes = [];

        const collect = (node) => {
            if (node.type === 'quiz') {
                quizzes.push({
                    name: node.name,
                    questions: node.questions || []
                });
            }
            (node.children || []).forEach(collect);
        };

        collect(item);

        payload.data = { name: item.name, quizzes };
        payload.quizCount = quizzes.length;
        payload.questionCount = quizzes.reduce((s,q) => s + q.questions.length, 0);
    }

    return payload;
}

// ══════════════════════════════════════════════
// IMPORT — Load from URL
// ══════════════════════════════════════════════
async function checkImportUrl() {
    const params = new URLSearchParams(window.location.search);
    const binId  = params.get('import');
    if (!binId) return;

    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);

    showToast('Loading shared content…', 'info');

    try {
        const resp = await fetch(`https://api.npoint.io/${binId}`);

        if (!resp.ok) throw new Error('Fetch failed');

        const payload = await resp.json();

        if (payload?.type !== 'qmp_share') {
            throw new Error('Invalid share data');
        }

        _showImportModal(payload);

    } catch (err) {
        console.error(err);
        showToast('❌ Import failed: ' + err.message, 'error');
    }
}

// ══════════════════════════════════════════════
// IMPORT MODAL
// ══════════════════════════════════════════════
let _pendingImportPayload = null;

function _showImportModal(payload) {
    document.getElementById('importModal')?.remove();
    _pendingImportPayload = payload;

    const isFolder = payload.itemType === 'folder';
    const qCount   = payload.questionCount || 0;
    const quizzes  = payload.data?.quizzes || [];

    const m = document.createElement('div');
    m.className = 'modal';
    m.id = 'importModal';

    m.innerHTML = `
    <div class="modal-content">
        <h3>📦 Import Content</h3>
        <p><b>${payload.name}</b></p>
        <p>${isFolder ? quizzes.length + ' quizzes · ' : ''}${qCount} questions</p>

        <button onclick="_doImport()">✅ Import</button>
        <button onclick="document.getElementById('importModal').remove()">Cancel</button>
    </div>
    `;

    document.body.appendChild(m);
}

// ══════════════════════════════════════════════
// DO IMPORT
// ══════════════════════════════════════════════
async function _doImport() {
    const payload = _pendingImportPayload;
    if (!payload) return;

    try {
        if (payload.itemType === 'quiz') {
            await _importQuiz(payload.data, 'root', '/');

        } else if (payload.itemType === 'folder') {
            const folderId = generateId();

            const folder = {
                id: folderId,
                name: payload.name,
                type: 'folder',
                parentId: 'root',
                children: [],
                path: '/' + payload.name
            };

            await saveItem(folder);

            for (const quiz of payload.data.quizzes) {
                await _importQuiz(quiz, folderId, '/' + payload.name);
            }
        }

        showToast('✅ Imported successfully!', 'success');
        document.getElementById('importModal')?.remove();

        await loadFolderStructure();
        navigateToRoot();

    } catch (err) {
        console.error(err);
        showToast('❌ Import failed', 'error');
    }
}

// ══════════════════════════════════════════════
// IMPORT QUIZ
// ══════════════════════════════════════════════
async function _importQuiz(quizData, parentId, parentPath) {
    const quiz = {
        id: generateId(),
        name: quizData.name,
        type: 'quiz',
        parentId,
        questions: quizData.questions || [],
        path: parentPath + '/' + quizData.name
    };

    await saveItem(quiz);
}
