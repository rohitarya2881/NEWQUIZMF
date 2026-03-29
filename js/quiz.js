/* =============================================
   quiz.js — Quiz Engine, Flashcards, Add Question, Upload, Backup
   ============================================= */

// ── Quiz Settings State ───────────────────────
let quizTimer       = null;   // interval id
let quizTimerMode   = 'none'; // 'none' | 'per_question' | 'total'
let quizTimerValue  = 0;      // seconds remaining (total) or per-question seconds
let quizPerQSecs    = 0;      // seconds per question (per_question mode)
let quizTotalSecs   = 0;      // total seconds (total mode)
let quizStartFrom   = 1;      // 1-based start index saved for restart
let quizEndAt       = 0;      // 1-based end index saved for restart

// ── Quiz Settings Dialog ──────────────────────
function startQuiz(quizId) {
    const quiz = findItemById(quizId);
    if (!quiz || quiz.type !== 'quiz') { showToast('Invalid quiz', 'error'); return; }
    if (!quiz.questions?.length)       { showToast('This quiz has no questions', 'warning'); return; }
    showQuizSettingsDialog(quiz);
}

function showQuizSettingsDialog(quiz) {
    const total = quiz.questions.length;
    const m = document.createElement('div');
    m.className = 'modal';
    m.id = 'quizSettingsModal';
    m.innerHTML = `
    <div class="modal-content glass-card" style="max-width:500px;">
        <div class="modal-header">
            <h3><i class="fas fa-sliders-h"></i> Quiz Settings</h3>
            <button class="close-btn" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
        </div>

        <!-- Quiz Info Banner -->
        <div class="qsd-banner">
            <i class="fas fa-file-alt"></i>
            <div>
                <div class="qsd-quiz-name">${escHtml(quiz.name)}</div>
                <div class="qsd-quiz-meta">${total} questions total</div>
            </div>
        </div>

        <!-- Question Range -->
        <div class="qsd-section">
            <div class="qsd-section-title"><i class="fas fa-list-ol"></i> Question Range</div>
            <div class="qsd-range-row">
                <div class="qsd-range-group">
                    <label>From</label>
                    <input type="number" id="qsdStart" value="1" min="1" max="${total}"
                        oninput="qsdValidateRange(${total})">
                </div>
                <div class="qsd-range-divider">—</div>
                <div class="qsd-range-group">
                    <label>To</label>
                    <input type="number" id="qsdEnd" value="${total}" min="1" max="${total}"
                        oninput="qsdValidateRange(${total})">
                </div>
                <div class="qsd-count-badge">
                    <span id="qsdCount">${total}</span> Qs
                </div>
            </div>
            <div class="qsd-range-btns">
                <button class="qsd-preset-btn" onclick="qsdSetRange(1,${total},${total})">All</button>
                <button class="qsd-preset-btn" onclick="qsdSetRange(1,Math.min(10,${total}),${total})">First 10</button>
                <button class="qsd-preset-btn" onclick="qsdSetRange(Math.max(1,${total}-9),${total},${total})">Last 10</button>
                <button class="qsd-preset-btn" onclick="qsdSetRandom(${total})">Random 10</button>
            </div>
        </div>

        <!-- Shuffle -->
        <div class="qsd-section">
            <div class="qsd-section-title"><i class="fas fa-random"></i> Order</div>
            <div class="qsd-toggle-row">
                <label class="qsd-toggle-label" for="qsdShuffle">Shuffle questions</label>
                <label class="qsd-switch">
                    <input type="checkbox" id="qsdShuffle">
                    <span class="qsd-slider"></span>
                </label>
            </div>
        </div>

        <!-- Timer -->
        <div class="qsd-section">
            <div class="qsd-section-title"><i class="fas fa-clock"></i> Timer</div>
            <div class="qsd-timer-tabs">
                <button class="qsd-ttab active" id="ttab-none"       onclick="qsdSetTimerTab('none')">No Timer</button>
                <button class="qsd-ttab"        id="ttab-per_question" onclick="qsdSetTimerTab('per_question')">Per Question</button>
                <button class="qsd-ttab"        id="ttab-total"      onclick="qsdSetTimerTab('total')">Total Time</button>
            </div>
            <div id="qsdTimerNone" class="qsd-timer-panel active">
                <p class="qsd-hint">No time limit — answer at your own pace.</p>
            </div>
            <div id="qsdTimerPerQ" class="qsd-timer-panel">
                <div class="qsd-time-input-row">
                    <input type="number" id="qsdPerQSecs" value="30" min="5" max="600">
                    <span class="qsd-unit">seconds per question</span>
                </div>
                <p class="qsd-hint">Timer resets after every answer.</p>
            </div>
            <div id="qsdTimerTotal" class="qsd-timer-panel">
                <div class="qsd-time-input-row">
                    <input type="number" id="qsdTotalMins" value="10" min="1" max="300">
                    <span class="qsd-unit">minutes for whole quiz</span>
                </div>
                <p class="qsd-hint">One countdown for the entire quiz.</p>
            </div>
        </div>

        <div class="modal-footer">
            <button class="secondary-btn" onclick="this.closest('.modal').remove()">Cancel</button>
            <button class="primary-btn"   onclick="launchQuizWithSettings('${quiz.id}', ${total})">
                <i class="fas fa-play"></i> Start Quiz
            </button>
        </div>
    </div>`;
    document.body.appendChild(m);
}

/* ── Dialog helpers ── */
function qsdValidateRange(total) {
    let s = parseInt(document.getElementById('qsdStart').value) || 1;
    let e = parseInt(document.getElementById('qsdEnd').value)   || total;
    s = Math.max(1, Math.min(s, total));
    e = Math.max(s, Math.min(e, total));
    const cnt = document.getElementById('qsdCount');
    if (cnt) cnt.textContent = e - s + 1;
}
function qsdSetRange(s, e, total) {
    document.getElementById('qsdStart').value = s;
    document.getElementById('qsdEnd').value   = e;
    qsdValidateRange(total);
}
function qsdSetRandom(total) {
    const count = Math.min(10, total);
    const start = Math.max(1, Math.floor(Math.random() * (total - count + 1)) + 1);
    qsdSetRange(start, start + count - 1, total);
}
function qsdSetTimerTab(mode) {
    ['none','per_question','total'].forEach(t => {
        document.getElementById(`ttab-${t}`)?.classList.toggle('active', t === mode);
        document.getElementById(`qsdTimer${t === 'none' ? 'None' : t === 'per_question' ? 'PerQ' : 'Total'}`)
                ?.classList.toggle('active', t === mode);
    });
}

/* ── Launch quiz with chosen settings ── */
function launchQuizWithSettings(quizId, totalQuestions) {
    const quiz = findItemById(quizId);
    if (!quiz) return;

    let s = parseInt(document.getElementById('qsdStart').value) || 1;
    let e = parseInt(document.getElementById('qsdEnd').value)   || totalQuestions;
    s = Math.max(1, Math.min(s, totalQuestions));
    e = Math.max(s, Math.min(e, totalQuestions));

    const shuffle = document.getElementById('qsdShuffle')?.checked || false;

    // Determine active timer tab
    const activeTab = ['none','per_question','total'].find(t =>
        document.getElementById(`ttab-${t}`)?.classList.contains('active')
    ) || 'none';

    let perQSecs   = 0;
    let totalSecs  = 0;
    if (activeTab === 'per_question') {
        perQSecs = Math.max(5, parseInt(document.getElementById('qsdPerQSecs')?.value) || 30);
    } else if (activeTab === 'total') {
        totalSecs = Math.max(60, (parseInt(document.getElementById('qsdTotalMins')?.value) || 10) * 60);
    }

    // Slice + optionally shuffle
    let qs = quiz.questions.slice(s - 1, e);
    if (shuffle) qs = shuffleArray(qs);

    document.getElementById('quizSettingsModal')?.remove();

    // Store settings for restart
    quizStartFrom  = s;
    quizEndAt      = e;
    quizTimerMode  = activeTab;
    quizPerQSecs   = perQSecs;
    quizTotalSecs  = totalSecs;

    currentQuiz             = quiz;
    currentQuizQuestions    = qs;
    currentQuestionIndex    = 0;
    score                   = 0;
    incorrectQuestions      = [];
    if (typeof markedDifficultList !== 'undefined') markedDifficultList = [];

    showView('quizContainer');
    buildQuizInterface();
}

// ── Quiz Interface ────────────────────────────
function buildQuizInterface() {
    stopQuizTimer();
    const c = document.getElementById('quizContainer');
    c.innerHTML = `
        <div class="quiz-header">
            <div class="quiz-progress">
                <div class="progress-circle">
                    <span id="current-question">1</span>/<span id="total-questions">${currentQuizQuestions.length}</span>
                </div>
                <div class="progress-bar-container">
                    <div id="quizProgressBar" class="progress-bar" style="width:0%"></div>
                </div>
            </div>
            <div class="quiz-timer" id="quizTimerBox" style="display:${quizTimerMode === 'none' ? 'none' : 'flex'}">
                <i class="fas fa-hourglass-half"></i>
                <span id="time-display">${quizTimerMode === 'total' ? fmtSecs(quizTotalSecs) : quizTimerMode === 'per_question' ? fmtSecs(quizPerQSecs) : '—'}</span>
            </div>
        </div>
        <h2 id="question-text" class="question-text"></h2>
        <div id="options" class="options-grid"></div>
        <div class="quiz-footer">
            <button class="secondary-btn" onclick="exitQuiz()"><i class="fas fa-times"></i> Exit</button>
            <button class="mark-difficult-btn" id="markDifficultBtn" onclick="markCurrentAsDifficult()">
                <i class="fas fa-flag"></i> Mark Difficult
            </button>
        </div>`;

    // Start total timer if needed
    if (quizTimerMode === 'total') {
        quizTimerValue = quizTotalSecs;
        startTotalTimer();
    }
    loadQuestion(0);
}

// ── Timer Logic ───────────────────────────────
function stopQuizTimer() {
    if (quizTimer) { clearInterval(quizTimer); quizTimer = null; }
}

function startTotalTimer() {
    stopQuizTimer();
    quizTimer = setInterval(() => {
        quizTimerValue--;
        const td = document.getElementById('time-display');
        if (td) td.textContent = fmtSecs(quizTimerValue);
        // warning colour when ≤ 30 s
        const box = document.getElementById('quizTimerBox');
        if (box) box.classList.toggle('timer-warning', quizTimerValue <= 30);
        if (quizTimerValue <= 0) { stopQuizTimer(); timeUpQuiz(); }
    }, 1000);
}

function startPerQuestionTimer() {
    stopQuizTimer();
    quizTimerValue = quizPerQSecs;
    const td = document.getElementById('time-display');
    if (td) td.textContent = fmtSecs(quizTimerValue);
    quizTimer = setInterval(() => {
        quizTimerValue--;
        const td2 = document.getElementById('time-display');
        if (td2) td2.textContent = fmtSecs(quizTimerValue);
        const box = document.getElementById('quizTimerBox');
        if (box) box.classList.toggle('timer-warning', quizTimerValue <= 10);
        if (quizTimerValue <= 0) {
            stopQuizTimer();
            // auto-skip — count as wrong
            const q = currentQuizQuestions[currentQuestionIndex];
            if (q) incorrectQuestions.push({ ...q, selectedAnswer: '(Time expired)' });
            // flash all options disabled
            document.querySelectorAll('.option-btn').forEach(x => x.disabled = true);
            const correct = document.querySelectorAll('.option-btn')[q?.correctIndex];
            if (correct) correct.classList.add('correct');
            setTimeout(() => { currentQuestionIndex++; loadQuestion(currentQuestionIndex); }, 900);
        }
    }, 1000);
}

function timeUpQuiz() {
    // Mark remaining as incorrect
    while (currentQuestionIndex < currentQuizQuestions.length) {
        const q = currentQuizQuestions[currentQuestionIndex];
        incorrectQuestions.push({ ...q, selectedAnswer: '(Time expired)' });
        currentQuestionIndex++;
    }
    showToast('Time up!', 'warning');
    showResults();
}

// ── Load Question ─────────────────────────────
function loadQuestion(index) {
    stopQuizTimer();
    if (index >= currentQuizQuestions.length) { showResults(); return; }
    const q = currentQuizQuestions[index];
    document.getElementById('current-question').textContent = index + 1;
    document.getElementById('question-text').textContent    = q.question;
    document.getElementById('quizProgressBar').style.width  = `${(index / currentQuizQuestions.length) * 100}%`;

    // sync mark-difficult button
    const btn = document.getElementById('markDifficultBtn');
    if (btn) {
        btn.className = 'mark-difficult-btn' + (q.isMarkedDifficult ? ' marked' : '');
        btn.innerHTML = q.isMarkedDifficult
            ? '<i class="fas fa-check"></i> Marked'
            : '<i class="fas fa-flag"></i> Mark Difficult';
    }
    document.getElementById('question-text')?.classList.toggle('question-marked', !!q.isMarkedDifficult);

    // reset per-question timer display
    if (quizTimerMode === 'per_question') {
        const td = document.getElementById('time-display');
        if (td) td.textContent = fmtSecs(quizPerQSecs);
        const box = document.getElementById('quizTimerBox');
        if (box) box.classList.remove('timer-warning');
    }

    const opts    = document.getElementById('options'); opts.innerHTML = '';
    const letters = ['A','B','C','D','E','F','G','H'];
    q.options.forEach((opt, i) => {
        const b = document.createElement('button'); b.className = 'option-btn';
        b.innerHTML = `<span class="option-prefix">${letters[i]}</span><span class="option-text">${escHtml(opt)}</span>`;
        b.onclick = () => {
            if (b.disabled) return;
            stopQuizTimer();
            document.querySelectorAll('.option-btn').forEach(x => x.disabled = true);
            if (i === q.correctIndex) { b.classList.add('correct'); score++; }
            else {
                b.classList.add('incorrect');
                document.querySelectorAll('.option-btn')[q.correctIndex]?.classList.add('correct');
                incorrectQuestions.push({ ...q, selectedAnswer: opt });
            }
            setTimeout(() => { currentQuestionIndex++; loadQuestion(currentQuestionIndex); }, 1000);
        };
        opts.appendChild(b);
    });

    // Start per-question timer AFTER options are rendered
    if (quizTimerMode === 'per_question') startPerQuestionTimer();
}

function showResults() {
    const c   = document.getElementById('quizContainer');
    const acc = Math.round((score / currentQuizQuestions.length) * 100);
    let medal = '';
    if (acc === 100) { medal = '🥇'; medalCounts.gold++;   localStorage.setItem('medalGold',   medalCounts.gold); }
    else if (acc >= 80) { medal = '🥈'; medalCounts.silver++; localStorage.setItem('medalSilver', medalCounts.silver); }
    else if (acc >= 60) { medal = '🥉'; medalCounts.bronze++; localStorage.setItem('medalBronze', medalCounts.bronze); }
    updateMedalDisplay();

    // Record attempt in revision planner
    if (currentQuiz?.id) {
        recordQuizAttempt(currentQuiz.id, score, currentQuizQuestions.length);
    }

    c.innerHTML = `<div class="results-container">
        <div class="results-header">
            <h2>Quiz Completed! ${medal || '🎉'}</h2>
            <div class="score-circle"><span class="score-number">${score}</span><span class="score-total">/${currentQuizQuestions.length}</span></div>
            <p class="accuracy-text">Accuracy: ${acc}%</p>
        </div>
        <div class="incorrect-answers">
            <h3>${incorrectQuestions.length ? '📝 Review Incorrect Answers' : '✨ Perfect Score!'}</h3>
            ${incorrectQuestions.map((item, i) => `
                <div class="incorrect-item">
                    <p class="question"><strong>Q${i+1}:</strong> ${escHtml(item.question)}</p>
                    <p class="wrong-answer"><i class="fas fa-times"></i> ${escHtml(item.selectedAnswer || 'Not answered')}</p>
                    <p class="correct-answer"><i class="fas fa-check"></i> ${escHtml(item.options[item.correctIndex])}</p>
                    ${item.explanation ? `<p class="explanation"><i class="fas fa-info-circle"></i> ${escHtml(item.explanation)}</p>` : ''}
                </div>`).join('')}
        </div>
        <div class="results-actions">
            <button class="primary-btn"   onclick="restartQuiz()"><i class="fas fa-redo-alt"></i> Restart</button>
            <button class="secondary-btn" onclick="goHome()"><i class="fas fa-home"></i> Home</button>
        </div>
    </div>`;

    if (incorrectQuestions.length) saveDifficultQuestions();
    // difficult.js will append "Save Marked" button if needed
    appendSaveMarkedButton();
}

function restartQuiz() {
    if (!currentQuiz) return;
    stopQuizTimer();
    // Re-open settings dialog so user can change range/timer
    showQuizSettingsDialog(currentQuiz);
}
function exitQuiz() { stopQuizTimer(); goHome(); }

function markCurrentAsDifficult() {
    if (!currentQuizQuestions || currentQuestionIndex >= currentQuizQuestions.length) return;
    const q = currentQuizQuestions[currentQuestionIndex];
    q.isMarkedDifficult = !q.isMarkedDifficult;
    const btn = document.getElementById('markDifficultBtn');
    if (btn) {
        btn.className = 'mark-difficult-btn' + (q.isMarkedDifficult ? ' marked' : '');
        btn.innerHTML = q.isMarkedDifficult ? '<i class="fas fa-check"></i> Marked' : '<i class="fas fa-flag"></i> Mark Difficult';
    }
    const qt = document.getElementById('question-text');
    if (qt) qt.classList.toggle('question-marked', q.isMarkedDifficult);

    // sync with difficult.js list
    if (q.isMarkedDifficult) {
        if (!markedDifficultList.find(x => x.question === q.question))
            markedDifficultList.push({ ...q, markedIndex: currentQuestionIndex });
    } else {
        markedDifficultList = markedDifficultList.filter(x => x.question !== q.question);
    }
    showToast(q.isMarkedDifficult ? 'Marked for review' : 'Unmarked', 'info');
}

async function saveDifficultQuestions() {
    if (!currentFolder || !incorrectQuestions.length) return;
    const dfName = `${currentFolder.name}_Difficult`;
    let df = findItemByName(dfName);
    if (!df) {
        df = { id:generateId(), name:dfName, type:'folder', parentId:currentFolder.id, children:[],
               path:currentFolder.path+'/'+dfName, metadata:{ created:new Date().toISOString() } };
        await saveItem(df);
    }
    const dqName = 'Difficult Questions';
    let dq = df.children?.find(c => c.type === 'quiz' && c.name === dqName);
    if (!dq) {
        dq = { id:generateId(), name:dqName, type:'quiz', parentId:df.id, questions:[...incorrectQuestions],
               path:df.path+'/'+dqName, metadata:{ created:new Date().toISOString(), tags:['difficult'] } };
    } else {
        dq.questions = [...(dq.questions||[]), ...incorrectQuestions];
        dq.metadata.modified = new Date().toISOString();
    }
    await saveItem(dq);
    await loadFolderStructure();
}

// ── Shuffle All Options ───────────────────────
// Permanently randomises option order across ALL quizzes in current folder
// correctIndex is updated to match the new position
async function shuffleAllOptions() {
    if (!currentFolder) { showToast('Navigate into a folder first', 'warning'); return; }

    // Collect all quizzes recursively under current folder
    const quizzes = [];
    const collect = (node) => {
        if (node.type === 'quiz') quizzes.push(node);
        node.children?.forEach(collect);
    };
    collect(currentFolder);

    if (!quizzes.length) { showToast('No quizzes found in this folder', 'warning'); return; }

    const total = quizzes.reduce((s, q) => s + (q.questions?.length || 0), 0);
    if (!confirm(`Permanently shuffle option order for all ${total} questions in "${currentFolder.name}"?\n\nThis cannot be undone.`)) return;

    for (const quiz of quizzes) {
        if (!quiz.questions?.length) continue;
        quiz.questions.forEach(q => {
            const correct = q.options[q.correctIndex];  // save correct answer text
            // Fisher-Yates shuffle options
            for (let i = q.options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
            }
            q.correctIndex = q.options.indexOf(correct);  // find new position
        });
        await saveItem(quiz);
    }

    showToast(`✅ Options shuffled across ${quizzes.length} quiz${quizzes.length > 1 ? 'zes' : ''}`, 'success');
}

// ── Quiz Mode Selector ────────────────────────
function startQuizMode() {
    if (!currentFolder) { showToast('Please select a folder', 'warning'); return; }
    const quizzes = currentFolder.children?.filter(c => c.type === 'quiz') || [];
    if (!quizzes.length) { showToast('No quizzes in this folder', 'warning'); return; }
    if (quizzes.length === 1) startQuiz(quizzes[0].id);
    else showQuizSelectorModal(quizzes, startQuiz);
}

function showQuizSelectorModal(quizzes, onSelect, title = 'Select Quiz') {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="modal-content glass-card">
        <div class="modal-header"><h3>${escHtml(title)}</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button></div>
        <div class="quiz-selector-list">${quizzes.map(q => `
            <div class="quiz-selector-item">
                <i class="fas fa-file-alt"></i><span>${escHtml(q.name)}</span>
                <span class="badge">${q.questions?.length || 0} questions</span>
            </div>`).join('')}
        </div></div>`;
    document.body.appendChild(m);
    m.querySelectorAll('.quiz-selector-item').forEach((el, i) => {
        el.addEventListener('click', () => { m.remove(); onSelect(quizzes[i].id); });
    });
}

function showDifficultQuestions() {
    if (!currentFolder) { showToast('Please select a folder', 'warning'); return; }
    const df = findItemByName(`${currentFolder.name}_Difficult`);
    if (!df) { showToast('No difficult questions found', 'info'); return; }
    const dq = df.children?.find(c => c.type === 'quiz');
    if (dq) startQuiz(dq.id); else showToast('No difficult questions found', 'info');
}

// ── Flashcards ────────────────────────────────
function showFlashcards() {
    if (!currentFolder) { showToast('Navigate into a folder first', 'warning'); return; }
    const quizzes = currentFolder.children?.filter(c => c.type === 'quiz') || [];
    if (!quizzes.length) { showToast('No quizzes in this folder', 'warning'); return; }
    if (quizzes.length === 1) displayFlashcards(quizzes[0].id);
    else showQuizSelectorModal(quizzes, displayFlashcards, 'Select Quiz for Flashcards');
}

function displayFlashcards(quizId) {
    const quiz = typeof quizId === 'string' ? findItemById(quizId) : quizId;
    if (!quiz || quiz.type !== 'quiz' || !quiz.questions?.length) {
        showToast('No questions available', 'warning'); return;
    }

    showView('flashcardContainer');
    const fc = document.getElementById('flashcardContainer');
    const total   = quiz.questions.length;
    const letters = ['A','B','C','D','E','F','G','H'];

    // Build cards with exact old site HTML structure
    const cardsHTML = quiz.questions.map((q, i) => `
        <div class="flashcard" data-idx="${i}">
            <button class="fc-edit-btn" onclick="event.stopPropagation();openFlashcardEdit('${quiz.id}',${i})" title="Edit">✏️</button>
            <div class="flashcard-inner">
                <!-- FRONT -->
                <div class="flashcard-front">
                    <div class="flashcard-content">
                        <span class="flashcard-q-num">${i + 1}</span>
                        ${(q.isMarkedDifficult || q.timesIncorrect) ? `<span class="flashcard-diff-badge">⚠ Difficult</span>` : ''}
                        <p class="flashcard-question">${escHtml(q.question)}</p>
                        <div class="flashcard-options">
                            ${q.options.map((o, j) => `
                                <div class="flashcard-option${j === q.correctIndex ? ' correct-option' : ''}">
                                    <span class="flashcard-opt-letter">${letters[j]}</span>
                                    <span>${escHtml(o)}</span>
                                </div>`).join('')}
                        </div>
                        <p class="flashcard-hint">Click to reveal answer</p>
                    </div>
                </div>
                <!-- BACK -->
                <div class="flashcard-back">
                    <div class="flashcard-content">
                        <span class="flashcard-q-num">${i + 1}</span>
                        <div class="flashcard-answer-label">✅ Correct Answer</div>
                        <div class="flashcard-answer-text">${letters[q.correctIndex]}. ${escHtml(q.options[q.correctIndex])}</div>
                        ${q.explanation ? `<div class="flashcard-explanation">💡 ${escHtml(q.explanation)}</div>` : ''}
                        <p class="flashcard-hint">Click to flip back</p>
                    </div>
                </div>
            </div>
        </div>`).join('');

    fc.innerHTML = `
        <div class="fc-toolbar">
            <span class="fc-toolbar-title">📚 ${escHtml(quiz.name)}</span>
            <span class="fc-meta" id="fcRevealedCount">0 / ${total} revealed</span>
            <input class="fc-search" id="fcSearch" type="text" placeholder="🔍 Search questions…">
            <button class="fc-btn" onclick="fcRevealAll(true)">Reveal All</button>
            <button class="fc-btn" onclick="fcRevealAll(false)">Hide All</button>
            <button class="fc-btn danger" onclick="goHome()">← Back</button>
        </div>
        <div class="flashcard-main-container" id="fcGrid">
            ${cardsHTML}
            <div id="fcNoResults" class="fc-no-results">No questions match your search.</div>
        </div>`;

    // Click to flip — uses old site .flipped class
    fc.querySelectorAll('.flashcard').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
            fcUpdateCount();
        });
    });

    // Live search
    fc.querySelector('#fcSearch').addEventListener('input', function() {
        const term = this.value.toLowerCase().trim();
        let visible = 0;
        fc.querySelectorAll('.flashcard').forEach(card => {
            const txt = card.querySelector('.flashcard-question')?.textContent.toLowerCase() || '';
            const show = !term || txt.includes(term);
            card.style.display = show ? '' : 'none';
            if (show) visible++;
        });
        const nr = document.getElementById('fcNoResults');
        if (nr) nr.classList.toggle('visible', visible === 0);
        fcUpdateCount();
    });

    fcUpdateCount();
}

function fcUpdateCount() {
    const el = document.getElementById('fcRevealedCount'); if (!el) return;
    const all      = document.querySelectorAll('#fcGrid .flashcard:not([style*="display: none"])');
    const revealed = document.querySelectorAll('#fcGrid .flashcard.flipped:not([style*="display: none"])');
    el.textContent = `${revealed.length} / ${all.length} revealed`;
}

function fcRevealAll(state) {
    document.querySelectorAll('#fcGrid .flashcard').forEach(c => c.classList.toggle('flipped', state));
    fcUpdateCount();
}
function flipAll(state) { fcRevealAll(state); }

// ── Flashcard Edit Modal ──────────────────────
function openFlashcardEdit(quizId, qIndex) {
    const quiz = findItemById(quizId); if (!quiz) return;
    const q    = quiz.questions[qIndex]; if (!q) return;
    const letters = ['A','B','C','D','E','F','G','H'];

    const m = document.createElement('div'); m.className = 'modal'; m.id = 'fcEditModal';
    m.innerHTML = `
    <div class="modal-content glass-card" style="max-width:540px;">
        <div class="modal-header">
            <h3>✏️ Edit Question ${qIndex + 1}</h3>
            <button class="close-btn" onclick="document.getElementById('fcEditModal').remove()">✕</button>
        </div>
        <div class="form-group">
            <label>Question</label>
            <textarea id="fcEditQ" rows="3" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-family:inherit;font-size:0.9rem;resize:vertical;">${escHtml(q.question)}</textarea>
        </div>
        <div class="form-group">
            <label>Options &nbsp;<small style="color:#999;">— select ✓ for correct answer</small></label>
            <div style="display:flex;flex-direction:column;gap:8px;">
                ${q.options.map((opt, j) => `
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="width:24px;height:24px;border-radius:50%;background:#4a6fa5;color:white;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;flex-shrink:0;">${letters[j]}</span>
                    <input type="text" class="fc-edit-opt" data-j="${j}" value="${escHtml(opt)}"
                        style="flex:1;padding:7px 10px;border:1px solid #ddd;border-radius:4px;font-family:inherit;font-size:0.88rem;">
                    <label style="display:flex;align-items:center;gap:4px;font-size:0.8rem;cursor:pointer;white-space:nowrap;">
                        <input type="radio" name="fcCorrect" value="${j}" ${j === q.correctIndex ? 'checked' : ''}
                            style="width:16px;height:16px;accent-color:#27ae60;cursor:pointer;">
                        Correct
                    </label>
                </div>`).join('')}
            </div>
        </div>
        <div class="form-group">
            <label>Explanation <small style="color:#999;">(optional)</small></label>
            <textarea id="fcEditExpl" rows="2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-family:inherit;font-size:0.88rem;resize:vertical;">${escHtml(q.explanation || '')}</textarea>
        </div>
        <div class="modal-footer">
            <button class="danger-btn" style="margin-right:auto;" onclick="deleteFlashcardQuestion('${quizId}',${qIndex})">🗑 Delete</button>
            <button class="secondary-btn" onclick="document.getElementById('fcEditModal').remove()">Cancel</button>
            <button class="primary-btn" onclick="saveFlashcardEdit('${quizId}',${qIndex})">💾 Save</button>
        </div>
    </div>`;
    document.body.appendChild(m);
}

async function saveFlashcardEdit(quizId, qIndex) {
    const quiz = findItemById(quizId); if (!quiz) return;
    const q    = quiz.questions[qIndex];
    const newQ = document.getElementById('fcEditQ')?.value.trim();
    if (!newQ) { showToast('Question cannot be empty', 'warning'); return; }
    const opts = Array.from(document.querySelectorAll('.fc-edit-opt')).map(i => i.value.trim());
    if (opts.some(o => !o)) { showToast('Options cannot be empty', 'warning'); return; }
    const correctR = document.querySelector('input[name="fcCorrect"]:checked');
    q.question     = newQ;
    q.options      = opts;
    q.correctIndex = correctR ? parseInt(correctR.value) : q.correctIndex;
    q.explanation  = document.getElementById('fcEditExpl')?.value.trim() || '';
    await saveItem(quiz);
    document.getElementById('fcEditModal')?.remove();
    showToast('Question updated ✓', 'success');
    displayFlashcards(quizId);
}

async function deleteFlashcardQuestion(quizId, qIndex) {
    if (!confirm('Delete this question permanently?')) return;
    const quiz = findItemById(quizId); if (!quiz) return;
    quiz.questions.splice(qIndex, 1);
    await saveItem(quiz);
    document.getElementById('fcEditModal')?.remove();
    showToast('Question deleted', 'info');
    if (quiz.questions.length) displayFlashcards(quizId);
    else goHome();
}

// ── Add Question Dialog ───────────────────────
function showAddQuestionDialog() {
    if (!currentFolder) { showToast('Navigate into a folder first', 'warning'); return; }
    const quizzes = currentFolder.children?.filter(c => c.type === 'quiz') || [];
    if (!quizzes.length) {
        if (confirm('No quizzes in folder. Create one?')) createNewQuiz();
        return;
    }
    if (quizzes.length === 1) openAddQuestionModal(quizzes[0].id);
    else showQuizSelectorModal(quizzes, openAddQuestionModal, 'Select Quiz to Add Question');
}

function showAddQuestionToQuizDialog(quizId) { openAddQuestionModal(quizId); }

function openAddQuestionModal(quizId) {
    const quiz = findItemById(quizId); if (!quiz) return;
    const buildOptions = (n = 4) => {
        let h = '';
        for (let i = 0; i < n; i++) {
            h += `<div class="option-input-row" data-opt="${i}">
                <span class="opt-letter">${String.fromCharCode(65+i)}</span>
                <input type="text" placeholder="Option ${String.fromCharCode(65+i)}" id="opt${i}">
                <input type="radio" name="correctOpt" value="${i}" ${i===0?'checked':''} title="Correct">
                <button class="remove-opt-btn" onclick="removeOptionRow(this)">✕</button>
            </div>`;
        }
        return h;
    };
    const m = document.createElement('div'); m.className = 'modal'; m.id = 'aqModal';
    m.innerHTML = `<div class="modal-content glass-card" style="max-width:580px;">
        <div class="modal-header">
            <h3><i class="fas fa-plus-circle"></i> Add Question — ${escHtml(quiz.name)}</h3>
            <button class="close-btn" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
        </div>
        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab(this,'tabManual')">✏️ Manual</button>
            <button class="tab-btn"        onclick="switchTab(this,'tabJson')">📋 Bulk JSON</button>
        </div>
        <!-- Manual -->
        <div id="tabManual" class="tab-content active">
            <div class="form-group"><label>Question *</label>
                <textarea id="aqQuestion" rows="3" placeholder="Enter your question here…"></textarea></div>
            <div class="form-group"><label>Options (select radio = correct answer) *</label>
                <div id="optionsInputList" class="options-input-list">${buildOptions(4)}</div>
                <button class="add-option-btn" onclick="addOptionRow()"><i class="fas fa-plus"></i> Add Option</button>
            </div>
            <div class="form-group"><label>Explanation (optional)</label>
                <textarea id="aqExplanation" rows="2" placeholder="Why is the correct answer correct?"></textarea></div>
            <div class="modal-footer">
                <button class="secondary-btn" onclick="this.closest('.modal').remove()">Cancel</button>
                <button class="primary-btn" onclick="saveManualQuestion('${quizId}')"><i class="fas fa-save"></i> Save</button>
            </div>
        </div>
        <!-- Bulk JSON -->
        <div id="tabJson" class="tab-content">
            <p style="color:#64748b;font-size:0.9rem;margin-bottom:12px;">Paste a JSON array of questions:</p>
            <pre style="background:rgba(0,0,0,0.04);padding:12px;border-radius:8px;font-size:0.8rem;overflow-x:auto;margin-bottom:12px;">[
  { "question":"…", "options":["A","B","C","D"], "correctIndex":0, "explanation":"…" },
  …
]</pre>
            <div class="form-group"><label>Insert at position (blank = append)</label>
                <input type="number" id="aqInsertPos" placeholder="e.g. 3 (1-based)" min="1"></div>
            <div class="form-group"><label>JSON Array *</label>
                <textarea class="json-textarea" id="aqJsonInput" placeholder="Paste JSON here…"></textarea></div>
            <div class="modal-footer">
                <button class="secondary-btn" onclick="this.closest('.modal').remove()">Cancel</button>
                <button class="primary-btn" onclick="saveBulkJsonQuestions('${quizId}')"><i class="fas fa-upload"></i> Import</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(m);
}

function switchTab(btn, tabId) {
    btn.closest('.modal-content').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.closest('.modal-content').querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function addOptionRow() {
    const list = document.getElementById('optionsInputList');
    const i    = list.querySelectorAll('.option-input-row').length;
    if (i >= 8) { showToast('Maximum 8 options', 'warning'); return; }
    const div = document.createElement('div'); div.className = 'option-input-row'; div.dataset.opt = i;
    div.innerHTML = `<span class="opt-letter">${String.fromCharCode(65+i)}</span>
        <input type="text" placeholder="Option ${String.fromCharCode(65+i)}" id="opt${i}">
        <input type="radio" name="correctOpt" value="${i}" title="Correct">
        <button class="remove-opt-btn" onclick="removeOptionRow(this)">✕</button>`;
    list.appendChild(div);
}

function removeOptionRow(btn) {
    const list = document.getElementById('optionsInputList');
    if (list.querySelectorAll('.option-input-row').length <= 2) { showToast('Minimum 2 options', 'warning'); return; }
    btn.closest('.option-input-row').remove();
    list.querySelectorAll('.option-input-row').forEach((row, i) => {
        row.querySelector('.opt-letter').textContent = String.fromCharCode(65+i);
        row.querySelector('input[type="text"]').id   = `opt${i}`;
        row.querySelector('input[type="radio"]').value = i;
    });
}

async function saveManualQuestion(quizId) {
    const question = document.getElementById('aqQuestion')?.value.trim();
    if (!question) { showToast('Question is required', 'error'); return; }
    const opts = [];
    document.querySelectorAll('#optionsInputList .option-input-row').forEach((row, i) => {
        opts.push(row.querySelector('input[type="text"]').value.trim() || `Option ${String.fromCharCode(65+i)}`);
    });
    if (opts.filter(o => o).length < 2) { showToast('At least 2 options required', 'error'); return; }
    const correctIndex  = parseInt(document.querySelector('input[name="correctOpt"]:checked')?.value) || 0;
    const explanation   = document.getElementById('aqExplanation')?.value.trim();
    const quiz = findItemById(quizId); if (!quiz) return;
    quiz.questions = [...(quiz.questions || []), { question, options:opts, correctIndex, explanation: explanation||undefined }];
    quiz.metadata  = { ...quiz.metadata, questionCount: quiz.questions.length, modified: new Date().toISOString() };
    await saveItem(quiz); await loadFolderStructure();
    document.getElementById('aqModal')?.remove();
    refreshView(); showToast('Question added!', 'success');
}

async function saveBulkJsonQuestions(quizId) {
    const raw = document.getElementById('aqJsonInput')?.value.trim();
    if (!raw) { showToast('Paste a JSON array first', 'error'); return; }
    let data;
    try { data = JSON.parse(raw); } catch(e) { showToast('Invalid JSON: '+e.message, 'error'); return; }
    if (!Array.isArray(data)) { showToast('JSON must be an array', 'error'); return; }
    const valid = data.filter(q => q.question && Array.isArray(q.options) && q.correctIndex !== undefined);
    if (!valid.length) { showToast('No valid questions found', 'error'); return; }
    const posInput = document.getElementById('aqInsertPos')?.value.trim();
    const quiz = findItemById(quizId); if (!quiz) return;
    const existing = [...(quiz.questions || [])];
    let insertAt = existing.length;
    if (posInput !== '') { const p = parseInt(posInput); if (!isNaN(p) && p >= 1) insertAt = Math.min(p-1, existing.length); }
    existing.splice(insertAt, 0, ...valid);
    quiz.questions = existing;
    quiz.metadata  = { ...quiz.metadata, questionCount: quiz.questions.length, modified: new Date().toISOString() };
    await saveItem(quiz); await loadFolderStructure();
    document.getElementById('aqModal')?.remove();
    refreshView(); showToast(`Inserted ${valid.length} questions at position ${insertAt+1}`, 'success');
}

// ── Smart Upload ──────────────────────────────
function showFileUploadModal() {
    if (!currentFolder) { showToast('Navigate into a folder first', 'warning'); return; }
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="modal-content glass-card" style="max-width:600px;">
        <div class="modal-header"><h3><i class="fas fa-upload"></i> Upload Questions</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button></div>
        <div class="upload-info-box">
            <p><strong>Upload to:</strong> ${escHtml(currentFolder.path)}</p>
            <p style="margin-top:8px;"><strong>Auto-detects format:</strong></p>
            <ul><li><strong>Array</strong> → Single quiz</li><li><strong>Object {name:[questions]}</strong> → Multiple folders</li></ul>
        </div>
        <div style="text-align:center;margin:20px 0;">
            <input type="file" id="uploadFileInput" accept=".json" style="display:none;">
            <button class="primary-btn large" onclick="document.getElementById('uploadFileInput').click()"><i class="fas fa-file-upload"></i> Select JSON File</button>
            <p id="selectedFileName" style="margin-top:10px;font-family:monospace;color:var(--primary-color);"></p>
        </div>
        <div id="previewArea" class="preview-area" style="display:none;margin-top:20px;"></div>
    </div>`;
    document.body.appendChild(m);
    document.getElementById('uploadFileInput').onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        document.getElementById('selectedFileName').textContent = `📄 ${f.name}`;
        analyzeFile(f);
    };
}

function analyzeFile(file) {
    const r = new FileReader();
    r.onload = e => {
        try {
            const data = JSON.parse(e.target.result); currentUploadData = data;
            const pa = document.getElementById('previewArea'); pa.style.display = 'block';
            if (Array.isArray(data)) {
                const valid = data.filter(q => q.question && Array.isArray(q.options) && q.correctIndex !== undefined);
                pa.innerHTML = `<span class="file-type-badge">📄 Single Quiz</span>
                    <p>Found <strong>${valid.length}</strong> valid questions of ${data.length}</p>
                    <div class="sample-preview"><ul>${valid.slice(0,3).map(q=>`<li>${escHtml(q.question.substring(0,60))}…</li>`).join('')}</ul></div>
                    <div style="margin-top:16px;"><button class="primary-btn" onclick="processSingleQuizUpload()"><i class="fas fa-file-alt"></i> Create Quiz</button></div>`;
            } else if (typeof data === 'object' && data !== null) {
                const keys = Object.keys(data).filter(k => !k.includes('_Incorrect'));
                pa.innerHTML = `<span class="file-type-badge">📂 Multiple Folders</span>
                    <p>Found <strong>${keys.length}</strong> folder(s)</p>
                    <div class="sample-preview"><ul>${keys.slice(0,5).map(k=>`<li>${escHtml(k)} — ${Array.isArray(data[k])?data[k].length:0} Q</li>`).join('')}</ul></div>
                    <div style="margin-top:16px;"><button class="primary-btn" onclick="processMultipleFoldersUpload()"><i class="fas fa-folder-tree"></i> Create Folders</button></div>`;
            } else pa.innerHTML = '<p style="color:var(--danger-color);">❌ Unrecognized format.</p>';
        } catch(err) { showToast('JSON parse error: '+err.message, 'error'); }
    };
    r.readAsText(file);
}

async function processSingleQuizUpload() {
    if (!currentFolder || !currentUploadData) return;
    const name = prompt('Quiz name:', 'Imported Quiz'); if (!name) return;
    const valid = (Array.isArray(currentUploadData)?currentUploadData:[currentUploadData])
        .filter(q => q.question && Array.isArray(q.options) && q.correctIndex !== undefined);
    if (!valid.length) { showToast('No valid questions', 'error'); return; }
    const nq = { id:generateId(), name:name.trim(), type:'quiz', parentId:currentFolder.id, questions:valid,
        path:currentFolder.path+'/'+name.trim(), metadata:{created:new Date().toISOString(),questionCount:valid.length} };
    await saveItem(nq); await loadFolderStructure();
    document.querySelector('.modal')?.remove(); refreshView();
    showToast(`Created "${name.trim()}" with ${valid.length} questions`, 'success');
    currentUploadData = null;
}

async function processMultipleFoldersUpload() {
    if (!currentFolder || !currentUploadData) return;
    const data = currentUploadData; let count = 0;
    for (const [folderName, folderData] of Object.entries(data)) {
        if (folderName.includes('_Incorrect') || !Array.isArray(folderData)) continue;
        const nf = { id:generateId(), name:folderName, type:'folder', parentId:currentFolder.id, children:[],
            path:currentFolder.path+'/'+folderName, metadata:{created:new Date().toISOString()} };
        await saveItem(nf);
        const valid = folderData.filter(q => q.question && Array.isArray(q.options) && q.correctIndex !== undefined);
        if (valid.length) {
            const nq = { id:generateId(), name:folderName+' Quiz', type:'quiz', parentId:nf.id, questions:valid,
                path:nf.path+'/'+folderName+' Quiz', metadata:{created:new Date().toISOString(),questionCount:valid.length,tags:['imported']} };
            await saveItem(nq); count += valid.length;
        }
        if (data[folderName+'_Incorrect']?.length) {
            const iq = { id:generateId(), name:'Difficult Questions', type:'quiz', parentId:nf.id, questions:data[folderName+'_Incorrect'],
                path:nf.path+'/Difficult Questions', metadata:{created:new Date().toISOString(),tags:['difficult','imported']} };
            await saveItem(iq);
        }
    }
    await loadFolderStructure(); document.querySelector('.modal')?.remove(); refreshView();
    showToast(`Imported ${count} questions into multiple folders`, 'success');
    currentUploadData = null;
}

// ── Quick Upload ──────────────────────────────
function quickUpload(type) {
    const inp = document.getElementById('hiddenFileInput');
    inp.dataset.uploadType = type; inp.onchange = handleQuickUpload; inp.click();
}
async function handleQuickUpload(e) {
    const file = e.target.files[0]; const type = e.target.dataset.uploadType;
    if (!file || !currentFolder) return; e.target.value = '';
    const r = new FileReader();
    r.onload = async ev => {
        try {
            const data = JSON.parse(ev.target.result);
            if (!Array.isArray(data)) { showToast('Quick upload requires a JSON array', 'error'); return; }
            const valid = data.filter(q => q.question && Array.isArray(q.options) && q.correctIndex !== undefined);
            if (!valid.length) { showToast('No valid questions', 'error'); return; }
            if (type === 'new') {
                const name = prompt('Quiz name:', 'Quick Import'); if (!name) return;
                const nq = { id:generateId(), name, type:'quiz', parentId:currentFolder.id, questions:valid,
                    path:currentFolder.path+'/'+name, metadata:{created:new Date().toISOString(),questionCount:valid.length} };
                await saveItem(nq); await loadFolderStructure(); refreshView();
                showToast(`Created "${name}" with ${valid.length} questions`, 'success');
            } else {
                const quizzes = currentFolder.children?.filter(c => c.type === 'quiz') || [];
                if (!quizzes.length) { showToast('No quizzes in folder', 'warning'); return; }
                showQuizSelectorModal(quizzes, async qid => { await addQuestionsToQuiz(qid, valid); }, 'Add to which quiz?');
            }
        } catch(err) { showToast('Error: '+err.message, 'error'); }
    };
    r.readAsText(file);
}

async function addQuestionsToQuiz(quizId, questions) {
    const quiz = findItemById(quizId); if (!quiz) return;
    quiz.questions = [...(quiz.questions||[]), ...questions];
    quiz.metadata  = { ...quiz.metadata, questionCount: quiz.questions.length, modified: new Date().toISOString() };
    await saveItem(quiz); await loadFolderStructure(); refreshView();
    showToast(`Added ${questions.length} questions to "${quiz.name}"`, 'success');
}

// ── Legacy Import ─────────────────────────────
function showLegacyImportOptions() {
    if (!currentFolder) { showToast('Navigate into a folder first', 'warning'); return; }
    const inp = document.getElementById('hiddenFileInput');
    inp.onchange = handleLegacyImport; inp.click();
}
async function handleLegacyImport(e) {
    const file = e.target.files[0]; if (!file||!currentFolder) return; e.target.value = '';
    const r = new FileReader();
    r.onload = async ev => {
        try {
            const data = JSON.parse(ev.target.result); let count = 0;
            for (const [key, val] of Object.entries(data)) {
                if (key.includes('_Incorrect') || !Array.isArray(val)) continue;
                const nf = { id:generateId(), name:key, type:'folder', parentId:currentFolder.id, children:[],
                    path:currentFolder.path+'/'+key, metadata:{created:new Date().toISOString()} };
                await saveItem(nf);
                const valid = val.filter(q => q.question && Array.isArray(q.options) && q.correctIndex !== undefined);
                if (valid.length) {
                    const nq = { id:generateId(), name:key+' Quiz', type:'quiz', parentId:nf.id, questions:valid,
                        path:nf.path+'/'+key+' Quiz', metadata:{created:new Date().toISOString(),questionCount:valid.length,tags:['legacy']} };
                    await saveItem(nq); count += valid.length;
                }
                if (data[key+'_Incorrect']?.length) {
                    const iq = { id:generateId(), name:'Difficult Questions', type:'quiz', parentId:nf.id, questions:data[key+'_Incorrect'],
                        path:nf.path+'/Difficult Questions', metadata:{created:new Date().toISOString(),tags:['difficult']} };
                    await saveItem(iq);
                }
            }
            await loadFolderStructure(); refreshView();
            showToast(`Imported ${count} questions from legacy format`, 'success');
        } catch(err) { showToast('Error: '+err.message, 'error'); }
    };
    r.readAsText(file);
}

// ── Backup / Restore ──────────────────────────
function showBackupOptions() {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="modal-content glass-card" style="max-width:480px;">
        <div class="modal-header"><h3><i class="fas fa-database"></i> Backup & Restore</h3>
        <button class="close-btn" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button></div>
        <div class="backup-options-grid">
            <div class="backup-option" onclick="createFullBackup();this.closest('.modal').remove()"><i class="fas fa-box"></i><h4>Full Backup</h4><p>Export everything</p></div>
            <div class="backup-option" onclick="exportCurrentFolder();this.closest('.modal').remove()"><i class="fas fa-folder"></i><h4>Export Folder</h4><p>Current folder only</p></div>
            <div class="backup-option" onclick="exportLegacyFormat();this.closest('.modal').remove()"><i class="fas fa-history"></i><h4>Legacy Format</h4><p>Old compatible format</p></div>
            <div class="backup-option" onclick="restoreFromBackup()"><i class="fas fa-undo-alt"></i><h4>Restore</h4><p>Import a backup</p></div>
        </div>
    </div>`;
    document.body.appendChild(m);
}

async function createFullBackup() {
    const items = getAllItems();

    // Collect all journal/planner/habits data from IndexedDB journal store
    const journalKeys = ['todayTasks','goals','routine','routineDone','logs','history','timeSpent','habits','habitDone','revisionPlanner'];
    const journalData = {};
    for (const key of journalKeys) {
        const val = await jnlGet(key);
        if (val !== null) journalData[key] = val;
    }

    downloadJSON({
        version: '2.0',
        type: 'full_backup',
        date: new Date().toISOString(),
        structure: folderStructure,
        items,
        journalData,
        stats: {
            totalFolders:   items.filter(i=>i.type==='folder').length,
            totalQuizzes:   items.filter(i=>i.type==='quiz').length,
            totalQuestions: items.reduce((s,i)=>s+(i.questions?.length||0),0)
        }
    }, `full_backup_${new Date().toISOString().split('T')[0]}.json`);
    showToast('Full backup created (includes journal data)', 'success');
}

function exportCurrentFolder() {
    if (!currentFolder || currentFolder.id === 'root') { showToast('Navigate into a folder first', 'warning'); return; }
    downloadJSON({ version:'2.0', type:'folder_export', date:new Date().toISOString(), folder:{name:currentFolder.name,path:currentFolder.path},
        quizzes:currentFolder.children?.filter(c=>c.type==='quiz').map(q=>({name:q.name,questions:q.questions||[]})) || [] },
        `${currentFolder.name}_export_${new Date().toISOString().split('T')[0]}.json`);
    showToast(`"${currentFolder.name}" exported`, 'success');
}

function exportLegacyFormat() {
    const legacy = {};
    getAllItems().forEach(item => {
        if (item.type === 'quiz' && item.questions?.length) {
            const p = findItemById(item.parentId);
            if (p?.type === 'folder') {
                const k = item.metadata?.tags?.includes('difficult') ? p.name+'_Incorrect' : p.name;
                if (!legacy[k]) legacy[k] = []; legacy[k].push(...item.questions);
            }
        }
    });
    downloadJSON(legacy, `legacy_export_${new Date().toISOString().split('T')[0]}.json`);
    showToast('Legacy export complete', 'success');
}

function restoreFromBackup() {
    const inp = document.getElementById('hiddenFileInput');
    inp.onchange = handleRestore; inp.click();
    document.querySelector('.modal')?.remove();
}
async function handleRestore(e) {
    const file = e.target.files[0]; if (!file) return; e.target.value = '';
    const r = new FileReader();
    r.onload = async ev => {
        try {
            const backup = JSON.parse(ev.target.result);
            if (backup.version === '2.0' && backup.type === 'full_backup' && backup.items) {
                if (!confirm(`Restore full backup from ${backup.date}?\n\nThis will REPLACE:\n• All folders & quizzes\n• Journal, goals, habits, planner data\n\nThis cannot be undone.`)) return;
                await clearAllData();
                for (const item of backup.items) await saveItem(item);
                // Restore journal data if present
                if (backup.journalData) {
                    for (const [key, val] of Object.entries(backup.journalData)) {
                        await jnlSet(key, val);
                    }
                }
                await loadFolderStructure(); navigateToRoot();
                showToast('Full backup restored! (including journal data)', 'success');
            } else if (backup.version === '2.0' && backup.type === 'folder_export') {
                if (!currentFolder) { showToast('Navigate into a folder first', 'warning'); return; }
                const nf = { id:generateId(), name:backup.folder.name, type:'folder', parentId:currentFolder.id, children:[],
                    path:currentFolder.path+'/'+backup.folder.name, metadata:{created:new Date().toISOString()} };
                await saveItem(nf);
                for (const qd of backup.quizzes||[]) {
                    const nq = { id:generateId(), name:qd.name, type:'quiz', parentId:nf.id, questions:qd.questions||[],
                        path:nf.path+'/'+qd.name, metadata:{created:new Date().toISOString(),questionCount:qd.questions?.length||0,tags:['restored']} };
                    await saveItem(nq);
                }
                await loadFolderStructure(); refreshView();
                showToast(`Folder "${backup.folder.name}" restored`, 'success');
            } else showToast('Unknown backup format', 'error');
        } catch(err) { showToast('Restore error: '+err.message, 'error'); }
    };
    r.readAsText(file);
}
