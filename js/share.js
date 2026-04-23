/* =============================================
   share.js — Quiz/Folder Sharing via npoint.io
   ✅ No API key needed
   ✅ Free, no rate limits for small payloads
   ✅ CORS-friendly for GitHub Pages
   ============================================= */

const SHARE_BASE_URL = 'https://rohitarya2881.github.io/NEWQUIZMF/';
const NPOINT_BASE    = 'https://api.npoint.io';
const MAX_PAYLOAD_KB = 90;

// ══════════════════════════════════════════════
// SHARE
// ══════════════════════════════════════════════
async function shareItem(itemId) {
    const item = findItemById(itemId);
    if (!item) { showToast('Item not found', 'warning'); return; }

    const payload    = _buildSharePayload(item);
    const payloadStr = JSON.stringify(payload);
    const sizeKB     = new Blob([payloadStr]).size / 1024;

    if (sizeKB > MAX_PAYLOAD_KB) {
        showToast(
            `❌ Too large to share (${sizeKB.toFixed(1)} KB). Max: ${MAX_PAYLOAD_KB} KB. Remove images or reduce questions.`,
            'error'
        );
        return;
    }

    showToast(`Generating share link… (${sizeKB.toFixed(1)} KB)`, 'info');

    try {
        const resp = await fetch(`${NPOINT_BASE}/json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadStr
        });

        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Upload failed (${resp.status}): ${text.slice(0, 120)}`);
        }

        const data  = await resp.json();
        const binId = data.id;
        if (!binId) throw new Error('No ID returned from storage server');

        const shareUrl = `${SHARE_BASE_URL}?import=${binId}`;
        _showShareModal(item.name, item.type, shareUrl, payload);

    } catch (err) {
        console.error('SHARE ERROR:', err);
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
        payload.data          = { name: item.name, questions: _trimQuestions(item.questions || []) };
        payload.questionCount = payload.data.questions.length;

    } else if (item.type === 'folder') {
        const quizzes = [];
        const collect = (node) => {
            if (node.type === 'quiz') quizzes.push({ name: node.name, questions: _trimQuestions(node.questions || []) });
            (node.children || []).forEach(collect);
        };
        collect(item);

        payload.data          = { name: item.name, quizzes };
        payload.quizCount     = quizzes.length;
        payload.questionCount = quizzes.reduce((s, q) => s + q.questions.length, 0);
    }

    return payload;
}

// Keep only essential text fields; drop base64 images and unknown heavy fields
function _trimQuestions(questions) {
    const KEEP = [
        'question', 'q', 'text',
        'options', 'choices', 'answers',
        'answer', 'correct', 'correctAnswer', 'correctIndex',
        'explanation', 'hint', 'tags', 'type', 'difficulty', 'marks', 'points'
    ];
    return questions.map(q => {
        const t = {};
        for (const k of KEEP) { if (q[k] !== undefined) t[k] = q[k]; }
        return t;
    });
}

// ══════════════════════════════════════════════
// IMPORT — runs on page load if ?import= exists
// ══════════════════════════════════════════════
async function checkImportUrl() {
    const params = new URLSearchParams(window.location.search);
    const binId  = params.get('import');
    if (!binId) return;

    window.history.replaceState({}, '', window.location.pathname);
    showToast('Loading shared content…', 'info');

    try {
        const resp = await fetch(`${NPOINT_BASE}/json/${binId}`);

        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Fetch failed (${resp.status}): ${text.slice(0, 120)}`);
        }

        const payload = await resp.json();

        if (payload?.type !== 'qmp_share') throw new Error('Invalid share data');

        _showImportModal(payload);

    } catch (err) {
        console.error('IMPORT ERROR:', err);
        showToast('❌ Import failed: ' + err.message, 'error');
    }
}

// ══════════════════════════════════════════════
// SHARE MODAL
// ══════════════════════════════════════════════
function _showShareModal(name, type, url, payload) {
    document.getElementById('shareModal')?.remove();

    const qCount      = payload.questionCount || 0;
    const extra       = type === 'folder' ? ` · ${payload.quizCount} quizzes` : '';
    const encodedUrl  = encodeURIComponent(url);
    const encodedName = encodeURIComponent(name);

    const m = document.createElement('div');
    m.className = 'modal';
    m.id = 'shareModal';
    m.innerHTML = `
    <div class="modal-content">
        <h3>🔗 Share Link Ready!</h3>
        <p><b>${_esc(name)}</b></p>
        <p>${type === 'quiz' ? '📄 Quiz' : '📁 Folder'} · ${qCount} questions${extra}</p>
        <input id="shareUrlInput" value="${_esc(url)}" readonly
               style="width:100%;padding:8px;box-sizing:border-box;margin-top:8px;">
        <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;">
            <button onclick="_copyShareUrl()">📋 Copy</button>
            <button onclick="_shareWhatsApp('${encodedUrl}','${encodedName}')">WhatsApp</button>
            <button onclick="_shareTelegram('${encodedUrl}','${encodedName}')">Telegram</button>
            <button onclick="window.open('${_esc(url)}','_blank')">🔗 Open</button>
            <button onclick="document.getElementById('shareModal').remove()">✖ Close</button>
        </div>
    </div>`;
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
        <p><b>${_esc(payload.name)}</b></p>
        <p>${payload.itemType === 'quiz' ? '📄 Quiz' : '📁 Folder'} · ${qCount} questions${extra}</p>
        <p style="font-size:0.85em;color:#888;">Shared: ${new Date(payload.sharedAt).toLocaleString()}</p>
        <div style="margin-top:10px;display:flex;gap:8px;">
            <button id="importConfirmBtn" onclick="_doImport()">✅ Import</button>
            <button onclick="document.getElementById('importModal').remove()">Cancel</button>
        </div>
    </div>`;
    document.body.appendChild(m);
}

// ══════════════════════════════════════════════
// DO IMPORT
// ══════════════════════════════════════════════
async function _doImport() {
    const payload = _pendingImportPayload;
    if (!payload) return;

    const btn = document.getElementById('importConfirmBtn');
    if (btn) btn.disabled = true;

    try {
        if (payload.itemType === 'quiz') {
            await _importQuiz(payload.data, 'root', '/');

        } else if (payload.itemType === 'folder') {
            const folderId = generateId();
            await saveItem({ id: folderId, name: payload.name, type: 'folder', parentId: 'root', children: [], path: '/' + payload.name });
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
        console.error('DO IMPORT ERROR:', err);
        showToast('❌ Import failed: ' + err.message, 'error');
        if (btn) btn.disabled = false;
    }
}

async function _importQuiz(quizData, parentId, parentPath) {
    await saveItem({
        id: generateId(),
        name: quizData.name,
        type: 'quiz',
        parentId,
        questions: quizData.questions || [],
        path: parentPath + '/' + quizData.name
    });
}

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function _copyShareUrl() {
    const inp = document.getElementById('shareUrlInput');
    if (!inp) return;
    navigator.clipboard.writeText(inp.value)
        .then(() => showToast('✅ Link copied!', 'success'))
        .catch(() => { inp.select(); document.execCommand('copy'); showToast('✅ Link copied!', 'success'); });
}

function _shareWhatsApp(eu, en) { window.open(`https://wa.me/?text=${en}%20${eu}`, '_blank'); }
function _shareTelegram(eu, en)  { window.open(`https://t.me/share/url?url=${eu}&text=${en}`, '_blank'); }

function _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', checkImportUrl);
