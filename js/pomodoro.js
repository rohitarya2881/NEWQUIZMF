/* =============================================
   pomodoro.js — Full Pomodoro Learning Flow
   Setup → Study (flashcards) → Quiz → Break → repeat 
   ============================================= */

// ── Settings & State ─────────────────────────
let pomodoroSettings = {
    questionsPerSection : 15,
    studyTimeMinutes    : 25,
    quizTimeMinutes     : 20,
    breakTimeMinutes    : 5,
    autoAdvance         : true
};

let pomodoroState = {
    active: false, phase: '',
    currentSection: 0, sections: [], totalSections: 0,
    timerInterval: null, timeLeft: 0, isPaused: false,
    currentQuestions: [], quizResults: [], allIncorrect: []
};

let _pomoScore = 0, _pomoQIndex = 0, _pomoQuiz = [], _pomoIncorrect = [];

// ── Entry ─────────────────────────────────────
function startPomodoro() {
    if (!currentFolder) { showToast('Navigate into a folder first', 'warning'); return; }
    const quizzes = currentFolder.children?.filter(c => c.type === 'quiz') || [];
    if (!quizzes.length) { showToast('No quizzes in this folder', 'warning'); return; }
    if (quizzes.length === 1) startPomodoroSetup(quizzes[0].id);
    else showQuizSelectorModal(quizzes, startPomodoroSetup, '🍅 Select Quiz for Pomodoro');
}

// ── Setup Modal ───────────────────────────────
function startPomodoroSetup(quizId) {
    const quiz = findItemById(quizId);
    if (!quiz || !quiz.questions?.length) { showToast('Quiz has no questions', 'warning'); return; }
    const total = quiz.questions.length;
    const m = document.createElement('div'); m.className = 'modal'; m.id = 'pomoModal';
    m.innerHTML = `<div class="modal-content glass-card pomo-setup-dialog">
        <div class="pomo-setup-header">
            <div>
                <div class="pomo-setup-title">🍅 Pomodoro Flow</div>
                <div class="pomo-setup-subtitle">Study → Quiz → Break, section by section</div>
            </div>
            <button class="close-btn" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
        </div>
        <div class="pomo-stats-row">
            <div class="pomo-stat-chip">📚 <strong>${total}</strong> questions</div>
            <div class="pomo-stat-chip">📊 Sections: <strong id="estimatedSections">-</strong></div>
            <div class="pomo-stat-chip">⏱️ <strong id="totalTimeEstimate">-</strong> total</div>
        </div>
        <div class="pomo-section-block">
            <div class="pomo-section-label">📌 Question Range</div>
            <div class="pomo-range-row">
                <div class="pomo-range-field"><label>From</label>
                    <input type="number" id="pomoStart" value="1" min="1" max="${total}" oninput="pomoUpdateEst(${total})"></div>
                <div class="pomo-range-sep">—</div>
                <div class="pomo-range-field"><label>To</label>
                    <input type="number" id="pomoEnd" value="${total}" min="1" max="${total}" oninput="pomoUpdateEst(${total})"></div>
                <div class="pomo-count-pill"><span id="pomoSelCount">${total}</span> selected</div>
            </div>
        </div>
        <div class="pomo-sliders-grid">
            <div class="pomo-slider-item">
                <div class="pomo-slider-label">📝 Questions / section</div>
                <div class="pomo-slider-row">
                    <input type="range" id="pomoQPerSec" min="3" max="50" value="15" class="pomo-range" oninput="document.getElementById('qpsVal').textContent=this.value;pomoUpdateEst(${total})">
                    <span class="pomo-slider-val" id="qpsVal">15</span>
                </div>
            </div>
            <div class="pomo-slider-item">
                <div class="pomo-slider-label">🎯 Study time (min)</div>
                <div class="pomo-slider-row">
                    <input type="range" id="pomoStudy" min="3" max="60" value="25" class="pomo-range" oninput="document.getElementById('studyVal').textContent=this.value;pomoUpdateEst(${total})">
                    <span class="pomo-slider-val" id="studyVal">25</span>
                </div>
            </div>
            <div class="pomo-slider-item">
                <div class="pomo-slider-label">✏️ Quiz time (min)</div>
                <div class="pomo-slider-row">
                    <input type="range" id="pomoQuizT" min="3" max="60" value="20" class="pomo-range" oninput="document.getElementById('quizTVal').textContent=this.value;pomoUpdateEst(${total})">
                    <span class="pomo-slider-val" id="quizTVal">20</span>
                </div>
            </div>
            <div class="pomo-slider-item">
                <div class="pomo-slider-label">☕ Break time (min)</div>
                <div class="pomo-slider-row">
                    <input type="range" id="pomoBreakT" min="1" max="15" value="5" class="pomo-range" oninput="document.getElementById('breakTVal').textContent=this.value;pomoUpdateEst(${total})">
                    <span class="pomo-slider-val" id="breakTVal">5</span>
                </div>
            </div>
        </div>
        <div class="pomo-toggles">
            <label class="pomo-toggle-label">
                <input type="checkbox" id="pomoAutoAdv" checked>
                <span class="pomo-toggle-track"><span class="pomo-toggle-thumb"></span></span>
                Auto-advance to quiz when study timer ends
            </label>
        </div>
        <div class="modal-footer">
            <button class="secondary-btn" onclick="this.closest('.modal').remove()">Cancel</button>
            <button class="primary-btn" onclick="launchPomodoroFlow('${quizId}',${total})">🚀 Start Learning Flow</button>
        </div>
    </div>`;
    document.body.appendChild(m);
    pomoUpdateEst(total);
}

function pomoUpdateEst(total) {
    let s = Math.max(1, parseInt(document.getElementById('pomoStart')?.value)||1);
    let e = Math.min(total, parseInt(document.getElementById('pomoEnd')?.value)||total);
    if (e<s) e=s;
    const sel = e-s+1;
    const qps = Math.max(1,parseInt(document.getElementById('pomoQPerSec')?.value)||15);
    const sec = Math.ceil(sel/qps);
    const sm  = parseInt(document.getElementById('pomoStudy')?.value)||25;
    const qm  = parseInt(document.getElementById('pomoQuizT')?.value)||20;
    const bm  = parseInt(document.getElementById('pomoBreakT')?.value)||5;
    const tm  = sec*(sm+qm+bm);
    const sc=document.getElementById('pomoSelCount'); if(sc) sc.textContent=sel;
    const es=document.getElementById('estimatedSections'); if(es) es.textContent=sec;
    const te=document.getElementById('totalTimeEstimate'); if(te) te.textContent=tm+'m';
}

// ── Launch ────────────────────────────────────
function launchPomodoroFlow(quizId, total) {
    const quiz=findItemById(quizId); if(!quiz) return;
    let s=Math.max(1,parseInt(document.getElementById('pomoStart')?.value)||1);
    let e=Math.min(total,parseInt(document.getElementById('pomoEnd')?.value)||total);
    if(e<s) e=s;
    pomodoroSettings.questionsPerSection = Math.max(1,parseInt(document.getElementById('pomoQPerSec')?.value)||15);
    pomodoroSettings.studyTimeMinutes    = Math.max(1,parseInt(document.getElementById('pomoStudy')?.value)||25);
    pomodoroSettings.quizTimeMinutes     = Math.max(1,parseInt(document.getElementById('pomoQuizT')?.value)||20);
    pomodoroSettings.breakTimeMinutes    = Math.max(1,parseInt(document.getElementById('pomoBreakT')?.value)||5);
    pomodoroSettings.autoAdvance         = document.getElementById('pomoAutoAdv')?.checked!==false;
    const qs = quiz.questions.slice(s-1, e);
    if(!qs.length){showToast('No questions in that range','warning');return;}
    const sections=[];
    for(let i=0;i<qs.length;i+=pomodoroSettings.questionsPerSection)
        sections.push(qs.slice(i,i+pomodoroSettings.questionsPerSection));
    pomodoroState={active:true,phase:'study',currentSection:0,sections,totalSections:sections.length,
        timerInterval:null,timeLeft:0,isPaused:false,currentQuestions:[],quizResults:[],allIncorrect:[]};
    document.getElementById('pomoModal')?.remove();
    _buildPomodoroShell();
    enterPomodoroStudy();
}

// ── Shell ─────────────────────────────────────
function _buildPomodoroShell() {
    document.getElementById('pomodoroShell')?.remove();
    const shell=document.createElement('div'); shell.id='pomodoroShell'; shell.className='pomo-shell';
    shell.innerHTML=`
        <div class="pomo-topbar" id="pomoTopbar">
            <div class="pomo-topbar-left">
                <span class="pomo-phase-tag" id="pomoPhaseTag">📚 Study</span>
                <span class="pomo-section-info" id="pomoSectionInfo">Section 1/${pomodoroState.totalSections}</span>
            </div>
            <div class="pomo-timer-pill" id="pomoTimerPill">00:00</div>
            <div class="pomo-topbar-right">
                <button class="pomo-ctrl-btn" id="pomoPauseBtn" onclick="pomoTogglePause()">⏸</button>
                <button class="pomo-ctrl-btn" onclick="pomoSkip()" title="Skip">⏭</button>
                <button class="pomo-ctrl-btn pomo-ctrl-danger" onclick="pomoExit()" title="Exit">✕</button>
            </div>
        </div>
        <div class="pomo-progress-bar-wrap"><div class="pomo-progress-fill" id="pomoProgressFill" style="width:0%"></div></div>
        <div class="pomo-body" id="pomoBody"></div>`;
    document.body.appendChild(shell);
}

function _updateTopbar() {
    const phases={study:{tag:'📚 Study',c:'var(--primary-color)'},quiz:{tag:'✏️ Quiz',c:'#8b5cf6'},
        break:{tag:'☕ Break',c:'var(--secondary-color)'},results:{tag:'📊 Results',c:'var(--warning-color)'},finish:{tag:'🏆 Done',c:'#f59e0b'}};
    const p=phases[pomodoroState.phase]||phases.study;
    const tag=document.getElementById('pomoPhaseTag'); if(tag){tag.textContent=p.tag;tag.style.background=p.c;}
    const inf=document.getElementById('pomoSectionInfo'); if(inf) inf.textContent=`Section ${pomodoroState.currentSection+1}/${pomodoroState.totalSections}`;
    const pill=document.getElementById('pomoTimerPill'); if(pill) pill.textContent=_pfmt(pomodoroState.timeLeft);
    const btn=document.getElementById('pomoPauseBtn'); if(btn) btn.textContent=pomodoroState.isPaused?'▶':'⏸';
    const pf=document.getElementById('pomoProgressFill'); if(pf) pf.style.width=`${(pomodoroState.currentSection/pomodoroState.totalSections)*100}%`;
}
function _pfmt(s){return`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}

// ── Timer ─────────────────────────────────────
function _startPomTimer(secs, onDone) {
    _clearPomTimer(); pomodoroState.timeLeft=secs; _updateTopbar();
    pomodoroState.timerInterval=setInterval(()=>{
        if(pomodoroState.isPaused) return;
        pomodoroState.timeLeft--; _updateTopbar();
        const pill=document.getElementById('pomoTimerPill');
        if(pill) pill.classList.toggle('pomo-timer-warn',pomodoroState.timeLeft<=30);
        if(pomodoroState.timeLeft<=0){_clearPomTimer();onDone();}
    },1000);
}
function _clearPomTimer(){if(pomodoroState.timerInterval){clearInterval(pomodoroState.timerInterval);pomodoroState.timerInterval=null;}}

function pomoTogglePause(){
    pomodoroState.isPaused=!pomodoroState.isPaused; _updateTopbar();
    const body=document.getElementById('pomoBody');
    if(!body) return;
    let ov=document.getElementById('pomoPauseOv');
    if(pomodoroState.isPaused){
        if(!ov){ov=document.createElement('div');ov.id='pomoPauseOv';ov.className='pomo-pause-overlay';
            ov.innerHTML='<div class="pomo-pause-msg">⏸️ Paused<br><small>Tap ▶ to resume</small></div>';body.appendChild(ov);}
    } else { ov?.remove(); }
}
function pomoSkip(){if(!confirm('Skip to next section?')) return; _clearPomTimer(); _advanceSection();}
function pomoExit(){if(!confirm('Exit Pomodoro?')) return; _clearPomTimer(); pomodoroState.active=false; document.getElementById('pomodoroShell')?.remove(); goHome();}

// ── Study Phase ───────────────────────────────
function enterPomodoroStudy() {
    pomodoroState.phase = 'study';
    pomodoroState.currentQuestions = [...pomodoroState.sections[pomodoroState.currentSection]];
    _updateTopbar();
    const body = document.getElementById('pomoBody'); if (!body) return;
    const letters = ['A','B','C','D','E','F','G','H'];
    const offset  = pomodoroState.currentSection * pomodoroSettings.questionsPerSection;

    const cardsHTML = pomodoroState.currentQuestions.map((q, i) => `
        <div class="flashcard">
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <div class="flashcard-content">
                        <span class="flashcard-q-num">${offset+i+1}</span>
                        <p class="flashcard-question">${escHtml(q.question)}</p>
                        <div class="flashcard-options">
                            ${q.options.map((o,j) => `
                                <div class="flashcard-option${j===q.correctIndex?' correct-option':''}">
                                    <span class="flashcard-opt-letter">${letters[j]}</span>
                                    <span>${escHtml(o)}</span>
                                </div>`).join('')}
                        </div>
                        <p class="flashcard-hint">Click to reveal answer</p>
                    </div>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-content">
                        <span class="flashcard-q-num">${offset+i+1}</span>
                        <div class="flashcard-answer-label">✅ Correct Answer</div>
                        <div class="flashcard-answer-text">${letters[q.correctIndex]}. ${escHtml(q.options[q.correctIndex])}</div>
                        ${q.explanation ? `<div class="flashcard-explanation">💡 ${escHtml(q.explanation)}</div>` : ''}
                        <p class="flashcard-hint">Click to flip back</p>
                    </div>
                </div>
            </div>
        </div>`).join('');

    body.innerHTML = `
        <div style="max-width:1400px;margin:0 auto;">
            <div class="fc-toolbar" style="margin-bottom:14px;">
                <span class="fc-toolbar-title">📚 Study Session ${pomodoroState.currentSection+1} / ${pomodoroState.totalSections}</span>
                <span class="fc-meta">${pomodoroState.currentQuestions.length} questions · ${pomodoroSettings.studyTimeMinutes} min</span>
                <button class="fc-btn" onclick="enterPomodoroQuiz()">✏️ Start Quiz Now</button>
            </div>
            <div class="flashcard-main-container">${cardsHTML}</div>
        </div>`;

    body.querySelectorAll('.flashcard').forEach(card => {
        card.addEventListener('click', () => card.classList.toggle('flipped'));
    });

    _startPomTimer(pomodoroSettings.studyTimeMinutes * 60, () => {
        if (pomodoroSettings.autoAdvance) enterPomodoroQuiz();
        else showToast('Study time up! Click Start Quiz.', 'info');
    });
}

// ── Quiz Phase ────────────────────────────────
function enterPomodoroQuiz() {
    _clearPomTimer(); pomodoroState.phase='quiz'; _updateTopbar();
    _pomoScore=0;_pomoQIndex=0;_pomoIncorrect=[];
    _pomoQuiz=shuffleArray([...pomodoroState.currentQuestions]);
    const body=document.getElementById('pomoBody'); if(!body) return;
    body.innerHTML=`<div class="pomo-quiz-wrap">
        <div class="pomo-phase-heading">
            <span class="pomo-phase-icon">✏️</span>
            <div><div class="pomo-phase-title">Quiz Session ${pomodoroState.currentSection+1}</div>
                <div class="pomo-phase-sub">${_pomoQuiz.length} questions · ${pomodoroSettings.quizTimeMinutes} min</div></div>
        </div>
        <div class="pomo-q-progress">
            <div class="pomo-q-bar"><div class="pomo-q-fill" id="pomoQFill" style="width:0%"></div></div>
            <span id="pomoQMeta">1/${_pomoQuiz.length}</span>
        </div>
        <div id="pomoQBody"></div>
    </div>`;
    _loadPomodoroQ();
    _startPomTimer(pomodoroSettings.quizTimeMinutes*60,()=>{
        while(_pomoQIndex<_pomoQuiz.length){_pomoIncorrect.push({..._pomoQuiz[_pomoQIndex],selectedAnswer:'(Time expired)'});_pomoQIndex++;}
        _showPomodoroResults();
    });
}

function _loadPomodoroQ() {
    const body=document.getElementById('pomoQBody'); if(!body) return;
    if(_pomoQIndex>=_pomoQuiz.length){_showPomodoroResults();return;}
    const q=_pomoQuiz[_pomoQIndex]; const letters=['A','B','C','D','E','F','G','H'];
    const fill=document.getElementById('pomoQFill'); if(fill) fill.style.width=`${(_pomoQIndex/_pomoQuiz.length)*100}%`;
    const meta=document.getElementById('pomoQMeta'); if(meta) meta.textContent=`${_pomoQIndex+1}/${_pomoQuiz.length}`;
    body.innerHTML=`<div class="pomo-question-card">
        <p class="pomo-question-text">${escHtml(q.question)}</p>
        <div class="pomo-options">${q.options.map((o,j)=>`
            <button class="pomo-opt-btn" data-idx="${j}">
                <span class="pomo-opt-letter">${letters[j]}</span>
                <span class="pomo-opt-text">${escHtml(o)}</span>
            </button>`).join('')}
        </div>
    </div>`;
    body.querySelectorAll('.pomo-opt-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
            if(btn.disabled) return;
            body.querySelectorAll('.pomo-opt-btn').forEach(b=>b.disabled=true);
            const chosen=parseInt(btn.dataset.idx);
            if(chosen===q.correctIndex){btn.classList.add('pomo-correct');_pomoScore++;}
            else{btn.classList.add('pomo-wrong');body.querySelector(`[data-idx="${q.correctIndex}"]`)?.classList.add('pomo-correct');
                _pomoIncorrect.push({...q,selectedAnswer:q.options[chosen]});}
            setTimeout(()=>{_pomoQIndex++;_loadPomodoroQ();},900);
        });
    });
}

function _showPomodoroResults() {
    _clearPomTimer(); pomodoroState.phase='results';
    const acc=Math.round((_pomoScore/_pomoQuiz.length)*100);
    pomodoroState.quizResults.push({section:pomodoroState.currentSection+1,score:_pomoScore,total:_pomoQuiz.length,accuracy:acc});
    pomodoroState.allIncorrect.push(..._pomoIncorrect); _updateTopbar();
    const body=document.getElementById('pomoBody'); if(!body) return;
    const grade=acc>=80?{icon:'🎉',cls:'pomo-grade-great',lbl:'Great!'}:acc>=60?{icon:'👍',cls:'pomo-grade-good',lbl:'Good'}:{icon:'📝',cls:'pomo-grade-review',lbl:'Keep going'};
    const isLast=pomodoroState.currentSection>=pomodoroState.totalSections-1;
    body.innerHTML=`<div class="pomo-results-wrap">
        <div class="pomo-phase-heading"><span class="pomo-phase-icon">📊</span>
            <div><div class="pomo-phase-title">Section ${pomodoroState.currentSection+1} Results</div></div></div>
        <div class="pomo-score-card ${grade.cls}">
            <div class="pomo-score-icon">${grade.icon}</div>
            <div class="pomo-score-big">${_pomoScore} / ${_pomoQuiz.length}</div>
            <div class="pomo-score-acc">${acc}% · ${grade.lbl}</div>
        </div>
        ${_pomoIncorrect.length?`<div class="pomo-incorrect-list">
            <div class="pomo-incorrect-title">📝 ${_pomoIncorrect.length} incorrect</div>
            ${_pomoIncorrect.slice(0,3).map(q=>`<div class="pomo-incorrect-item">
                <div class="pomo-inc-q">${escHtml(q.question.substring(0,80))}${q.question.length>80?'…':''}</div>
                <div class="pomo-inc-ans">✅ ${escHtml(q.options[q.correctIndex])}</div>
            </div>`).join('')}
            ${_pomoIncorrect.length>3?`<div style="color:#94a3b8;font-size:0.8rem;padding:4px 0">+${_pomoIncorrect.length-3} more…</div>`:''}
        </div>`:`<div class="pomo-perfect"><div style="font-size:2.5rem">🎯</div><div>Perfect section!</div></div>`}
        <div class="pomo-results-actions">
            <button class="secondary-btn" onclick="enterPomodoroStudy()">🔄 Retry</button>
            <button class="primary-btn" onclick="${isLast?'finishPomodoro()':'enterPomodoroBreak()'}">${isLast?'🏆 Finish':'☕ Break →'}</button>
        </div>
    </div>`;
}

// ── Break ─────────────────────────────────────
function enterPomodoroBreak() {
    pomodoroState.phase='break'; _updateTopbar();
    const body=document.getElementById('pomoBody'); if(!body) return;
    body.innerHTML=`<div class="pomo-break-wrap">
        <div class="pomo-break-icon">☕</div>
        <h2 class="pomo-break-title">Break Time!</h2>
        <p class="pomo-break-sub">You've earned ${pomodoroSettings.breakTimeMinutes} minutes</p>
        <div class="pomo-break-tips">
            <div class="pomo-tip">🧘 Stretch your body</div>
            <div class="pomo-tip">💧 Drink some water</div>
            <div class="pomo-tip">👀 Look away from screen</div>
            <div class="pomo-tip">🌬️ Take deep breaths</div>
        </div>
        <div class="pomo-prev-results">
            ${pomodoroState.quizResults.map((r,i)=>`<div class="pomo-prev-item">
                <span>Sec ${i+1}</span>
                <div class="pomo-prev-bar"><div style="width:${r.accuracy}%;height:100%;border-radius:4px;background:${r.accuracy>=80?'var(--secondary-color)':r.accuracy>=60?'var(--warning-color)':'var(--danger-color)'}"></div></div>
                <span>${r.score}/${r.total}</span>
            </div>`).join('')}
        </div>
        <div class="pomo-break-actions">
            <button class="secondary-btn" onclick="_advanceSection()">⏭ Skip Break</button>
        </div>
    </div>`;
    _startPomTimer(pomodoroSettings.breakTimeMinutes*60,()=>_advanceSection());
}

function _advanceSection(){_clearPomTimer();pomodoroState.currentSection++;if(pomodoroState.currentSection>=pomodoroState.totalSections){finishPomodoro();return;}enterPomodoroStudy();}

// ── Finish ────────────────────────────────────
function finishPomodoro() {
    _clearPomTimer(); pomodoroState.active=false; pomodoroState.phase='finish'; _updateTopbar();
    const totalQ=pomodoroState.quizResults.reduce((s,r)=>s+r.total,0);
    const totalC=pomodoroState.quizResults.reduce((s,r)=>s+r.score,0);
    const overall=totalQ?Math.round(totalC/totalQ*100):0;
    if(overall===100){medalCounts.gold++;localStorage.setItem('medalGold',medalCounts.gold);}
    else if(overall>=80){medalCounts.silver++;localStorage.setItem('medalSilver',medalCounts.silver);}
    else if(overall>=60){medalCounts.bronze++;localStorage.setItem('medalBronze',medalCounts.bronze);}
    updateMedalDisplay();
    const body=document.getElementById('pomoBody'); if(!body) return;
    body.innerHTML=`<div class="pomo-finish-wrap">
        <div class="pomo-finish-icon">🏆</div>
        <h2 class="pomo-finish-title">Learning Flow Complete!</h2>
        <p class="pomo-finish-sub">${totalQ} questions · ${pomodoroState.totalSections} sections</p>
        <div class="pomo-final-stats">
            <div class="pomo-final-stat"><div class="pomo-final-val">${overall}%</div><div class="pomo-final-lbl">Accuracy</div></div>
            <div class="pomo-final-stat"><div class="pomo-final-val">${totalC}/${totalQ}</div><div class="pomo-final-lbl">Correct</div></div>
            <div class="pomo-final-stat"><div class="pomo-final-val">${pomodoroState.totalSections}</div><div class="pomo-final-lbl">Sections</div></div>
        </div>
        <div class="pomo-breakdown">
            ${pomodoroState.quizResults.map((r,i)=>`<div class="pomo-breakdown-item ${r.accuracy>=80?'great':r.accuracy>=60?'good':'review'}">
                <span>Sec ${i+1}</span>
                <div class="pomo-breakdown-bar"><div style="width:${r.accuracy}%"></div></div>
                <span>${r.score}/${r.total}</span>
            </div>`).join('')}
        </div>
        <div class="pomo-finish-actions">
            <button class="primary-btn" onclick="document.getElementById('pomodoroShell')?.remove();goHome()">🏠 Home</button>
            <button class="secondary-btn" onclick="document.getElementById('pomodoroShell')?.remove();startPomodoro()">🔄 New Session</button>
        </div>
    </div>`;
}

// ── Legacy simple timer stubs (keep HTML from breaking) ───
function pomoStart(){}
function pomoPause(){}
function pomoReset(){}
