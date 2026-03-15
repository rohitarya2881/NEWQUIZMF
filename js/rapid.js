/* =============================================
   rapid.js — Rapid Round (Study → Quiz with Timer)
   ============================================= */

let rapidSettings = { quizId:null, startIndex:1, endIndex:10, studyMin:5, quizMin:5 };
let rapidRapidTimer = null;
let rapidPhase = ''; // 'study' | 'quiz'

function startRapidRound() { startRapidRoundSetup(); }

function startRapidRoundSetup() {
    if (!currentFolder) { showToast('Navigate into a folder first', 'warning'); return; }
    const quizzes = currentFolder.children?.filter(c => c.type === 'quiz') || [];
    if (!quizzes.length) { showToast('No quizzes in this folder', 'warning'); return; }
    const maxQ = Math.max(...quizzes.map(q => q.questions?.length || 0));

    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="modal-content glass-card" style="max-width:480px;">
        <div class="modal-header">
            <h3><i class="fas fa-bolt"></i> Rapid Round Settings</h3>
            <button class="close-btn" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
        </div>
        <div class="form-group">
            <label>Select Quiz</label>
            <select id="rrQuizSelect" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;font-family:inherit;">
                ${quizzes.map(q => `<option value="${q.id}">${escHtml(q.name)} (${q.questions?.length||0} Q)</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Question Range</label>
            <div style="display:flex;gap:12px;align-items:center;">
                <input type="number" id="rrStart" value="1" min="1" max="${maxQ}" style="width:80px;padding:10px;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;text-align:center;">
                <span style="color:#64748b;font-weight:600;">to</span>
                <input type="number" id="rrEnd" value="${Math.min(10, maxQ)}" min="1" max="${maxQ}" style="width:80px;padding:10px;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;text-align:center;">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group">
                <label>Study Time (min)</label>
                <input type="number" id="rrStudyMin" value="5" min="0.5" step="0.5" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;">
            </div>
            <div class="form-group">
                <label>Quiz Time (min)</label>
                <input type="number" id="rrQuizMin" value="5" min="0.5" step="0.5" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;">
            </div>
        </div>
        <div class="modal-footer">
            <button class="secondary-btn" onclick="this.closest('.modal').remove()">Cancel</button>
            <button class="primary-btn" onclick="beginRapidRound()"><i class="fas fa-play"></i> Begin</button>
        </div>
    </div>`;
    document.body.appendChild(m);

    // Update range max when quiz changes
    m.querySelector('#rrQuizSelect').addEventListener('change', e => {
        const q = findItemById(e.target.value);
        const max = q?.questions?.length || 1;
        m.querySelector('#rrEnd').max   = max;
        m.querySelector('#rrStart').max = max;
        m.querySelector('#rrEnd').value = Math.min(10, max);
    });
}

function beginRapidRound() {
    const m = document.querySelector('.modal'); if (!m) return;
    const qid      = m.querySelector('#rrQuizSelect').value;
    const start    = parseInt(m.querySelector('#rrStart').value)    || 1;
    const end      = parseInt(m.querySelector('#rrEnd').value)      || 10;
    const studyMin = parseFloat(m.querySelector('#rrStudyMin').value) || 5;
    const quizMin  = parseFloat(m.querySelector('#rrQuizMin').value)  || 5;
    if (isNaN(start)||isNaN(end)||start>end||studyMin<=0||quizMin<=0) { showToast('Please enter valid settings','warning'); return; }
    rapidSettings = { quizId:qid, startIndex:start, endIndex:end, studyMin, quizMin };
    m.remove();
    beginRapidStudyPhase();
}

// ── Study Phase ───────────────────────────────
function beginRapidStudyPhase() {
    rapidPhase = 'study';
    const quiz = findItemById(rapidSettings.quizId); if (!quiz) return;
    const qs   = quiz.questions.slice(rapidSettings.startIndex - 1, rapidSettings.endIndex);
    const letters = ['A','B','C','D','E','F','G','H'];

    showView('flashcardContainer');
    const fc = document.getElementById('flashcardContainer');

    const cardsHTML = qs.map((q, i) => `
        <div class="flashcard">
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <div class="flashcard-content">
                        <span class="flashcard-q-num">${rapidSettings.startIndex + i}</span>
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
                <div class="flashcard-back">
                    <div class="flashcard-content">
                        <span class="flashcard-q-num">${rapidSettings.startIndex + i}</span>
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
            <span class="fc-toolbar-title">⚡ Rapid Round — Study Phase</span>
            <span class="fc-meta">Q${rapidSettings.startIndex}–${rapidSettings.endIndex} · ${qs.length} cards</span>
            <button class="fc-btn" onclick="document.querySelectorAll('#fcGrid .flashcard').forEach(c=>c.classList.add('flipped'))">Reveal All</button>
            <button class="fc-btn" onclick="document.querySelectorAll('#fcGrid .flashcard').forEach(c=>c.classList.remove('flipped'))">Hide All</button>
            <button class="fc-btn danger" onclick="clearRapidTimer();goHome()">✕ End</button>
        </div>
        <div class="flashcard-main-container" id="fcGrid">${cardsHTML}</div>`;

    fc.querySelectorAll('.flashcard').forEach(card => {
        card.addEventListener('click', () => card.classList.toggle('flipped'));
    });

    startRapidTimer(Math.floor(rapidSettings.studyMin * 60), '📚 Study Time', () => beginRapidQuizPhase());
}

// ── Quiz Phase ────────────────────────────────
function beginRapidQuizPhase() {
    rapidPhase = 'quiz';
    const quiz = findItemById(rapidSettings.quizId); if (!quiz) return;
    const qs   = quiz.questions.slice(rapidSettings.startIndex - 1, rapidSettings.endIndex);

    currentQuiz             = quiz;
    currentQuizQuestions    = shuffleArray(qs);
    currentQuestionIndex    = 0;
    score                   = 0;
    incorrectQuestions      = [];

    showView('quizContainer');
    buildQuizInterface();
    startRapidTimer(Math.floor(rapidSettings.quizMin * 60), '⏱️ Quiz Time', () => {
        showResults();
        showToast('Time up! Quiz ended', 'warning');
    });
}

// ── Timer ─────────────────────────────────────
function startRapidTimer(totalSeconds, label, onComplete) {
    clearRapidTimer();
    let el = document.getElementById('rapidTimerDisplay');
    if (!el) {
        el = document.createElement('div');
        el.id = 'rapidTimerDisplay';
        el.className = 'rapid-timer';
        document.body.appendChild(el);
    }
    el.innerHTML = `${label}: <strong id="rrTimerVal">${fmtSecs(totalSeconds)}</strong>`;

    let left = totalSeconds;
    rapidRapidTimer = setInterval(() => {
        left--;
        const tv = document.getElementById('rrTimerVal');
        if (tv) tv.textContent = fmtSecs(left);
        if (left <= 30) el.classList.add('warning');
        if (left <= 0)  { clearRapidTimer(); onComplete(); }
    }, 1000);
}

function clearRapidTimer() {
    if (rapidRapidTimer) { clearInterval(rapidRapidTimer); rapidRapidTimer = null; }
    const el = document.getElementById('rapidTimerDisplay');
    if (el) el.remove();
}