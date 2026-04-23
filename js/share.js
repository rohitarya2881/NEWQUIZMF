/* =============================================
   share.js — Quiz/Folder Sharing via JSONBin
   ============================================= */

const JSONBIN_KEY     = "$2a$10$JaUwsK9x3kbNvhFmOHXcDenDiyQYNb5wQ7VJjj0ubekAhbtmkv5ke";
const JSONBIN_BASE    = "https://api.jsonbin.io/v3/b";   // ✅ FIX: was missing "/b"
const SHARE_BASE_URL  = 'https://rohitarya2881.github.io/NEWQUIZMF/';
const MAX_PAYLOAD_KB  = 90;   // JSONBin free tier limit is 100 KB; use 90 KB as safe margin

// ══════════════════════════════════════════════
// SHARE
// ══════════════════════════════════════════════
async function shareItem(itemId) {
    const item = findItemById(itemId);
    if (!item) { showToast('Item not found', 'warning'); return; }

    const payload = _buildSharePayload(item);

    // ✅ FIX: Check payload size BEFORE uploading to avoid 413 error
    const payloadStr = JSON.stringify(payload);
    const sizeKB = new Blob([payloadStr]).size / 1024;

    if (sizeKB > MAX_PAYLOAD_KB) {
        showToast(
            `❌ Too large to share (${sizeKB.toFixed(1)} KB). Max allowed: ${MAX_PAYLOAD_KB} KB. Try removing images or reducing questions.`,
            'error'
        );
        return;
    }

    showToast(`Generating share link… (${sizeKB.toFixed(1)} KB)`, 'info');

    try {
        const resp = await fetch(JSONBIN_BASE, {   // ✅ FIX: correct endpoint
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": JSONBIN_KEY,
                "X-Bin-Private": "false"
            },
            body: payloadStr
        });

        // ✅ FIX: Parse response safely (handle non-JSON responses too)
        let data;
        try {
            data = await resp.json();
        } catch {
            throw new Error(`Server returned status ${resp.status} with non-JSON body`);
        }

        if (!resp.ok) {
            console.error("JSONBIN ERROR:", data);
            if (resp.status === 413) {
                throw new Error(`Payload too large (${sizeKB.toFixed(1)} KB). JSONBin rejected it.`);
            }
            throw new Error(data?.message || `Upload failed with status ${resp.status}`);
        }

        const binId = data.metadata?.id;
        if (!binId) throw new Error("No bin ID returned from JSONBin");

        const shareUrl = `${SHARE_BASE_URL}?import=${binId}`;
        _showShareModal(item.name, item.type, shareUrl, payload);

    } catch (err) {
        console.error(err);
        showToast('❌ Share failed: ' + err.message, 'error');
    }
}

// ══════════════════════════════════════════════
// BUILD PAYLOAD  (trimmed to reduce size)
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
            // ✅ FIX: Strip heavy/unused fields (e.g. base64 images) from each question
            questions: _trimQuestions(item.questions || [])
        };
        payload.questionCount = payload.data.questions.length;

    } else if (item.type === 'folder') {
        const quizzes = [];

        const collect = (node) => {
            if (node.type === 'quiz') {
                quizzes.push({
                    name: node.name,
                    questions: _trimQuestions(node.questions || [])
                });
            }
            (node.children || []).forEach(collect);
        };

        collect(item);

        payload.data        = { name: item.name, quizzes };
        payload.quizCount   = quizzes.length;
        payload.questionCount = quizzes.reduce((s, q) => s + q.questions.length, 0);
    }

    return payload;
}

// ✅ NEW: Keep only essential text fields; drop blobs, base64, and unknown large fields
function _trimQuestions(questions) {
    return questions.map(q => {
        const trimmed = {};

        // Keep known safe text fields
        const textFields = [
            'question', 'q', 'text',
            'options', 'choices', 'answers',
            'answer', 'correct', 'correctAnswer', 'correctIndex',
            'explanation', 'hint', 'tags', 'type', 'difficulty', 'marks', 'points'
        ];

        for (const key of textFields) {
            if (q[key] !== undefined) {
                trimmed[key] = q[key];
            }
        }

        // ✅ Drop any base64 image fields (they are huge)
        // If you want to keep image URLs (not base64), add 'imageUrl' to textFields above

        return trimmed;
    });
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
        // ✅ FIX: correct read endpoint — JSONBIN_BASE already has /b, so append /{id}/latest
        const resp = await fetch(`${JSONBIN_BASE}/${binId}/latest`, {
            headers: {
                "X-Master-Key": JSONBIN_KEY
            }
        });

        let data;
        try {
            data = await resp.json();
        } catch {
            throw new Error(`Server returned status ${resp.status} with non-JSON body`);
        }

        if (!resp.ok) {
            console.error("IMPORT ERROR:", data);
            throw new Error(data?.message || `Fetch failed with status ${resp.status}`);
        }

        const payload = data.record;

        if (payload?.type !== 'qmp_share') {
            throw new Error('Invalid share data — not a QMP share payload');
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

    // ✅ Safe encoding for onclick attributes
    const encodedUrl  = encodeURIComponent(url);
    const encodedName = encodeURIComponent(name);

    m.innerHTML = `
    <div class="modal-content">
        <h3>🔗 Share Link Ready!</h3>
        <p><b>${_escapeHtml(name)}</b></p>
        <p>${type === 'quiz' ? '📄 Quiz' : '📁 Folder'} · ${qCount} questions${extra}</p>

        <input id="shareUrlInput" value="${_escapeHtml(url)}" readonly style="width:100%;padding:8px;box-sizing:border-box;">

        <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;">
            <button onclick="_copyShareUrl()">📋 Copy</button>
            <button onclick="_shareWhatsApp('${encodedUrl}','${encodedName}')">WhatsApp</button>
            <button onclick="_shareTelegram('${encodedUrl}','${encodedName}')">Telegram</button>
            <button onclick="window.open('${_escapeHtml(url)}','_blank')">🔗 Open</button>
            <button onclick="document.getElementById('shareModal').remove()">✖ Close</button>
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

    const qCount = payload.questionCount || 0;
    const extra  = payload.itemType === 'folder' ? ` · ${payload.quizCount || 0} quizzes` : '';

    const m = document.createElement('div');
    m.className = 'modal';
    m.id = 'importModal';

    m.innerHTML = `
    <div class="modal-content">
        <h3>📦 Import Content</h3>
        <p><b>${_escapeHtml(payload.name)}</b></p>
        <p>${payload.itemType === 'quiz' ? '📄 Quiz' : '📁 Folder'} · ${qCount} questions${extra}</p>
        <p style="font-size:0.85em;color:#888;">Shared on: ${new Date(payload.sharedAt).toLocaleString()}</p>

        <div style="margin-top:10px;display:flex;gap:8px;">
            <button onclick="_doImport()">✅ Import</button>
            <button onclick="document.getElementById('importModal').remove()">Cancel</button>
        </div>
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

    // Disable button to prevent double-click
    const btn = document.querySelector('#importModal button');
    if (btn) btn.disabled = true;

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
        _pendingImportPayload = null;

        await loadFolderStructure();
        navigateToRoot();

    } catch (err) {
        console.error(err);
        showToast('❌ Import failed: ' + err.message, 'error');
        if (btn) btn.disabled = false;
    }
}

// ══════════════════════════════════════════════
// IMPORT QUIZ HELPER
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
    if (!inp) return;
    navigator.clipboard.writeText(inp.value)
        .then(() => showToast('✅ Link copied!', 'success'))
        .catch(() => {
            // Fallback for older browsers
            inp.select();
            document.execCommand('copy');
            showToast('✅ Link copied!', 'success');
        });
}

function _shareWhatsApp(encodedUrl, encodedName) {
    window.open(`https://wa.me/?text=${encodedName}%20${encodedUrl}`, '_blank');
}

function _shareTelegram(encodedUrl, encodedName) {
    window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedName}`, '_blank');
}

// ✅ NEW: Prevent XSS in modal HTML
function _escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', checkImportUrl);
