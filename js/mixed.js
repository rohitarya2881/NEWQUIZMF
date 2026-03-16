/* =============================================
   mixed.js — Mixed Quiz (Multi-Folder) 
   ============================================= */

let mixedState = {
    settings: { selectedFolders:[], totalQuestions:10, timePerQuestion:30, shuffleQuestions:true, equallyDistributed:true, questionPool:[], totalTime:0 },
    active: false, timer:null, timeLeft:0, index:0, score:0, incorrect:[]
};

// ── Settings Modal ────────────────────────────
function showMixedQuizSettings() {
    // Collect all quizzes across the full tree and group by parent folder name
    const allQuizzes = getAllItems().filter(i => i.type === 'quiz');
    const folderMap  = new Map();
    allQuizzes.forEach(q => {
        if (!q.questions?.length) return;
        const parent = findItemById(q.parentId);
        const name   = parent?.name || 'Root';
        if (!folderMap.has(name)) folderMap.set(name, []);
        folderMap.get(name).push(...q.questions.map(qq => ({ ...qq, sourceFolder:name, sourceQuiz:q.name })));
    });
    if (!folderMap.size) { showToast('No quizzes with questions found', 'warning'); return; }
    window._mixedFolderMap = folderMap;

    const m = document.createElement('div'); m.className = 'mixed-quiz-modal';
    m.innerHTML = `<div class="mixed-quiz-dialog">
        <h3><i class="fas fa-random"></i> Mixed Quiz Settings</h3>

        <div class="mixed-form-group">
            <div class="folder-selection-header">
                <h4>Select Folders / Quizzes</h4>
                <div class="folder-actions-row">
                    <button class="select-all-btn" onclick="mixedSelectAll(true)">Select All</button>
                    <button class="deselect-btn"   onclick="mixedSelectAll(false)">Clear</button>
                </div>
            </div>
            <input type="text" class="folder-search" id="mixedSearchInput" placeholder="Search folders…" oninput="mixedFilterFolders(this.value)">
            <div class="folder-checkbox-container" id="mixedFolderList">
                ${Array.from(folderMap.entries()).map(([name, qs]) => `
                    <div class="folder-checkbox-item" data-folder="${escHtml(name)}">
                        <input type="checkbox" id="mf_${escHtml(name)}" value="${escHtml(name)}" onchange="updateMixedSummary()">
                        <label for="mf_${escHtml(name)}">${escHtml(name)} — ${qs.length} questions</label>
                    </div>`).join('')}
            </div>
            <p class="selected-count-text" id="mixedSelCount">Selected: 0 folders</p>
        </div>

        <div class="mixed-form-group">
            <label>Total Questions</label>
            <input type="number" id="mixedTotalQ" value="10" min="1" max="200" oninput="updateMixedSummary()">
        </div>
        <div class="mixed-form-group">
            <label>Time per Question (seconds)</label>
            <input type="number" id="mixedTimePerQ" value="30" min="5" max="180" oninput="updateMixedSummary()">
        </div>
        <div class="mixed-form-group">
            <div class="mixed-checkbox-row">
                <input type="checkbox" id="mixedShuffle" checked>
                <label for="mixedShuffle">Shuffle Questions</label>
            </div>
            <div class="mixed-checkbox-row">
                <input type="checkbox" id="mixedEqual" checked onchange="updateMixedSummary()">
                <label for="mixedEqual">Equally Distribute Among Folders</label>
            </div>
        </div>

        <div id="mixedSummaryBox" class="mixed-summary-box" style="display:none;"></div>

        <div class="mixed-button-group">
            <button class="secondary-btn" onclick="this.closest('.mixed-quiz-modal').remove()">Cancel</button>
            <button class="primary-btn"   onclick="launchMixedQuiz()"><i class="fas fa-play"></i> Start Mixed Quiz</button>
        </div>
    </div>`;
    document.body.appendChild(m);
    updateMixedSummary();
}

// ── Helpers ───────────────────────────────────
function mixedSelectAll(state) {
    document.querySelectorAll('#mixedFolderList input[type="checkbox"]').forEach(cb => cb.checked = state);
    updateMixedSummary();
}

function mixedFilterFolders(term) {
    document.querySelectorAll('#mixedFolderList .folder-checkbox-item').forEach(item => {
        item.style.display = item.dataset.folder.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
}

function getMixedSelectedFolders() {
    return Array.from(document.querySelectorAll('#mixedFolderList input[type="checkbox"]:checked')).map(cb => cb.value);
}

function updateMixedSummary() {
    const sel  = getMixedSelectedFolders();
    const box  = document.getElementById('mixedSummaryBox');
    const cnt  = document.getElementById('mixedSelCount');
    if (cnt) cnt.textContent = `Selected: ${sel.length} folder${sel.length !== 1 ? 's' : ''}`;
    if (!box) return;
    if (!sel.length) { box.style.display = 'none'; return; }
    const fm         = window._mixedFolderMap;
    const totalAvail = sel.reduce((s, f) => s + (fm.get(f)?.length || 0), 0);
    const totalQ     = parseInt(document.getElementById('mixedTotalQ')?.value)  || 10;
    const timePerQ   = parseInt(document.getElementById('mixedTimePerQ')?.value) || 30;
    const equal      = document.getElementById('mixedEqual')?.checked;
    const totalSecs  = totalQ * timePerQ;
    box.style.display = 'block';
    box.innerHTML = `<strong>Summary</strong><br>
        📁 Folders: ${sel.join(', ')}<br>
        ❓ Questions: ${totalQ} (${totalAvail} available)<br>
        ⏱️ Time/Q: ${timePerQ}s → Total: ${Math.floor(totalSecs/60)}m ${totalSecs%60}s<br>
        ${equal ? `📊 Equal dist.: ~${Math.floor(totalQ/sel.length)} per folder` : '🔀 Random selection'}
        ${totalQ > totalAvail ? `<br><span style="color:var(--danger-color);">⚠️ Only ${totalAvail} questions available!</span>` : ''}`;
}

// ── Launch ────────────────────────────────────
function launchMixedQuiz() {
    const sel    = getMixedSelectedFolders();
    if (!sel.length) { showToast('Select at least one folder', 'warning'); return; }
    const totalQ  = parseInt(document.getElementById('mixedTotalQ')?.value)  || 10;
    const timePerQ= parseInt(document.getElementById('mixedTimePerQ')?.value) || 30;
    const shuffle = document.getElementById('mixedShuffle')?.checked !== false;
    const equal   = document.getElementById('mixedEqual')?.checked !== false;
    const fm      = window._mixedFolderMap;
    const avail   = sel.reduce((s, f) => s + (fm.get(f)?.length || 0), 0);
    if (totalQ > avail) { showToast(`Only ${avail} questions available — reduce count`, 'error'); return; }
    if (totalQ < 1)     { showToast('Enter a valid question count', 'warning'); return; }

    let pool = [];
    if (equal) {
        const perFolder = Math.floor(totalQ / sel.length);
        const rem       = totalQ % sel.length;
        sel.forEach((folder, i) => {
            let qs = fm.get(folder) || [];
            if (shuffle) qs = shuffleArray(qs);
            pool.push(...qs.slice(0, perFolder + (i < rem ? 1 : 0)));
        });
    } else {
        sel.forEach(folder => pool.push(...(fm.get(folder) || [])));
        if (shuffle) pool = shuffleArray(pool);
        pool = pool.slice(0, totalQ);
    }
    if (shuffle) pool = shuffleArray(pool);

    document.querySelector('.mixed-quiz-modal')?.remove();
    mixedState = {
        settings: { selectedFolders:sel, totalQuestions:totalQ, timePerQuestion:timePerQ,
                    shuffleQuestions:shuffle, equallyDistributed:equal, questionPool:pool, totalTime:totalQ*timePerQ },
        active:true, timer:null, timeLeft:totalQ*timePerQ, index:0, score:0, incorrect:[]
    };
    executeMixedQuiz();
}

// ── Execution ─────────────────────────────────
function executeMixedQuiz() {
    showView('quizContainer');
    const c = document.getElementById('quizContainer');
    c.innerHTML = `<div class="mixed-quiz-running">
        <div class="mixed-quiz-hdr">
            <div class="quiz-progress">
                <div class="progress-circle"><span id="mxCur">1</span>/${mixedState.settings.totalQuestions}</div>
                <div class="progress-bar-container"><div id="mxBar" class="progress-bar" style="width:0%"></div></div>
            </div>
            <div class="quiz-timer"><i class="fas fa-clock"></i> <span id="mxTimer">${fmtSecs(mixedState.timeLeft)}</span></div>
            <div style="font-weight:600;color:var(--secondary-color);">Score: <span id="mxScore">0</span></div>
        </div>
        <div class="mixed-folder-badge"><i class="fas fa-folder"></i> <span id="mxFolder">—</span></div>
        <h2 id="mxQuestion" class="question-text"></h2>
        <div id="mxOptions" class="options-grid"></div>
        <div class="quiz-footer">
            <button class="danger-btn"    onclick="endMixedQuizEarly()"><i class="fas fa-stop"></i> End</button>
            <button class="secondary-btn" onclick="goHome()"><i class="fas fa-home"></i> Home</button>
        </div>
    </div>`;

    if (mixedState.timer) clearInterval(mixedState.timer);
    mixedState.timer = setInterval(() => {
        mixedState.timeLeft--;
        const td = document.getElementById('mxTimer');
        if (td) td.textContent = fmtSecs(mixedState.timeLeft);
        if (mixedState.timeLeft <= 0) { clearInterval(mixedState.timer); timeUpMixed(); }
    }, 1000);

    loadMixedQ();
}

function loadMixedQ() {
    const i    = mixedState.index;
    const pool = mixedState.settings.questionPool;
    if (i >= pool.length) { showMixedResults(); return; }
    const q = pool[i];
    document.getElementById('mxCur').textContent    = i + 1;
    document.getElementById('mxBar').style.width    = `${(i / pool.length) * 100}%`;
    document.getElementById('mxFolder').textContent = q.sourceFolder || '—';
    document.getElementById('mxQuestion').textContent = q.question;

    const opts = document.getElementById('mxOptions'); opts.innerHTML = '';
    const letters = ['A','B','C','D','E','F','G','H'];
    q.options.forEach((opt, j) => {
        const b = document.createElement('button'); b.className = 'option-btn';
        b.innerHTML = `<span class="option-prefix">${letters[j]}</span><span class="option-text">${escHtml(opt)}</span>`;
        b.onclick = () => {
            document.querySelectorAll('#mxOptions .option-btn').forEach(x => x.disabled = true);
            if (j === q.correctIndex) {
                b.classList.add('correct');
                mixedState.score++;
                q.correctlyAnswered = true;
                const sc = document.getElementById('mxScore');
                if (sc) sc.textContent = mixedState.score;
            } else {
                b.classList.add('incorrect');
                document.querySelectorAll('#mxOptions .option-btn')[q.correctIndex]?.classList.add('correct');
                mixedState.incorrect.push({ ...q, selectedAnswer: opt });
            }
            setTimeout(() => { mixedState.index++; loadMixedQ(); }, 1000);
        };
        opts.appendChild(b);
    });
}

function timeUpMixed() {
    const pool = mixedState.settings.questionPool;
    while (mixedState.index < pool.length) {
        const q = pool[mixedState.index];
        q.selectedAnswer = 'Time expired';
        mixedState.incorrect.push(q);
        mixedState.index++;
    }
    showMixedResults();
}

function endMixedQuizEarly() {
    if (!confirm('End Mixed Quiz? Results will be shown.')) return;
    if (mixedState.timer) { clearInterval(mixedState.timer); mixedState.timer = null; }
    const pool = mixedState.settings.questionPool;
    while (mixedState.index < pool.length) {
        pool[mixedState.index].selectedAnswer = 'Ended early';
        mixedState.incorrect.push(pool[mixedState.index]);
        mixedState.index++;
    }
    showMixedResults();
}

// ── Results ───────────────────────────────────
function showMixedResults() {
    if (mixedState.timer) { clearInterval(mixedState.timer); mixedState.timer = null; }
    mixedState.active = false;
    const total = mixedState.settings.totalQuestions;
    const sc    = mixedState.score;
    const acc   = (sc / total * 100).toFixed(1);

    // Folder breakdown
    const byFolder = {};
    mixedState.settings.questionPool.forEach(q => {
        const f = q.sourceFolder || 'Unknown';
        if (!byFolder[f]) byFolder[f] = { total:0, correct:0 };
        byFolder[f].total++;
        if (q.correctlyAnswered) byFolder[f].correct++;
    });

    // Medal
    const pct = parseFloat(acc);
    if (pct === 100)     { medalCounts.gold++;   localStorage.setItem('medalGold',   medalCounts.gold); }
    else if (pct >= 80)  { medalCounts.silver++; localStorage.setItem('medalSilver', medalCounts.silver); }
    else if (pct >= 60)  { medalCounts.bronze++; localStorage.setItem('medalBronze', medalCounts.bronze); }
    updateMedalDisplay();

    const c = document.getElementById('quizContainer');
    c.innerHTML = `<div style="padding:24px;">
        <h2 style="background:linear-gradient(135deg,var(--primary-color),var(--secondary-color));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:20px;">🎯 Mixed Quiz Results</h2>
        <div class="mixed-results-summary">
            <div class="mixed-result-stat"><h4>Score</h4><div class="big-num">${sc}/${total}</div></div>
            <div class="mixed-result-stat"><h4>Accuracy</h4><div class="big-num">${acc}%</div></div>
            <div class="mixed-result-stat"><h4>Wrong</h4><div class="big-num">${mixedState.incorrect.length}</div></div>
        </div>
        <div class="folder-breakdown-table">
            <h3>📁 Performance by Folder</h3>
            ${Object.entries(byFolder).map(([f, s]) => `
                <div class="folder-breakdown-row">
                    <span class="fb-name">${escHtml(f)}</span>
                    <span class="fb-score">${s.correct}/${s.total}</span>
                    <span class="fb-acc">${(s.correct/s.total*100).toFixed(1)}%</span>
                </div>`).join('')}
        </div>
        ${mixedState.incorrect.length ? `
        <div class="incorrect-answers">
            <h3>📝 Incorrect Answers (${mixedState.incorrect.length})</h3>
            ${mixedState.incorrect.map((q, i) => `
                <div class="incorrect-item">
                    <p class="question"><strong>Q${i+1} [${escHtml(q.sourceFolder||'')}]:</strong> ${escHtml(q.question)}</p>
                    <p class="wrong-answer"><i class="fas fa-times"></i> ${escHtml(q.selectedAnswer||'—')}</p>
                    <p class="correct-answer"><i class="fas fa-check"></i> ${escHtml(q.options[q.correctIndex])}</p>
                </div>`).join('')}
        </div>` : `
        <div style="text-align:center;padding:30px;background:rgba(16,185,129,0.1);border-radius:var(--border-radius);margin:20px 0;">
            <h3 style="color:var(--secondary-color);">🎉 Perfect Score!</h3><p>All answers correct!</p>
        </div>`}
        <div class="results-actions">
            <button class="primary-btn"   onclick="restartMixedQuiz()"><i class="fas fa-redo"></i> Restart</button>
            <button class="secondary-btn" onclick="goHome()"><i class="fas fa-home"></i> Home</button>
        </div>
    </div>`;
}

function restartMixedQuiz() {
    mixedState.index = 0; mixedState.score = 0; mixedState.incorrect = [];
    mixedState.timeLeft = mixedState.settings.totalTime; mixedState.active = true;
    if (mixedState.settings.shuffleQuestions)
        mixedState.settings.questionPool = shuffleArray(mixedState.settings.questionPool);
    mixedState.settings.questionPool.forEach(q => { q.correctlyAnswered = false; });
    executeMixedQuiz();
}
