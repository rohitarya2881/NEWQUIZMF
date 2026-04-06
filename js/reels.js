/* =============================================
   reels.js — Quiz Reels (Swipe Cards + Music)
   ============================================= */

let _reelsQuestions = [];
let _reelIndex      = 0;
let _reelAnswered   = false;
let _reelFlipped    = false;
let _reelScore      = { correct: 0, wrong: 0 };
let _autoNextOnFlip = false;
let _flipLock       = false;

// ── Music ─────────────────────────────────────
let _musicList  = [];
let _musicIndex = 0;
let _musicAudio = null;
let _musicMuted = false;
const MUSIC_KEY = 'reels_music_paths';

// ── Touch ─────────────────────────────────────
let _touchStartY = 0;
let _touchStartX = 0;

// ══════════════════════════════════════════════
// ENTRY POINT
// ══════════════════════════════════════════════
async function showReels() {
    if (!currentFolder) { showToast('Go into a folder first', 'warning'); return; }
    const quizzes = currentFolder.children?.filter(c => c.type === 'quiz') || [];
    if (!quizzes.length) { showToast('No quizzes in this folder', 'warning'); return; }
    if (quizzes.length === 1) _launchReels(quizzes[0]);
    else showQuizSelectorModal(quizzes, _launchReels, '🎬 Choose Quiz for Reels');
}

// ── KEY FIX: handle both ID string and full quiz object ──
function _launchReels(quizOrId) {
    const quiz = (typeof quizOrId === 'string') ? findItemById(quizOrId) : quizOrId;
    if (!quiz?.questions?.length) { showToast('Quiz has no questions', 'warning'); return; }
    _reelsQuestions = shuffleArray([...quiz.questions]);
    _reelIndex      = 0;
    _reelScore      = { correct: 0, wrong: 0 };
    _buildReelsShell();
    _renderCard();
    _startMusic();
}

function _toggleAutoNext() {
    _autoNextOnFlip = !_autoNextOnFlip;
    const btn = document.getElementById('autoNextBtn');
    if (btn) btn.textContent = _autoNextOnFlip ? '⏭✅' : '⏭❌';
    showToast(_autoNextOnFlip ? 'Auto next ON' : 'Auto next OFF', 'info');
}

// ══════════════════════════════════════════════
// SHELL
// ══════════════════════════════════════════════
function _buildReelsShell() {
    document.getElementById('reelsShell')?.remove();
    const shell = document.createElement('div');
    shell.id = 'reelsShell';
    shell.className = 'reels-shell';
    shell.innerHTML = `
        <div class="reels-topbar">
            <button class="reels-ctrl" onclick="_reelsExit()">✕</button>
            <div class="reels-progress-wrap">
                <div class="reels-progress-bar">
                    <div class="reels-progress-fill" id="reelsProgressFill" style="width:0%"></div>
                </div>
                <span class="reels-counter" id="reelsCounter">1 / ${_reelsQuestions.length}</span>
            </div>
            <div class="reels-score-pill" id="reelsScore">✅ 0 &nbsp; ❌ 0</div>
        </div>

        <div class="reels-card-area" id="reelsCardArea">
            <div class="reels-card-wrap" id="reelsCardWrap">
                <div class="reels-card" id="reelsCard">
                    <div class="reels-card-front" id="reelsCardFront"></div>
                    <div class="reels-card-back"  id="reelsCardBack"></div>
                </div>
            </div>
            <div class="reels-hint reels-hint-up">▲ Next</div>
            <div class="reels-hint reels-hint-down">▼ Prev</div>
        </div>

        <div class="reels-music-bar">
            <div class="reels-music-info">
                <span class="reels-music-icon">🎵</span>
                <span class="reels-music-name" id="reelsMusicName">No music</span>
            </div>
            <div class="reels-music-controls">
                <button class="reels-ctrl" onclick="_musicPrev()" title="Prev song">⏮</button>
                <button class="reels-ctrl" id="reelsMuteBtn" onclick="_musicToggleMute()">🔊</button>
                <button class="reels-ctrl" onclick="_musicNext()" title="Next song">⏭</button>
                <button class="reels-ctrl" id="autoNextBtn" onclick="_toggleAutoNext()" title="Auto next card on flip">⏭❌</button>
                <button class="reels-ctrl" onclick="_showMusicManager()" title="Music settings">⚙️</button>
            </div>
        </div>`;
    document.body.appendChild(shell);
    _bindSwipe();
}

// ══════════════════════════════════════════════
// RENDER CARD
// ══════════════════════════════════════════════
function _renderCard() {
    const q = _reelsQuestions[_reelIndex];
    if (!q) return;
    _reelAnswered = false;
    _reelFlipped  = false;
    _flipLock     = false;

    const card = document.getElementById('reelsCard');
    if (card) card.classList.remove('flipped');

    const pct  = Math.round((_reelIndex + 1) / _reelsQuestions.length * 100);
    const fill = document.getElementById('reelsProgressFill');
    const ctr  = document.getElementById('reelsCounter');
    const scr  = document.getElementById('reelsScore');
    if (fill) fill.style.width = pct + '%';
    if (ctr)  ctr.textContent  = `${_reelIndex + 1} / ${_reelsQuestions.length}`;
    if (scr)  scr.innerHTML    = `✅ ${_reelScore.correct} &nbsp; ❌ ${_reelScore.wrong}`;

    const front = document.getElementById('reelsCardFront');
    if (front) {
        const letters = ['A','B','C','D'];
        front.innerHTML = `
            <div class="reels-q-num">Q ${_reelIndex + 1}</div>
            <div class="reels-q-text">${escHtml(q.question)}</div>
            <div class="reels-options">
                ${(q.options||[]).map((opt,i) => `
                    <button class="reels-opt" data-idx="${i}"
                        onclick="_reelsAnswer(${i},${q.correctIndex})">
                        <span class="reels-opt-letter">${letters[i]}</span>
                        <span class="reels-opt-text">${escHtml(opt)}</span>
                    </button>`).join('')}
            </div>
            <div class="reels-tap-hint" id="reelsTapHint" style="display:none;">
                Tap card to see explanation 👆
            </div>`;
    }

    const back = document.getElementById('reelsCardBack');
    if (back) {
        const correct = q.options?.[q.correctIndex] || '';
        back.innerHTML = `
            <div class="reels-ans-label">✅ Correct Answer</div>
            <div class="reels-ans-text">${escHtml(correct)}</div>
            ${q.explanation ? `
                <div class="reels-expl-label">📖 Explanation</div>
                <div class="reels-expl-text">${escHtml(q.explanation)}</div>` : ''}
            <div class="reels-nav-hint">Swipe ▲ for next · ▼ for previous</div>`;
    }

    if (card) card.onclick = () => { if (_reelAnswered && !_reelFlipped) _flipCard(); };
}

// ══════════════════════════════════════════════
// ANSWER
// ══════════════════════════════════════════════
function _reelsAnswer(chosen, correct) {
    if (_reelAnswered) return;
    _reelAnswered = true;
    const isCorrect = chosen === correct;
    if (isCorrect) _reelScore.correct++; else _reelScore.wrong++;

    document.querySelectorAll('.reels-opt').forEach((btn, i) => {
        btn.disabled = true;
        if (i === correct) btn.classList.add('reels-correct');
        else if (i === chosen) btn.classList.add('reels-wrong');
    });

    const scr = document.getElementById('reelsScore');
    if (scr) scr.innerHTML = `✅ ${_reelScore.correct} &nbsp; ❌ ${_reelScore.wrong}`;
    const hint = document.getElementById('reelsTapHint');
    if (hint) hint.style.display = 'block';

    setTimeout(() => { if (!_reelFlipped) _flipCard(); }, 1500);
}

function _flipCard() {
    if (_flipLock) return;
    _flipLock    = true;
    _reelFlipped = true;
    const card   = document.getElementById('reelsCard');
    if (card) card.classList.add('flipped');

    if (_autoNextOnFlip) {
        setTimeout(_reelsNext, 600);
    }
    setTimeout(() => { _flipLock = false; }, 500);
}

// ══════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════
function _bindSwipe() {
    const area = document.getElementById('reelsCardArea');
    if (!area) return;

    area.addEventListener('touchstart', e => {
        _touchStartY = e.touches[0].clientY;
        _touchStartX = e.touches[0].clientX;
    }, { passive: true });

    area.addEventListener('touchend', e => {
        const dy = _touchStartY - e.changedTouches[0].clientY;
        const dx = Math.abs(_touchStartX - e.changedTouches[0].clientX);
        if (Math.abs(dy) < 50 || dx > Math.abs(dy)) return;
        if (dy > 0) _reelsNext(); else _reelsPrev();
    }, { passive: true });

    area.addEventListener('wheel', e => {
        e.preventDefault();
        if (e.deltaY > 30) _reelsNext();
        else if (e.deltaY < -30) _reelsPrev();
    }, { passive: false });

    document.addEventListener('keydown', _reelsKeyHandler);
}

function _reelsKeyHandler(e) {
    if (!document.getElementById('reelsShell')) return;
    if (e.key === 'ArrowUp'   || e.key === 'ArrowRight') _reelsNext();
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft')  _reelsPrev();
    if (e.key === 'Escape') _reelsExit();
    if (e.key === ' ') { e.preventDefault(); if (_reelAnswered && !_reelFlipped) _flipCard(); }
}

function _reelsNext() {
    if (_reelIndex >= _reelsQuestions.length - 1) { _reelsFinish(); return; }
    _animateSlide('up');
    setTimeout(() => { _reelIndex++; _renderCard(); }, 300);
}

function _reelsPrev() {
    if (_reelIndex <= 0) return;
    _animateSlide('down');
    setTimeout(() => { _reelIndex--; _renderCard(); }, 300);
}

function _animateSlide(dir) {
    const wrap = document.getElementById('reelsCardWrap');
    if (!wrap) return;
    wrap.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    wrap.style.transform  = dir === 'up' ? 'translateY(-60px)' : 'translateY(60px)';
    wrap.style.opacity    = '0';
    setTimeout(() => {
        wrap.style.transition = 'none';
        wrap.style.transform  = dir === 'up' ? 'translateY(60px)' : 'translateY(-60px)';
        wrap.style.opacity    = '0';
        requestAnimationFrame(() => {
            wrap.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            wrap.style.transform  = 'translateY(0)';
            wrap.style.opacity    = '1';
        });
    }, 310);
}

function _reelsFinish() {
    const shell = document.getElementById('reelsShell');
    if (!shell) return;
    const total = _reelsQuestions.length;
    const pct   = Math.round(_reelScore.correct / total * 100);
    shell.innerHTML = `
        <div class="reels-finish">
            <div class="reels-finish-icon">${pct===100?'🏆':pct>=70?'🎉':'💪'}</div>
            <div class="reels-finish-title">Reels Complete!</div>
            <div class="reels-finish-score">${_reelScore.correct} / ${total}</div>
            <div class="reels-finish-pct">${pct}% accuracy</div>
            <div class="reels-finish-actions">
                <button class="primary-btn" onclick="_launchReels({questions:_reelsQuestions})">🔄 Play Again</button>
                <button class="secondary-btn" onclick="_reelsExit()">🏠 Exit</button>
            </div>
        </div>`;
}

function _reelsExit() {
    _stopMusic();
    document.removeEventListener('keydown', _reelsKeyHandler);
    document.getElementById('reelsShell')?.remove();
}

// ══════════════════════════════════════════════
// MUSIC
// ══════════════════════════════════════════════
async function _startMusic() {
    const saved = await jnlGet(MUSIC_KEY);
    if (saved?.length) _musicList = saved;

    if (_musicList.length) {
        _musicIndex = Math.floor(Math.random() * _musicList.length);
        _playMusicByPath(_musicList[_musicIndex]);
    } else {
        const nm = document.getElementById('reelsMusicName');
        if (nm) nm.textContent = 'Tap ⚙️ to add music';
    }
}

function _playMusicByPath(song) {
    if (!song) return;
    _stopMusic();
    _musicAudio          = new Audio(song.path);
    _musicAudio.loop     = false;
    _musicAudio.muted    = _musicMuted;
    _musicAudio.volume   = 0.5;
    _musicAudio.onended  = () => setTimeout(_playRandomMusic, 300);
    _musicAudio.play().catch(() => {});
    const nm = document.getElementById('reelsMusicName');
    if (nm) nm.textContent = song.name;
}

function _playRandomMusic() {
    if (!_musicList.length) return;
    let next;
    do { next = Math.floor(Math.random() * _musicList.length); }
    while (_musicList.length > 1 && next === _musicIndex);
    _musicIndex = next;
    _playMusicByPath(_musicList[_musicIndex]);
}

function _stopMusic() {
    if (_musicAudio) { _musicAudio.pause(); _musicAudio.src = ''; _musicAudio = null; }
}

function _musicNext() {
    if (!_musicList.length) { showToast('No music added. Tap ⚙️', 'info'); return; }
    _musicIndex = (_musicIndex + 1) % _musicList.length;
    _playMusicByPath(_musicList[_musicIndex]);
}

function _musicPrev() {
    if (!_musicList.length) return;
    _musicIndex = (_musicIndex - 1 + _musicList.length) % _musicList.length;
    _playMusicByPath(_musicList[_musicIndex]);
}

function _musicToggleMute() {
    _musicMuted = !_musicMuted;
    if (_musicAudio) _musicAudio.muted = _musicMuted;
    const btn = document.getElementById('reelsMuteBtn');
    if (btn) btn.textContent = _musicMuted ? '🔇' : '🔊';
}

// ══════════════════════════════════════════════
// MUSIC MANAGER
// ══════════════════════════════════════════════
async function _showMusicManager() {
    const saved = (await jnlGet(MUSIC_KEY)) || [];
    _musicList  = saved;

    const m = document.createElement('div'); m.className = 'modal'; m.id = 'musicModal';
    m.innerHTML = `<div class="modal-content" style="max-width:500px;">
        <div class="modal-header" style="border-color:#4a6fa5;">
            <h3 style="color:#4a6fa5;">🎵 Music Manager</h3>
            <button class="close-btn" onclick="document.getElementById('musicModal').remove()">✕</button>
        </div>
        <p style="font-size:0.85rem;color:#aaa;margin-bottom:12px;">
            Add paths to music files in your GitHub repo.<br>
            Example: <code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;">music/song1.mp3</code>
        </p>
        <div class="jnl-add-row">
            <input type="text" id="musicNameInp" placeholder="Song name (e.g. Chill Beats)" style="flex:1">
        </div>
        <div class="jnl-add-row">
            <input type="text" id="musicPathInp" placeholder="Path (e.g. music/chill.mp3)" style="flex:1">
            <button class="primary-btn" onclick="_addMusicEntry()">+ Add</button>
        </div>
        <div id="musicList" style="margin-top:12px;display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto;">
            ${_musicList.length ? _musicList.map((s,i) => `
                <div class="jnl-task">
                    <span>🎵</span>
                    <span class="jnl-task-text">${escHtml(s.name)}<br>
                        <small style="color:#aaa;">${escHtml(s.path)}</small></span>
                    <button class="reels-ctrl" style="width:28px;height:28px;font-size:0.8rem;" onclick="_testPlay(${i})">▶</button>
                    <button class="jnl-del" onclick="_removeMusicEntry(${i})">✕</button>
                </div>`).join('') : '<div class="jnl-empty">No songs added yet.</div>'}
        </div>
        <div class="modal-footer">
            <button class="secondary-btn" onclick="document.getElementById('musicModal').remove()">Close</button>
        </div>
    </div>`;
    document.body.appendChild(m);
}

async function _addMusicEntry() {
    const name = document.getElementById('musicNameInp')?.value.trim();
    const path = document.getElementById('musicPathInp')?.value.trim();
    if (!name || !path) { showToast('Enter both name and path', 'warning'); return; }
    _musicList.push({ name, path });
    await jnlSet(MUSIC_KEY, _musicList);
    document.getElementById('musicModal')?.remove();
    _showMusicManager();
    showToast('Song added!', 'success');
    if (_musicList.length === 1) _playMusicByPath(_musicList[0]);
}

async function _removeMusicEntry(i) {
    _musicList.splice(i, 1);
    await jnlSet(MUSIC_KEY, _musicList);
    document.getElementById('musicModal')?.remove();
    _showMusicManager();
}

function _testPlay(i) {
    _musicIndex = i;
    _playMusicByPath(_musicList[i]);
    showToast(`Playing: ${_musicList[i].name}`, 'info');
}
