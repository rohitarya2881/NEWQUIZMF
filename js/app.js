/* =============================================
   app.js — Global State, Utils, Init
   ============================================= */

// ── Global State ──────────────────────────────
let folderStructure = { id:'root', name:'Root', type:'folder', children:[], path:'/' };
let currentPath     = '/';
let currentFolder   = null;
let currentQuiz     = null;
let currentQuizQuestions = [];
let currentQuestionIndex = 0;
let score            = 0;
let incorrectQuestions = [];
let currentUploadData  = null;

let medalCounts = {
    bronze: parseInt(localStorage.getItem('medalBronze')) || 0,
    silver: parseInt(localStorage.getItem('medalSilver')) || 0,
    gold:   parseInt(localStorage.getItem('medalGold'))   || 0
};

// ── Utility Helpers ───────────────────────────
function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function escHtml(s) {
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtSecs(s) {
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function downloadJSON(data, filename) {
    const b = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = filename;
    a.click();
}

function getAllItems() {
    const res = [], q = [folderStructure];
    while (q.length) {
        const c = q.shift();
        if (c.id !== 'root') res.push(c);
        if (c.children) q.push(...c.children);
    }
    return res;
}

function findItemById(id) {
    const q = [folderStructure];
    while (q.length) {
        const c = q.shift();
        if (c.id === id) return c;
        if (c.children) q.push(...c.children);
    }
    return null;
}

function findItemByPath(path) {
    if (path === '/') return folderStructure;
    const parts = path.split('/').filter(p => p);
    let cur = folderStructure;
    for (const p of parts) {
        if (!cur.children) return null;
        cur = cur.children.find(c => c.name === p);
        if (!cur) return null;
    }
    return cur;
}

function findItemByName(name) {
    const q = [folderStructure];
    while (q.length) {
        const c = q.shift();
        if (c.type === 'folder' && c.name === name) return c;
        if (c.children) q.push(...c.children);
    }
    return null;
}

// ── Toast ─────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
    t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${escHtml(msg)}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

// ── Medal Display ─────────────────────────────
function updateMedalDisplay() {
    ['bronze','silver','gold'].forEach(m => {
        const h = document.getElementById(`${m}-count`);
        const f = document.getElementById(`footer-${m}`);
        if (h) h.textContent = medalCounts[m];
        if (f) f.textContent = medalCounts[m];
    });
}

// ── Theme / Menu / FAB ────────────────────────
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('show');
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

function showQuickActions() {
    const m  = document.getElementById('quickActions');
    const ic = document.querySelector('.fab i');
    m.classList.toggle('hidden');
    if (ic) ic.className = m.classList.contains('hidden') ? 'fas fa-plus' : 'fas fa-times';
}

// ── View Switching ────────────────────────────
function showView(id) {
    ['folderView','quizContainer','flashcardContainer','notesContainer','plannerContainer'].forEach(v => {
        const el = document.getElementById(v);
        if (!el) return;
        el.classList.remove('active');
        el.classList.add('hidden');
        el.style.display = ''; // clear any inline display
    });
    const target = document.getElementById(id);
    if (!target) return;
    target.classList.remove('hidden');
    if (id === 'folderView') {
        target.classList.add('active');
    } else if (id === 'flashcardContainer' || id === 'notesContainer' || id === 'plannerContainer') {
        target.style.display = 'block';
    }
}

function goHome() {
    clearRapidTimer();      // defined in rapid.js
    rapidPhase = '';
    showView('folderView');
    refreshView();
}

// ── Misc stubs ────────────────────────────────
function showAnalysis()  { showToast('Analytics coming soon!','info'); }
function showProgress()  { showToast('Progress coming soon!','info'); }
function setFolderGoals(){ showToast('Goals coming soon!','info'); }
function exportAllData() { createFullBackup(); }   // defined in quiz.js
function selectQuiz(id)  { currentQuiz = findItemById(id); if(currentQuiz) showToast(`Selected: ${currentQuiz.name}`,'info'); }

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('current-year').textContent = new Date().getFullYear();
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.body.classList.add('dark-theme');

    await initDB();               // db.js
    await loadFolderStructure();  // db.js
    navigateToRoot();             // navigation.js
    updateMedalDisplay();
    _startSessionTracker();       // time-on-site tracking
    console.log('QuizMaster Pro ready!');
});

// ── Active Session Tracker ────────────────────
// Only counts time when user is ACTIVE (mouse move, click, keypress, scroll, touch)
// If no activity for 2 minutes → considered idle, stops counting
// Ticks every 30s — if active in last 2min, adds 0.5 min to today's total
function _startSessionTracker() {
    const TODAY = () => new Date().toISOString().split('T')[0];
    const IDLE_THRESHOLD = 2 * 60 * 1000; // 2 minutes idle = stop counting
    let lastActivity = Date.now();

    // Reset idle timer on any user interaction
    const onActivity = () => { lastActivity = Date.now(); };
    ['mousemove','mousedown','keydown','scroll','touchstart','click','wheel']
        .forEach(e => document.addEventListener(e, onActivity, { passive: true }));

    // Every 30 seconds check if user was active
    setInterval(async () => {
        const idle = Date.now() - lastActivity;
        if (idle > IDLE_THRESHOLD) return; // idle — don't count

        const timeMap = (await jnlGet('timeSpent')) || {};
        const d = TODAY();
        // Add 0.5 min (30s tick) stored as float, rounded to 1dp
        timeMap[d] = Math.round(((timeMap[d] || 0) + 0.5) * 10) / 10;
        await jnlSet('timeSpent', timeMap);
    }, 30000);
}
