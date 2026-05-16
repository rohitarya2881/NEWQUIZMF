/* =============================================
   bookmarks.js — Question Bookmarking System
   Saves bookmarked questions as quizName_Bookmarks
   quiz inside same folder. No duplicates.
   ============================================= */

const BOOKMARK_SUFFIX = '_Bookmarks';

// ── Core: add question to bookmark quiz ───────
async function bookmarkQuestion(question, quizId) {
    const quiz   = findItemById(quizId);
    if (!quiz) return;

    const parent = findItemById(quiz.parentId);
    if (!parent) { showToast('Cannot find parent folder', 'warning'); return; }

    const bmName = quiz.name + BOOKMARK_SUFFIX;
    const bmPath = (parent.path === '/' ? '' : parent.path) + '/' + bmName;

    // Find existing bookmark quiz in same folder
    let bmQuiz = parent.children?.find(c => c.type === 'quiz' && c.name === bmName);

    // Create if not exists
    if (!bmQuiz) {
        bmQuiz = {
            id:        generateId(),
            name:      bmName,
            type:      'quiz',
            parentId:  parent.id,
            questions: [],
            path:      bmPath,
            metadata:  {
                created:       new Date().toISOString(),
                modified:      new Date().toISOString(),
                isBookmarkQuiz: true,
                sourceQuizId:  quizId
            }
        };
    }

    // Check duplicate — avoid bookmarking same question twice
    const isDuplicate = bmQuiz.questions.some(q =>
        q.question?.trim().toLowerCase() === question.question?.trim().toLowerCase()
    );

    if (isDuplicate) {
        showToast('Already bookmarked!', 'info');
        return;
    }

    bmQuiz.questions = [...(bmQuiz.questions || []), {
        ...question,
        bookmarkedAt: new Date().toISOString()
    }];
    bmQuiz.metadata.modified = new Date().toISOString();

    await saveItem(bmQuiz);
    await loadFolderStructure();
    showToast(`🔖 Bookmarked! (${bmQuiz.questions.length} total)`, 'success');
}

// ── Remove bookmark ───────────────────────────
async function removeBookmark(question, bookmarkQuizId) {
    const bmQuiz = findItemById(bookmarkQuizId);
    if (!bmQuiz) return;
    const before = bmQuiz.questions.length;
    bmQuiz.questions = bmQuiz.questions.filter(q =>
        q.question?.trim().toLowerCase() !== question.question?.trim().toLowerCase()
    );
    if (bmQuiz.questions.length === before) { showToast('Not found in bookmarks', 'info'); return; }
    await saveItem(bmQuiz);
    await loadFolderStructure();
    showToast('Bookmark removed', 'info');
}

// ── Check if question is bookmarked ──────────
function isBookmarked(question, quizId) {
    const quiz   = findItemById(quizId);
    if (!quiz) return false;
    const parent = findItemById(quiz.parentId);
    if (!parent) return false;
    const bmName = quiz.name + BOOKMARK_SUFFIX;

    // parent.children ke saath saath folderStructure bhi scan karo
    const bmQuiz = parent.children?.find(c => c.type === 'quiz' && c.name === bmName)
                ?? _findInTree(folderStructure, bmName, quiz.parentId);

    if (!bmQuiz) return false;
    return bmQuiz.questions.some(q =>
        q.question?.trim().toLowerCase() === question.question?.trim().toLowerCase()
    );
}

// Helper — tree mein dhundho
function _findInTree(node, name, parentId) {
    if (node.type === 'quiz' && node.name === name && node.parentId === parentId) return node;
    for (const child of node.children || []) {
        const found = _findInTree(child, name, parentId);
        if (found) return found;
    }
    return null;
}

// ── Toggle bookmark (used in quiz + flashcard) ─
async function toggleBookmark(question, quizId, btnEl) {
    const bookmarked = isBookmarked(question, quizId);
    if (bookmarked) {
        // Find and remove
        const quiz   = findItemById(quizId);
        const parent = findItemById(quiz?.parentId);
        const bmQuiz = parent?.children?.find(c => c.type === 'quiz' && c.name === quiz.name + BOOKMARK_SUFFIX);
        if (bmQuiz) await removeBookmark(question, bmQuiz.id);
        if (btnEl) { btnEl.textContent = '🔖'; btnEl.title = 'Bookmark this question'; btnEl.classList.remove('bookmarked'); }
    } else {
        await bookmarkQuestion(question, quizId);
        if (btnEl) { btnEl.textContent = '✅🔖'; btnEl.title = 'Bookmarked! Click to remove'; btnEl.classList.add('bookmarked'); }
    }
}

// ══════════════════════════════════════════════
// ALL BOOKMARKS VIEW
// ══════════════════════════════════════════════
function showAllBookmarks() {
    showView('bookmarkContainer');
    _renderAllBookmarks();
}

function _renderAllBookmarks() {
    const el = document.getElementById('bookmarkContainer'); if (!el) return;

    // Collect all bookmark quizzes from entire folder structure
    const allBmQuizzes = [];
    const walk = (node) => {
        if (node.type === 'quiz' && node.metadata?.isBookmarkQuiz && node.questions?.length) {
            const parent = findItemById(node.parentId);
            allBmQuizzes.push({ quiz: node, parent });
        }
        (node.children || []).forEach(walk);
    };
    walk(folderStructure);

    const totalCount = allBmQuizzes.reduce((s, b) => s + b.quiz.questions.length, 0);

    let html = `
        <div class="bm-topbar">
            <div class="bm-title">🔖 All Bookmarks</div>
            <div class="bm-meta">${totalCount} bookmarked questions across ${allBmQuizzes.length} quiz${allBmQuizzes.length !== 1 ? 'zes' : ''}</div>
            <button class="secondary-btn" onclick="goHome()" style="font-size:0.78rem;padding:5px 12px;">✕ Close</button>
        </div>`;

    if (!allBmQuizzes.length) {
        html += `<div class="bm-empty">
            <div style="font-size:3rem;margin-bottom:12px;">🔖</div>
            <div style="font-weight:700;font-size:1.1rem;color:#4a6fa5;margin-bottom:8px;">No bookmarks yet</div>
            <div style="color:#aaa;font-size:0.88rem;">
                During a quiz or flashcard session, tap <strong>🔖</strong> on any question to bookmark it.
            </div>
        </div>`;
    } else {
        // Group by folder
        const byFolder = {};
        allBmQuizzes.forEach(({ quiz, parent }) => {
            const folderName = parent?.name || 'Root';
            const folderId   = parent?.id   || 'root';
            if (!byFolder[folderId]) byFolder[folderId] = { name: folderName, quizzes: [] };
            byFolder[folderId].quizzes.push(quiz);
        });

        Object.entries(byFolder).forEach(([folderId, group]) => {
            html += `<div class="bm-folder-section">
                <div class="bm-folder-header">
                    <span class="bm-folder-icon">📁</span>
                    <span class="bm-folder-name">${escHtml(group.name)}</span>
                    <span class="bm-folder-count">${group.quizzes.reduce((s,q) => s+q.questions.length, 0)} questions</span>
                </div>`;

            group.quizzes.forEach(bmQuiz => {
                const srcName = bmQuiz.name.replace(BOOKMARK_SUFFIX, '');
                html += `
                <div class="bm-quiz-block">
                    <div class="bm-quiz-header">
                        <span>📄 ${escHtml(srcName)}</span>
                        <span class="bm-count-badge">${bmQuiz.questions.length} bookmarks</span>
                        <button class="primary-btn small" onclick="startQuiz('${bmQuiz.id}')">▶ Quiz these</button>
                        <button class="secondary-btn small" onclick="displayFlashcards('${bmQuiz.id}')">🃏 Flashcards</button>
                        <button class="danger-btn small" onclick="_clearAllBookmarks('${bmQuiz.id}')">🗑 Clear all</button>
                    </div>
                    <div class="bm-questions-list">
                        ${bmQuiz.questions.map((q, i) => `
                        <div class="bm-question-row">
                            <div class="bm-q-num">${i + 1}</div>
                            <div class="bm-q-content">
                                <div class="bm-q-text">${escHtml(q.question)}</div>
                                <div class="bm-q-answer">✅ ${escHtml(q.options?.[q.correctIndex] || '')}</div>
                            </div>
                            <button class="bm-remove-btn" onclick="_removeSingleBookmark('${bmQuiz.id}', ${i})"
                                title="Remove bookmark">✕</button>
                        </div>`).join('')}
                    </div>
                </div>`;
            });

            html += `</div>`;
        });
    }

    el.innerHTML = html;
}

async function _removeSingleBookmark(bmQuizId, index) {
    const bmQuiz = findItemById(bmQuizId);
    if (!bmQuiz) return;
    bmQuiz.questions.splice(index, 1);
    bmQuiz.metadata.modified = new Date().toISOString();
    await saveItem(bmQuiz);
    await loadFolderStructure();
    _renderAllBookmarks();
    showToast('Bookmark removed', 'info');
}

async function _clearAllBookmarks(bmQuizId) {
    if (!confirm('Remove all bookmarks from this quiz?')) return;
    const bmQuiz = findItemById(bmQuizId);
    if (!bmQuiz) return;
    bmQuiz.questions = [];
    bmQuiz.metadata.modified = new Date().toISOString();
    await saveItem(bmQuiz);
    await loadFolderStructure();
    _renderAllBookmarks();
    showToast('All bookmarks cleared', 'info');
}

// ── Clear bookmark quiz from folder view ──────
async function _clearBookmarkQuiz(bmQuizId) {
    const bmQuiz = findItemById(bmQuizId);
    if (!bmQuiz) return;
    const count = bmQuiz.questions?.length || 0;
    if (!confirm(`Clear all ${count} bookmark${count!==1?'s':''} from "${bmQuiz.name}"?\n\nThe quiz will be emptied but kept in the folder.`)) return;
    bmQuiz.questions = [];
    bmQuiz.metadata.modified = new Date().toISOString();
    await saveItem(bmQuiz);
    await loadFolderStructure();
    renderCurrentView();
    showToast(`Cleared ${count} bookmark${count!==1?'s':''}`, 'success');
}
