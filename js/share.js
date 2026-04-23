/* =============================================
   share.js — Quiz/Folder Sharing via JSONBin
   ============================================= */

const JSONBIN_KEY  = "$2a$10$JaUwsK9x3kbNvhFmOHXcDenDiyQYNb5wQ7VJjj0ubekAhbtmkv5ke";
const JSONBIN_BASE = "https://api.jsonbin.io/v3/";
const SHARE_BASE_URL = 'https://rohitarya2881.github.io/NEWQUIZMF/';

// ══════════════════════════════════════════════
// SHARE
// ══════════════════════════════════════════════
async function shareItem(itemId) {
    const item = findItemById(itemId);
    if (!item) { showToast('Item not found', 'warning'); return; }

    const payload = _buildSharePayload(item);
    showToast('Generating share link…', 'info');

    try {
        const resp = await fetch(JSONBIN_BASE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": JSONBIN_KEY,
                "X-Bin-Private": "false"
            },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (!resp.ok) {
            console.error("JSONBIN ERROR:", data);
            throw new Error("Upload failed");
        }

        const binId = data.metadata?.id;
        if (!binId) throw new Error("No bin ID returned");

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
        version: '1.0',
        type: 'qmp_share',
        itemType: item.type,
        name: item.name,
        sharedAt: new Date().toISOString(),
        data: null
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
// IMPORT
// ══════════════════════════════════════════════
async function checkImportUrl() {
    const params = new URLSearchParams(window.location.search);
    const binId  = params.get('import');
    if (!binId) return;

    window.history.replaceState({}, '', window.location.pathname);
    showToast('Loading shared content…', 'info');

    try {
        const resp = await fetch(`${JSONBIN_BASE}/${binId}/latest`, {
            headers: {
                "X-Master-Key": JSONBIN_KEY
            }
        });

        const data = await resp.json();

        if (!resp.ok) {
            console.error("IMPORT ERROR:", data);
            throw new Error("Fetch failed");
        }

        const payload = data.record;

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
// SHARE MODAL
// ══════════════════════════════════════════════
function _showShareModal(name, type, url, payload) {
    document.getElementById('shareModal')?.remove();

    const qCount = payload.questionCount || 0;
    const extra  = type === 'folder' ? ` · ${payload.quizCount} quizzes` : '';

    const m = document.createElement('div');
    m.className = 'modal';
    m.id = 'shareModal';

    m.innerHTML = `
    <div class="modal-content">
        <h3>🔗 Share Link Ready!</h3>
        <p><b>${name}</b></p>
        <p>${type === 'quiz' ? '📄 Quiz' : '📁 Folder'} · ${qCount} questions${extra}</p>

        <input id="shareUrlInput" value="${url}" readonly style="width:100%;padding:8px;">

        <div style="margin-top:10px;">
            <button onclick="_copyShareUrl()">📋 Copy</button>
            <button onclick="_shareWhatsApp('${encodeURIComponent(url)}','${encodeURIComponent(name)}')">WhatsApp</button>
            <button onclick="_shareTelegram('${encodeURIComponent(url)}','${encodeURIComponent(name)}')">Telegram</button>
            <button onclick="window.open('${url}','_blank')">Open</button>
        </div>
    </div>
    `;

    document.body.appendChild(m);
}

// ══════════════════════════════════════════════
// IMPORT MODAL
// ══════════════════════════════════════════════
let _pendingImportPayload = null;

function _showImportModal(payload) {
    document.getElementById('importModal')?.remove();
    _pendingImportPayload = payload;

    const m = document.createElement('div');
    m.className = 'modal';
    m.id = 'importModal';

    m.innerHTML = `
    <div class="modal-content">
        <h3>📦 Import Content</h3>
        <p><b>${payload.name}</b></p>

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

        showToast('✅ Imported!', 'success');
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

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function _copyShareUrl() {
    const inp = document.getElementById('shareUrlInput');
    navigator.clipboard.writeText(inp.value)
        .then(() => showToast('✅ Copied!', 'success'));
}

function _shareWhatsApp(url, name) {
    window.open(`https://wa.me/?text=${name}%20${url}`, '_blank');
}

function _shareTelegram(url, name) {
    window.open(`https://t.me/share/url?url=${url}&text=${name}`, '_blank');
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', checkImportUrl);
