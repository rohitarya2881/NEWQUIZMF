/* =============================================
   difficult.js — Mark Difficult & Save Dialog
   ============================================= */

let markedDifficultList = [];

/**
 * Called by quiz.js showResults() to append "Save Marked" button if needed.
 */
function appendSaveMarkedButton() {
    markedDifficultList = markedDifficultList.filter(q => q.isMarkedDifficult);
    if (!markedDifficultList.length) return;
    setTimeout(() => {
        const c  = document.getElementById('quizContainer');
        const ra = c?.querySelector('.results-actions');
        if (!ra) return;
        const btn = document.createElement('button');
        btn.className = 'save-marked-btn';
        btn.innerHTML = `<i class="fas fa-bookmark"></i> Save ${markedDifficultList.length} Marked Questions`;
        btn.onclick   = () => showSaveMarkedDialog();
        ra.appendChild(btn);
    }, 120);
}

// ── Save Dialog ───────────────────────────────
function showSaveMarkedDialog() {
    if (!markedDifficultList.length) { showToast('No marked questions', 'warning'); return; }
    const folders = getAllItems().filter(i => i.type === 'folder' && i.id !== 'root');

    const ov = document.createElement('div'); ov.className = 'difficult-dialog-overlay';
    ov.innerHTML = `<div class="difficult-dialog glass-card">
        <h3><i class="fas fa-bookmark"></i> Save ${markedDifficultList.length} Marked Questions</h3>
        <p style="color:#64748b;margin-bottom:12px;">Choose where to save these difficult questions:</p>
        <ul class="q-list">
            ${markedDifficultList.map((q, i) => `
                <li>Q${q.markedIndex + 1}: ${escHtml(q.question.substring(0, 60))}${q.question.length > 60 ? '…' : ''}</li>`).join('')}
        </ul>

        <!-- Option 1: existing folder -->
        <div class="save-option-row">
            <input type="radio" name="saveOpt" value="existing" id="soExistingR" checked>
            <label for="soExistingR" style="cursor:pointer;">
                <strong>Add to existing folder's quiz</strong><br>
                <small style="color:#64748b;">Questions go into the folder's "_Difficult" quiz</small>
            </label>
        </div>
        <div style="padding:0 12px 12px;">
            <select id="saveFolderSel">
                <option value="">— Select Folder —</option>
                ${folders.map(f => `<option value="${f.id}"${currentFolder && f.id === currentFolder.id ? ' selected' : ''}>${escHtml(f.name)}</option>`).join('')}
            </select>
        </div>

        <!-- Option 2: new quiz in current folder -->
        <div class="save-option-row">
            <input type="radio" name="saveOpt" value="new" id="soNewR">
            <label for="soNewR" style="cursor:pointer;">
                <strong>Create a new quiz in current folder</strong><br>
                <small style="color:#64748b;">Saves as a new quiz where you are now</small>
            </label>
        </div>
        <div style="padding:0 12px 12px;">
            <input type="text" id="saveNewName" placeholder="Quiz name (e.g. Difficult Review)" style="display:none;">
        </div>

        <div class="diff-dialog-btns">
            <button class="secondary-btn" onclick="this.closest('.difficult-dialog-overlay').remove()">Cancel</button>
            <button class="primary-btn"   onclick="saveMarkedQuestionsToFolder()"><i class="fas fa-save"></i> Save</button>
        </div>
    </div>`;

    document.body.appendChild(ov);

    // Toggle visibility of folder select vs name input
    ov.querySelectorAll('input[name="saveOpt"]').forEach(r => {
        r.addEventListener('change', () => {
            const isNew = ov.querySelector('#soNewR').checked;
            ov.querySelector('#saveFolderSel').disabled    = isNew;
            ov.querySelector('#saveNewName').style.display = isNew ? 'block' : 'none';
        });
    });
}

async function saveMarkedQuestionsToFolder() {
    const ov = document.querySelector('.difficult-dialog-overlay'); if (!ov) return;
    const saveOpt   = ov.querySelector('input[name="saveOpt"]:checked')?.value;
    const questions = markedDifficultList.map(({ markedIndex, ...q }) => q);

    if (saveOpt === 'existing') {
        const folderId = ov.querySelector('#saveFolderSel').value;
        if (!folderId) { showToast('Please select a folder', 'warning'); return; }
        const folder = findItemById(folderId);
        if (!folder)  { showToast('Folder not found', 'error'); return; }

        const dqName = folder.name + '_Difficult';
        let dq = folder.children?.find(c => c.type === 'quiz' && c.name.includes('Difficult'));
        if (!dq) {
            dq = { id:generateId(), name:dqName, type:'quiz', parentId:folder.id, questions:[],
                   path:folder.path+'/'+dqName, metadata:{ created:new Date().toISOString(), tags:['difficult'] } };
        }
        const existing = new Set((dq.questions || []).map(q => q.question));
        const toAdd    = questions.filter(q => !existing.has(q.question));
        dq.questions   = [...(dq.questions || []), ...toAdd];
        dq.metadata    = { ...dq.metadata, questionCount:dq.questions.length, modified:new Date().toISOString() };
        await saveItem(dq);
        await loadFolderStructure();
        ov.remove(); markedDifficultList = [];
        showToast(`Saved ${toAdd.length} questions to "${dqName}"${toAdd.length < questions.length ? ` (${questions.length - toAdd.length} duplicates skipped)` : ''}`, 'success');
        refreshView();

    } else {
        if (!currentFolder || currentFolder.id === 'root') { showToast('Navigate into a folder first', 'warning'); return; }
        const name = ov.querySelector('#saveNewName').value.trim() || 'Difficult Questions';
        const nq   = { id:generateId(), name, type:'quiz', parentId:currentFolder.id, questions,
                       path:currentFolder.path+'/'+name, metadata:{ created:new Date().toISOString(), questionCount:questions.length, tags:['difficult','marked'] } };
        await saveItem(nq);
        await loadFolderStructure();
        ov.remove(); markedDifficultList = [];
        showToast(`Created quiz "${name}" with ${questions.length} questions`, 'success');
        refreshView();
    }
}
