/* =============================================
   folders.js — Folder/Quiz CRUD & Rendering
   ============================================= */

// ── Create ────────────────────────────────────
function createNewFolder() {
    const name = prompt('Enter folder name:');
    if (!name || !name.trim()) return;
    const parentPath = currentFolder ? (currentFolder.path || '/') : '/';
    const newPath = (parentPath === '/' ? '' : parentPath) + '/' + name.trim();
    const newF = {
        id: generateId(), name: name.trim(), type: 'folder',
        parentId: currentFolder ? currentFolder.id : 'root',
        children: [],
        path: newPath,
        metadata: { created: new Date().toISOString(), modified: new Date().toISOString() }
    };
    saveItem(newF).then(() => loadFolderStructure().then(() => {
        refreshView();
        showToast(`Folder "${name.trim()}" created`, 'success');
    }));
}

function createNewQuiz() {
    if (!currentFolder) { showToast('Navigate into a folder first', 'warning'); return; }
    const name = prompt('Enter quiz name:');
    if (!name || !name.trim()) return;
    const parentPath = currentFolder.path || '/';
    const newPath = (parentPath === '/' ? '' : parentPath) + '/' + name.trim();
    const newQ = {
        id: generateId(), name: name.trim(), type: 'quiz',
        parentId: currentFolder.id, questions: [],
        path: newPath,
        metadata: { created: new Date().toISOString(), modified: new Date().toISOString(), questionCount: 0 }
    };
    saveItem(newQ).then(() => loadFolderStructure().then(() => {
        refreshView();
        showToast(`Quiz "${name.trim()}" created`, 'success');
    }));
}

// ── Rename / Delete ───────────────────────────
function renameCurrentItem() {
    if (!currentFolder || currentFolder.id === 'root') return;
    const newName = prompt('New name:', currentFolder.name);
    if (!newName || !newName.trim()) return;
    const updated = { ...currentFolder, name: newName.trim(), path: currentFolder.path.replace(/\/[^/]+$/, '/' + newName.trim()) };
    saveItem(updated).then(() => loadFolderStructure().then(() => {
        navigateTo(updated.path);
        showToast('Renamed', 'success');
    }));
}

function renameItem(id) {
    const item = findItemById(id); if (!item) return;
    const newName = prompt('New name:', item.name);
    if (!newName || !newName.trim()) return;
    const updated = { ...item, name: newName.trim(), path: item.path.replace(/\/[^/]+$/, '/' + newName.trim()) };
    saveItem(updated).then(() => loadFolderStructure().then(() => { refreshView(); showToast('Renamed', 'success'); }));
}

async function deleteItemById(id) {
    const item = findItemById(id); if (!item) return;
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    const ids = [];
    const q   = [item];
    while (q.length) { const c = q.shift(); ids.push(c.id); if (c.children) q.push(...c.children); }
    for (const iid of ids) await deleteItemFromDB(iid);
    await loadFolderStructure();
    refreshView();
    showToast(`"${item.name}" deleted`, 'success');
}

function deleteCurrentFolder() {
    if (!currentFolder || currentFolder.id === 'root') { showToast('Cannot delete root', 'warning'); return; }
    if (!confirm(`Delete folder "${currentFolder.name}" and all its contents?`)) return;
    const toDelete = []; const q = [currentFolder];
    while (q.length) { const c = q.shift(); toDelete.push(c.id); if (c.children) q.push(...c.children); }
    Promise.all(toDelete.map(id => deleteItemFromDB(id)))
        .then(() => loadFolderStructure())
        .then(() => { navigateToParent(); showToast('Deleted', 'success'); });
}

function clearMemory() {
    if (confirm('Reset all "timesIncorrect" flags to 0?')) showToast('Memory cleared', 'success');
}

// ── Rendering ─────────────────────────────────
function renderCurrentView() { if (!currentFolder) return; renderFolderInfo(); renderSubfolders(); renderQuizzes(); updateMedalDisplay(); }
function refreshView()        { renderCurrentView(); }

function renderFolderInfo() {
    const el = document.getElementById('folderInfo'); if (!el) return;
    const subF  = currentFolder.children?.filter(c => c.type === 'folder').length || 0;
    const quizC = currentFolder.children?.filter(c => c.type === 'quiz').length || 0;
    const totQ  = currentFolder.children?.reduce((s, c) => s + (c.type === 'quiz' ? (c.questions?.length || 0) : 0), 0) || 0;
    el.innerHTML = `<div class="folder-stats">
        <div class="stat-item"><i class="fas fa-folder"></i><span class="stat-value">${subF}</span><span class="stat-label">Subfolders</span></div>
        <div class="stat-item"><i class="fas fa-file-alt"></i><span class="stat-value">${quizC}</span><span class="stat-label">Quizzes</span></div>
        <div class="stat-item"><i class="fas fa-question-circle"></i><span class="stat-value">${totQ}</span><span class="stat-label">Questions</span></div>
        ${currentPath !== '/' ? `<button class="secondary-btn small" onclick="navigateToParent()"><i class="fas fa-arrow-up"></i> Up</button>` : ''}
        ${currentFolder.id !== 'root' ? `<button class="danger-btn small" onclick="deleteCurrentFolder()"><i class="fas fa-trash"></i> Delete Folder</button>` : ''}
    </div>`;
}

function renderSubfolders() {
    const el   = document.getElementById('subfoldersGrid'); if (!el) return;
    const subs = currentFolder.children?.filter(c => c.type === 'folder') || [];
    if (!subs.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No subfolders yet.</div>'; return; }
    el.innerHTML = subs.map(f => `
        <div class="folder-card glass-card" onclick="navigateToId('${f.id}')" style="cursor:pointer;">
            <div class="folder-icon"><i class="fas fa-folder"></i></div>
            <div class="folder-name">${escHtml(f.name)}</div>
            <div class="folder-meta">${f.children?.filter(c => c.type === 'quiz').length || 0} quiz(zes)</div>
            <div class="folder-actions">
                <button class="icon-btn small" onclick="event.stopPropagation();renameItem('${f.id}')" title="Rename"><i class="fas fa-edit"></i></button>
                <button class="icon-btn small danger" onclick="event.stopPropagation();deleteItemById('${f.id}')" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('');
}

function renderQuizzes() {
    const el      = document.getElementById('quizzesList'); if (!el) return;
    const quizzes = currentFolder.children?.filter(c => c.type === 'quiz') || [];
    if (!quizzes.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No quizzes yet. Create one or upload JSON!</div>'; return; }
    el.innerHTML = quizzes.map(q => `
        <div class="quiz-card glass-card">
            <div class="quiz-header">
                <i class="fas fa-file-alt"></i>
                <h4>${escHtml(q.name)}</h4>
                <span class="question-count">${q.questions?.length || 0} questions</span>
            </div>
            <div class="quiz-actions">
                <button class="primary-btn small"   onclick="startQuiz('${q.id}')"><i class="fas fa-play"></i> Start</button>
                <button class="secondary-btn small" onclick="displayFlashcards('${q.id}')"><i class="fas fa-layer-group"></i> Cards</button>
                <button class="secondary-btn small" onclick="showAddQuestionToQuizDialog('${q.id}')"><i class="fas fa-plus"></i> Add Q</button>
                <button class="danger-btn small"    onclick="deleteItemById('${q.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('');
}

function showQuickUploadArea() {
    const area = document.getElementById('quickUploadArea');
    if (area) area.classList.toggle('hidden', !currentFolder || currentFolder.id === 'root');
}
