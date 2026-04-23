/* =============================================
   share.js — Quiz/Folder Sharing via JSONBin
   ============================================= */

const JSONBIN_KEY    = '$2a$10$JaUwsK9x3kbNvhFmOHXcDenDiyQYNb5wQ7VJjj0ubekAhbtmkv5ke';
const JSONBIN_BASE   = 'https://api.jsonbin.io/v3/b';
const SHARE_BASE_URL = 'https://rohitarya2881.github.io/NEWQUIZMF/';

// ══════════════════════════════════════════════
// SHARE — Upload to JSONBin and get link
// ══════════════════════════════════════════════
async function shareItem(itemId) {
    const item = findItemById(itemId);
    if (!item) { showToast('Item not found', 'warning'); return; }

    // Build share payload
    const payload = _buildSharePayload(item);
    showToast('Generating share link…', 'info');

    try {
        const resp = await fetch(JSONBIN_BASE, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'X-Master-Key':  JSONBIN_KEY,
                'X-Bin-Name':    `qmp_${item.name.substring(0,30)}`,
                'X-Bin-Private': 'false'
            },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) throw new Error('Upload failed: ' + resp.status);
        const data = await resp.json();
        const binId = data.metadata?.id;
        if (!binId) throw new Error('No bin ID returned');

        const shareUrl = `${SHARE_BASE_URL}?import=${binId}`;
        _showShareModal(item.name, item.type, shareUrl, payload);

    } catch (err) {
        console.error('Share error:', err);
        showToast('Share failed: ' + err.message, 'error');
    }
}

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
            name:      item.name,
            questions: item.questions || []
        };
        payload.questionCount = item.questions?.length || 0;
    } else if (item.type === 'folder') {
        // Include all quizzes inside folder recursively
        const quizzes = [];
        const collect = (node) => {
            if (node.type === 'quiz') quizzes.push({ name: node.name, questions: node.questions || [] });
            (node.children || []).forEach(collect);
        };
        collect(item);
        payload.data      = { name: item.name, quizzes };
        payload.quizCount = quizzes.length;
        payload.questionCount = quizzes.reduce((s,q) => s + q.questions.length, 0);
    }
    return payload;
}

// ── Share modal ───────────────────────────────
function _showShareModal(name, type, url, payload) {
    document.getElementById('shareModal')?.remove();
    const qCount = payload.questionCount || 0;
    const extra  = type === 'folder' ? ` · ${payload.quizCount} quizzes` : '';

    const m = document.createElement('div');
    m.className = 'modal'; m.id = 'shareModal';
    m.innerHTML = `<div class="modal-content" style="max-width:480px;">
        <div class="modal-header" style="border-color:#27ae60;">
            <h3 style="color:#27ae60;">🔗 Share Link Ready!</h3>
            <button class="close-btn" onclick="document.getElementById('shareModal').remove()">✕</button>
        </div>
        <div style="background:rgba(39,174,96,0.08);border:1px solid rgba(39,174,96,0.2);
            border-radius:8px;padding:12px 14px;margin-bottom:14px;">
            <div style="font-weight:700;font-size:0.95rem;margin-bottom:3px;">${escHtml(name)}</div>
            <div style="font-size:0.78rem;color:#aaa;">${type === 'quiz' ? '📄 Quiz' : '📁 Folder'} · ${qCount} questions${extra}</div>
        </div>

        <!-- Share URL box -->
        <div style="position:relative;margin-bottom:14px;">
            <input type="text" id="shareUrlInput" value="${escHtml(url)}" readonly
                style="width:100%;padding:10px 44px 10px 12px;border:2px solid #27ae60;
                border-radius:8px;font-size:0.78rem;font-family:monospace;
                background:#f9f9f9;box-sizing:border-box;color:#333;">
            <button onclick="_copyShareUrl()" title="Copy"
                style="position:absolute;right:6px;top:50%;transform:translateY(-50%);
                background:none;border:none;font-size:1.1rem;cursor:pointer;">📋</button>
        </div>

        <!-- Action buttons -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
            <button class="primary-btn" onclick="_copyShareUrl()" style="justify-content:center;">
                📋 Copy Link
            </button>
            <button class="secondary-btn" onclick="_shareWhatsApp('${encodeURIComponent(url)}','${encodeURIComponent(name)}')"
                style="justify-content:center;background:#25D366;color:white;border-color:#25D366;">
                <i class="fab fa-whatsapp"></i> WhatsApp
            </button>
            <button class="secondary-btn" onclick="_shareTelegram('${encodeURIComponent(url)}','${encodeURIComponent(name)}')"
                style="justify-content:center;background:#0088cc;color:white;border-color:#0088cc;">
                <i class="fab fa-telegram"></i> Telegram
            </button>
            <button class="secondary-btn" onclick="window.open('${escHtml(url)}','_blank')"
                style="justify-content:center;">
                🔗 Open Link
            </button>
        </div>
        <div style="font-size:0.72rem;color:#aaa;text-align:center;">
            Anyone with this link can import this ${type} into their QuizMaster Pro
        </div>
    </div>`;
    document.body.appendChild(m);
}

function _copyShareUrl() {
    const inp = document.getElementById('shareUrlInput');
    if (!inp) return;
    navigator.clipboard.writeText(inp.value)
        .then(() => showToast('✅ Link copied to clipboard!', 'success'))
        .catch(() => { inp.select(); document.execCommand('copy'); showToast('✅ Copied!', 'success'); });
}

function _shareWhatsApp(encodedUrl, encodedName) {
    window.open(`https://wa.me/?text=${encodedName}%20-%20QuizMaster%20Pro%20Quiz%0A${encodedUrl}`, '_blank');
}

function _shareTelegram(encodedUrl, encodedName) {
    window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedName}%20-%20QuizMaster%20Pro%20Quiz`, '_blank');
}

// ══════════════════════════════════════════════
// IMPORT — Check URL on load, fetch from JSONBin
// ══════════════════════════════════════════════
async function checkImportUrl() {
    const params = new URLSearchParams(window.location.search);
    const binId  = params.get('import');
    if (!binId) return;

    // Clean URL without reloading
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    showToast('Loading shared content…', 'info');

    try {
        const resp = await fetch(`${JSONBIN_BASE}/${binId}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_KEY }
        });
        if (!resp.ok) throw new Error('Could not fetch shared content');
        const data    = await resp.json();
        const payload = data.record;

        if (payload?.type !== 'qmp_share') throw new Error('Invalid share format');
        _showImportModal(payload, binId);

    } catch (err) {
        console.error('Import error:', err);
        showToast('Could not load shared content: ' + err.message, 'error');
    }
}

// Store payload globally so import button can access it safely
let _pendingImportPayload = null;

function _showImportModal(payload, binId) {
    document.getElementById('importModal')?.remove();
    _pendingImportPayload = payload;  // store safely, no inline JSON
    const isFolder = payload.itemType === 'folder';
    const qCount   = payload.questionCount || 0;
    const quizzes  = payload.data?.quizzes || [];

    const m = document.createElement('div');
    m.className = 'modal'; m.id = 'importModal';
    m.innerHTML = `<div class="modal-content" style="max-width:460px;">
        <div class="modal-header" style="border-color:#4a6fa5;">
            <h3 style="color:#4a6fa5;">📦 Shared Content Received</h3>
            <button class="close-btn" onclick="document.getElementById('importModal').remove()">✕</button>
        </div>

        <div style="background:rgba(74,111,165,0.08);border:1px solid rgba(74,111,165,0.2);
            border-radius:8px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
            <span style="font-size:2rem;">${isFolder ? '📁' : '📄'}</span>
            <div>
                <div style="font-weight:700;font-size:1rem;">${escHtml(payload.name)}</div>
                <div style="font-size:0.78rem;color:#aaa;margin-top:3px;">
                    ${isFolder ? `${quizzes.length} quizzes · ` : ''}${qCount} questions
                    · Shared ${new Date(payload.sharedAt).toLocaleDateString()}
                </div>
            </div>
        </div>

        ${isFolder && quizzes.length > 0 ? `
        <div style="margin-bottom:14px;">
            <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;
                color:#aaa;margin-bottom:8px;">Contains</div>
            <div style="display:flex;flex-direction:column;gap:5px;max-height:150px;overflow-y:auto;">
                ${quizzes.map(q => `
                <div style="font-size:0.85rem;padding:6px 10px;background:#f9f9f9;
                    border-radius:4px;display:flex;justify-content:space-between;align-items:center;">
                    <span>📄 ${escHtml(q.name)}</span>
                    <span style="color:#aaa;font-size:0.75rem;flex-shrink:0;">${q.questions.length} Qs</span>
                </div>`).join('')}
            </div>
        </div>` : ''}

        <!-- Folder picker -->
        <div style="margin-bottom:16px;">
            <label style="font-size:0.82rem;font-weight:700;color:#4a6fa5;
                display:block;margin-bottom:8px;">📂 Choose where to import:</label>
            <select id="importFolderSelect"
                style="width:100%;padding:10px 12px;border:2px solid #4a6fa5;
                border-radius:8px;font-family:inherit;font-size:0.88rem;
                background:white;cursor:pointer;">
                <option value="root">📂 Root (top level)</option>
                ${_getFolderOptions(folderStructure, 0)}
            </select>
        </div>

        <div class="modal-footer">
            <button class="secondary-btn"
                onclick="document.getElementById('importModal').remove()">Cancel</button>
            <button class="primary-btn" onclick="_doImport()">
                ✅ Import Here
            </button>
        </div>
    </div>`;
    document.body.appendChild(m);
}

function _getFolderOptions(node, depth) {
    let html = '';
    (node.children || []).forEach(child => {
        if (child.type !== 'folder') return;
        const indent = '　'.repeat(depth);
        html += `<option value="${child.id}">${indent}📁 ${escHtml(child.name)}</option>`;
        html += _getFolderOptions(child, depth + 1);
    });
    return html;
}

async function _doImport() {
    const payload  = _pendingImportPayload;
    if (!payload) { showToast('No import data found', 'warning'); return; }

    const selEl    = document.getElementById('importFolderSelect');
    const parentId = selEl?.value || 'root';
    const parent   = parentId === 'root' ? folderStructure : findItemById(parentId);
    if (!parent) { showToast('Folder not found', 'warning'); return; }

    const parentPath = parent.path || '/';

    try {
        if (payload.itemType === 'quiz') {
            // Import single quiz
            await _importQuiz(payload.data, parentId, parentPath);
            showToast(`✅ "${payload.name}" imported!`, 'success');

        } else if (payload.itemType === 'folder') {
            // Create folder then import all quizzes inside
            const folderId   = generateId();
            const folderPath = (parentPath === '/' ? '' : parentPath) + '/' + payload.name;
            const folder = {
                id: folderId, name: payload.name, type: 'folder',
                parentId, children: [], path: folderPath,
                metadata: { created: new Date().toISOString(), modified: new Date().toISOString() }
            };
            await saveItem(folder);

            for (const quiz of (payload.data?.quizzes || [])) {
                await _importQuiz(quiz, folderId, folderPath);
            }
            showToast(`✅ Folder "${payload.name}" imported with ${payload.data?.quizzes?.length || 0} quizzes!`, 'success');
        }

        document.getElementById('importModal')?.remove();
        await loadFolderStructure();
        navigateToRoot();

    } catch (err) {
        console.error('Import error:', err);
        showToast('Import failed: ' + err.message, 'error');
    }
}

async function _importQuiz(quizData, parentId, parentPath) {
    const quizPath = (parentPath === '/' ? '' : parentPath) + '/' + quizData.name;
    const quiz = {
        id:        generateId(),
        name:      quizData.name,
        type:      'quiz',
        parentId,
        questions: quizData.questions || [],
        path:      quizPath,
        metadata:  { created: new Date().toISOString(), modified: new Date().toISOString(), questionCount: quizData.questions?.length || 0 }
    };
    await saveItem(quiz);
}
