/* =============================================
   planner.js — Smart Revision Planner
   Tabs: Today | Calendar | Categories | Performance
   Storage: IndexedDB key 'revisionPlanner'
   ============================================= */

// ── State ─────────────────────────────────────
let _planner = {
    categories: [],   // [{id,name,color,icon,dailyTarget}]
    quizStats:  {},   // {quizId: {categoryId,attempts[],avgAccuracy,lastAttempted,nextReview,difficulty}}
    dailyPlan:  {}    // {date: {catId: {target,done:[],skipped:[]}}}
};
let _plannerTab    = 'today';
let _calMonth      = null;
let _perfCategory  = 'all';

const PLANNER_KEY  = 'revisionPlanner';
const TODAY_STR    = () => new Date().toISOString().split('T')[0];

// Spaced repetition intervals by accuracy
const SR_INTERVALS = [
    { min: 95, days: 21 },
    { min: 85, days: 14 },
    { min: 70, days: 7  },
    { min: 50, days: 3  },
    { min: 0,  days: 1  }
];

const CAT_COLORS = ['#4a6fa5','#27ae60','#e74c3c','#f39c12','#8e44ad','#16a085','#d35400','#2c3e50','#c0392b','#1abc9c'];
const CAT_ICONS  = ['📚','🎯','🔬','📝','🌍','⚖️','🗺️','💡','📖','🧠'];

// ── Load / Save ───────────────────────────────
async function _plannerLoad() {
    const d = await jnlGet(PLANNER_KEY);
    if (d) _planner = d;
    // Ensure arrays exist
    if (!_planner.categories) _planner.categories = [];
    if (!_planner.quizStats)  _planner.quizStats  = {};
    if (!_planner.dailyPlan)  _planner.dailyPlan   = {};
}

async function _plannerSave() {
    await jnlSet(PLANNER_KEY, _planner);
}

// ── Entry Point ───────────────────────────────
async function showPlanner() {
    showView('plannerContainer');
    await _plannerLoad();
    if (!_calMonth) {
        const n = new Date();
        _calMonth = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
    }
    plannerTab(_plannerTab);
}

function plannerTab(name) {
    _plannerTab = name;
    document.querySelectorAll('.planner-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.planner-panel').forEach(p => p.classList.remove('active'));
    const tb = document.getElementById(`ptab-${name}`);
    const pn = document.getElementById(`ppanel-${name}`);
    if (tb) tb.classList.add('active');
    if (pn) pn.classList.add('active');
    const fns = { today: _renderToday, calendar: _renderCalendar, categories: _renderCategories, performance: _renderPerformance };
    fns[name]?.();
}

// ══════════════════════════════════════════════
// RECORD QUIZ ATTEMPT (called from quiz.js end)
// ══════════════════════════════════════════════
async function recordQuizAttempt(quizId, score, total) {
    await _plannerLoad();
    const accuracy = total > 0 ? Math.round(score / total * 100) : 0;
    const today    = TODAY_STR();

    if (!_planner.quizStats[quizId]) {
        _planner.quizStats[quizId] = { categoryId: null, attempts: [], avgAccuracy: 0, lastAttempted: null, nextReview: null, difficulty: 'unrated' };
    }

    const stat = _planner.quizStats[quizId];
    stat.attempts.unshift({ date: today, accuracy, score, total });
    if (stat.attempts.length > 5) stat.attempts = stat.attempts.slice(0, 5);
    stat.avgAccuracy    = Math.round(stat.attempts.reduce((s,a) => s + a.accuracy, 0) / stat.attempts.length);
    stat.lastAttempted  = today;
    stat.nextReview     = _calcNextReview(stat.avgAccuracy, today);
    stat.difficulty     = accuracy < 50 ? 'hard' : accuracy < 75 ? 'medium' : 'easy';

    // Mark as done in daily plan if this quiz was planned today
    const plan = _planner.dailyPlan[today];
    if (plan && stat.categoryId) {
        const cp = plan[stat.categoryId];
        if (cp && !cp.done.includes(quizId)) {
            cp.done.push(quizId);
            cp.skipped = cp.skipped.filter(id => id !== quizId);
        }
    }

    await _plannerSave();
}

function _calcNextReview(accuracy, fromDate) {
    const interval = SR_INTERVALS.find(r => accuracy >= r.min)?.days || 1;
    const d = new Date(fromDate);
    d.setDate(d.getDate() + interval);
    return d.toISOString().split('T')[0];
}

// ══════════════════════════════════════════════
// TAB 1 — TODAY'S PLAN
// ══════════════════════════════════════════════
function _renderToday() {
    const el = document.getElementById('ppanel-today'); if (!el) return;
    const today = TODAY_STR();

    // Ensure today's plan exists
    if (!_planner.dailyPlan[today]) _planner.dailyPlan[today] = {};

    // Build due list — quizzes whose nextReview <= today
    const dueByCategory = {};
    const allQuizzes    = _getAllQuizzes();

    _planner.categories.forEach(cat => {
        const catQuizzes = allQuizzes.filter(q => {
            const stat = _planner.quizStats[q.id];
            return stat?.categoryId === cat.id;
        });
        const due = catQuizzes.filter(q => {
            const stat = _planner.quizStats[q.id];
            if (!stat?.nextReview) return true;  // never attempted = due
            return stat.nextReview <= today;
        }).sort((a, b) => {
            // Sort: overdue first, then by lowest accuracy
            const sa = _planner.quizStats[a.id];
            const sb = _planner.quizStats[b.id];
            const diffA = sa?.nextReview ? (new Date(today) - new Date(sa.nextReview)) / 86400000 : 999;
            const diffB = sb?.nextReview ? (new Date(today) - new Date(sb.nextReview)) / 86400000 : 999;
            if (diffA !== diffB) return diffB - diffA;
            return (sa?.avgAccuracy || 0) - (sb?.avgAccuracy || 0);
        });

        if (due.length > 0) dueByCategory[cat.id] = { cat, due };
    });

    // Unassigned due quizzes
    const unassignedDue = allQuizzes.filter(q => {
        const stat = _planner.quizStats[q.id];
        return !stat?.categoryId && (!stat?.nextReview || stat.nextReview <= today);
    });

    // Stats
    const totalDue  = Object.values(dueByCategory).reduce((s,v) => s + v.due.length, 0) + unassignedDue.length;
    const planToday = _planner.dailyPlan[today];
    const totalDone = Object.values(planToday).reduce((s,v) => s + (v.done?.length || 0), 0);

    if (_planner.categories.length === 0) {
        el.innerHTML = `<div class="planner-empty-state">
            <div class="planner-empty-icon">🗂️</div>
            <div class="planner-empty-title">No Categories Yet</div>
            <div class="planner-empty-sub">Go to the Categories tab to create categories and assign your quizzes.</div>
            <button class="primary-btn" onclick="plannerTab('categories')">→ Set Up Categories</button>
        </div>`;
        return;
    }

    let html = `
        <div class="planner-today-header">
            <div>
                <div class="planner-today-title">📋 Today's Revision Plan</div>
                <div class="planner-today-date">${new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
            </div>
            <div class="planner-progress-wrap">
                <div class="planner-progress-bar"><div class="planner-progress-fill" style="width:${totalDue>0?Math.round(totalDone/totalDue*100):0}%"></div></div>
                <div class="planner-progress-label">${totalDone} / ${totalDue} done</div>
            </div>
        </div>`;

    if (totalDue === 0) {
        html += `<div class="planner-all-done">
            <div style="font-size:3rem;">🎉</div>
            <div style="font-weight:700;font-size:1.1rem;color:#27ae60;margin:8px 0;">All caught up!</div>
            <div style="color:#aaa;font-size:0.88rem;">No revisions due today. Great work!</div>
        </div>`;
    } else {
        // Category sections
        Object.values(dueByCategory).forEach(({ cat, due }) => {
            const cp      = planToday[cat.id] || { target: cat.dailyTarget || 3, done: [], skipped: [] };
            const target  = cp.target;
            const doneCnt = cp.done.length;
            const toShow  = due.slice(0, target);

            html += `<div class="planner-cat-section">
                <div class="planner-cat-header">
                    <span class="planner-cat-dot" style="background:${cat.color}"></span>
                    <span class="planner-cat-name">${cat.icon} ${escHtml(cat.name)}</span>
                    <span class="planner-cat-badge">${due.length} due</span>
                    <div class="planner-target-row">
                        <span style="font-size:0.78rem;color:#aaa;">Revise:</span>
                        <input type="number" class="planner-target-input" value="${target}" min="1" max="${due.length}"
                            onchange="_updateTarget('${cat.id}',this.value)"
                            title="How many from this category today">
                        <span style="font-size:0.78rem;color:#aaa;">quizzes</span>
                    </div>
                    <span class="planner-done-badge ${doneCnt >= target ? 'done' : ''}">${doneCnt}/${target}</span>
                </div>
                <div class="planner-quiz-list">`;

            toShow.forEach(q => {
                const stat    = _planner.quizStats[q.id] || {};
                const isDone  = cp.done.includes(q.id);
                const isSkip  = cp.skipped.includes(q.id);
                const overdue = stat.nextReview && stat.nextReview < today;
                const qCount  = _getRecommendedQCount(stat);
                const accBadge = stat.avgAccuracy != null
                    ? `<span class="planner-acc-badge ${stat.difficulty}">${stat.avgAccuracy}%</span>` : '<span class="planner-acc-badge unrated">New</span>';

                html += `<div class="planner-quiz-row ${isDone?'planner-done':''} ${isSkip?'planner-skipped':''}">
                    <div class="planner-quiz-info">
                        <div class="planner-quiz-name">${overdue?'🔴 ':''}${escHtml(q.name)}</div>
                        <div class="planner-quiz-meta">
                            ${accBadge}
                            <span class="planner-meta-chip">📝 ${q.questions?.length||0} Qs</span>
                            <span class="planner-meta-chip">🎯 Do ${qCount} Qs</span>
                            ${stat.lastAttempted ? `<span class="planner-meta-chip">🕒 ${_daysAgo(stat.lastAttempted)}</span>` : ''}
                        </div>
                    </div>
                    <div class="planner-quiz-actions">
                        ${isDone
                            ? `<span class="planner-done-tick">✅ Done</span>`
                            : isSkip
                            ? `<span style="color:#aaa;font-size:0.78rem;">Skipped</span>`
                            : `<button class="planner-start-btn" onclick="_plannerStartQuiz('${q.id}','${cat.id}',${qCount})">▶ Start</button>
                               <button class="planner-skip-btn" onclick="_plannerSkip('${q.id}','${cat.id}')">Skip</button>`
                        }
                    </div>
                </div>`;
            });

            html += `</div></div>`;
        });

        // Unassigned
        if (unassignedDue.length > 0) {
            html += `<div class="planner-cat-section">
                <div class="planner-cat-header">
                    <span class="planner-cat-dot" style="background:#aaa"></span>
                    <span class="planner-cat-name">📦 Unassigned</span>
                    <span class="planner-cat-badge">${unassignedDue.length} due</span>
                </div>
                <div class="planner-quiz-list">`;
            unassignedDue.slice(0,5).forEach(q => {
                html += `<div class="planner-quiz-row">
                    <div class="planner-quiz-info">
                        <div class="planner-quiz-name">${escHtml(q.name)}</div>
                        <div class="planner-quiz-meta"><span class="planner-acc-badge unrated">Unassigned</span></div>
                    </div>
                    <div class="planner-quiz-actions">
                        <button class="planner-start-btn" onclick="_plannerStartQuiz('${q.id}',null,10)">▶ Start</button>
                    </div>
                </div>`;
            });
            html += `</div></div>`;
        }
    }

    el.innerHTML = html;
}

async function _updateTarget(catId, val) {
    const today = TODAY_STR();
    if (!_planner.dailyPlan[today]) _planner.dailyPlan[today] = {};
    if (!_planner.dailyPlan[today][catId]) _planner.dailyPlan[today][catId] = { target:3, done:[], skipped:[] };
    _planner.dailyPlan[today][catId].target = Math.max(1, parseInt(val)||1);
    await _plannerSave();
}

function _plannerStartQuiz(quizId, catId, qCount) {
    // Store context so quiz.js can call back
    window._plannerContext = { quizId, catId, fromPlanner: true };
    // Use existing settings dialog with pre-set range
    const quiz = findItemById(quizId);
    if (!quiz) { showToast('Quiz not found','warning'); return; }
    // Navigate to quiz, launch settings
    currentQuiz = quiz;
    startQuiz(quizId);
}

async function _plannerSkip(quizId, catId) {
    const today = TODAY_STR();
    if (!_planner.dailyPlan[today]) _planner.dailyPlan[today] = {};
    if (!_planner.dailyPlan[today][catId]) _planner.dailyPlan[today][catId] = { target:3, done:[], skipped:[] };
    const cp = _planner.dailyPlan[today][catId];
    if (!cp.skipped.includes(quizId)) cp.skipped.push(quizId);
    await _plannerSave();
    _renderToday();
}

function _getRecommendedQCount(stat) {
    if (!stat.avgAccuracy) return 10;
    const total = stat.attempts?.[0]?.total || 10;
    if (stat.avgAccuracy < 50)  return total;           // full quiz
    if (stat.avgAccuracy < 75)  return Math.ceil(total * 0.5);
    return Math.min(10, total);                          // quick 10
}

function _daysAgo(dateStr) {
    const diff = Math.floor((new Date(TODAY_STR()) - new Date(dateStr)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return '1d ago';
    return `${diff}d ago`;
}

// ══════════════════════════════════════════════
// TAB 2 — CALENDAR
// ══════════════════════════════════════════════
function _renderCalendar() {
    const el = document.getElementById('ppanel-calendar'); if (!el) return;
    const [y, m]  = _calMonth.split('-').map(Number);
    const today   = TODAY_STR();
    const monthNm = new Date(y, m-1, 1).toLocaleDateString(undefined,{month:'long',year:'numeric'});

    // Build due map: date → [catIds]
    const dueMap  = {};
    const allQ    = _getAllQuizzes();
    allQ.forEach(q => {
        const stat = _planner.quizStats[q.id];
        if (!stat?.nextReview) {
            const d = stat?.lastAttempted || today;
            if (!dueMap[today]) dueMap[today] = new Set();
            dueMap[today].add(stat?.categoryId || 'none');
        } else {
            if (!dueMap[stat.nextReview]) dueMap[stat.nextReview] = new Set();
            dueMap[stat.nextReview].add(stat?.categoryId || 'none');
        }
    });

    const firstDay  = new Date(y, m-1, 1).getDay();
    const daysInMon = new Date(y, m, 0).getDate();
    const dayNames  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    let html = `
        <div class="planner-cal-nav">
            <button class="planner-cal-btn" onclick="_calChangeMonth(-1)">‹</button>
            <span class="planner-cal-title">${monthNm}</span>
            <button class="planner-cal-btn" onclick="_calChangeMonth(1)">›</button>
        </div>
        <div class="planner-cal-grid">`;

    dayNames.forEach(d => { html += `<div class="planner-cal-head">${d}</div>`; });

    // Empty cells before month start
    for (let i = 0; i < firstDay; i++) html += `<div class="planner-cal-cell empty"></div>`;

    for (let day = 1; day <= daysInMon; day++) {
        const ds      = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const isToday = ds === today;
        const isPast  = ds < today;
        const dueCats = dueMap[ds];
        const isDone  = _planner.dailyPlan[ds];
        let cls = 'planner-cal-cell';
        if (isToday) cls += ' cal-today';
        if (ds < today && dueCats?.size > 0) cls += ' cal-overdue';

        html += `<div class="${cls}" onclick="_calDayClick('${ds}')">
            <div class="cal-day-num">${day}</div>
            <div class="cal-dots">`;
        if (dueCats) {
            [...dueCats].slice(0,4).forEach(catId => {
                const cat = _planner.categories.find(c => c.id === catId);
                html += `<span class="cal-dot" style="background:${cat?.color||'#aaa'}" title="${cat?.name||'Unassigned'}"></span>`;
            });
        }
        html += `</div></div>`;
    }

    html += `</div>
        <div class="planner-cal-legend">
            ${_planner.categories.map(c => `<span class="cal-leg-item"><span class="cal-dot" style="background:${c.color}"></span>${c.icon} ${escHtml(c.name)}</span>`).join('')}
        </div>
        <div id="calDayDetail" class="cal-day-detail"></div>`;

    el.innerHTML = html;
}

function _calChangeMonth(dir) {
    const [y, m] = _calMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    _calMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    _renderCalendar();
}

function _calDayClick(ds) {
    const el = document.getElementById('calDayDetail'); if (!el) return;
    const allQ = _getAllQuizzes();
    const due  = allQ.filter(q => {
        const stat = _planner.quizStats[q.id];
        return stat?.nextReview === ds || (!stat?.nextReview && ds === TODAY_STR());
    });
    if (!due.length) { el.innerHTML = `<div class="planner-empty-sub" style="padding:10px;">No quizzes scheduled for ${ds}</div>`; return; }

    el.innerHTML = `<div class="cal-detail-title">📋 ${ds}</div>` +
        due.map(q => {
            const stat = _planner.quizStats[q.id];
            const cat  = _planner.categories.find(c => c.id === stat?.categoryId);
            return `<div class="cal-detail-row">
                <span class="cal-dot" style="background:${cat?.color||'#aaa'}"></span>
                <span>${escHtml(q.name)}</span>
                <span class="planner-acc-badge ${stat?.difficulty||'unrated'}">${stat?.avgAccuracy != null ? stat.avgAccuracy+'%' : 'New'}</span>
            </div>`;
        }).join('');
}

// ══════════════════════════════════════════════
// TAB 3 — CATEGORIES
// ══════════════════════════════════════════════
function _renderCategories() {
    const el = document.getElementById('ppanel-categories'); if (!el) return;
    const allQ = _getAllQuizzes();

    let html = `
        <div class="planner-section-title">Your Categories</div>
        <div class="planner-cat-create">
            <input type="text" id="newCatName" placeholder="Category name..." class="planner-input" maxlength="40">
            <button class="primary-btn" onclick="_addCategory()"><i class="fas fa-plus"></i> Add</button>
        </div>
        <div class="planner-cat-list">`;

    if (_planner.categories.length === 0) {
        html += `<div class="planner-empty-sub">No categories yet. Add one above.</div>`;
    }

    _planner.categories.forEach((cat, i) => {
        const assigned = allQ.filter(q => _planner.quizStats[q.id]?.categoryId === cat.id);
        const due      = assigned.filter(q => {
            const s = _planner.quizStats[q.id];
            return !s?.nextReview || s.nextReview <= TODAY_STR();
        });
        html += `<div class="planner-cat-card" style="border-left:4px solid ${cat.color}">
            <div class="planner-cat-card-header">
                <span class="planner-cat-icon-pick" onclick="_cycleCatIcon('${cat.id}')" title="Click to change icon">${cat.icon}</span>
                <span class="planner-cat-card-name">${escHtml(cat.name)}</span>
                <div class="planner-cat-card-stats">
                    <span class="planner-meta-chip">${assigned.length} quizzes</span>
                    <span class="planner-meta-chip ${due.length>0?'chip-red':''}">${due.length} due</span>
                </div>
                <div class="planner-cat-card-actions">
                    <label style="font-size:0.78rem;color:#aaa;">Daily target:</label>
                    <input type="number" class="planner-target-input" value="${cat.dailyTarget||3}" min="1" max="20"
                        onchange="_updateCatTarget('${cat.id}',this.value)">
                    <input type="color" value="${cat.color}" class="planner-color-pick"
                        onchange="_updateCatColor('${cat.id}',this.value)" title="Change colour">
                    <button class="jnl-del" onclick="_deleteCategory('${cat.id}')">✕</button>
                </div>
            </div>
            <div class="planner-assign-area">
                <select class="planner-assign-select" onchange="_assignQuiz('${cat.id}',this.value)">
                    <option value="">+ Assign a quiz to this category...</option>
                    ${allQ.filter(q => !_planner.quizStats[q.id]?.categoryId || _planner.quizStats[q.id]?.categoryId !== cat.id)
                        .map(q => `<option value="${q.id}">${escHtml(q.name)}</option>`).join('')}
                </select>
            </div>
            ${assigned.length ? `<div class="planner-assigned-list">
                ${assigned.map(q => {
                    const stat = _planner.quizStats[q.id];
                    return `<div class="planner-assigned-row">
                        <span class="planner-assigned-name">${escHtml(q.name)}</span>
                        <span class="planner-acc-badge ${stat?.difficulty||'unrated'}">${stat?.avgAccuracy != null ? stat.avgAccuracy+'%' : 'New'}</span>
                        <span class="planner-meta-chip">${q.questions?.length||0} Qs</span>
                        <button class="jnl-del" onclick="_unassignQuiz('${q.id}')" title="Remove from category">✕</button>
                    </div>`;
                }).join('')}
            </div>` : ''}
        </div>`;
    });

    // Unassigned quizzes
    const unassigned = allQ.filter(q => !_planner.quizStats[q.id]?.categoryId);
    if (unassigned.length > 0) {
        html += `<div class="planner-section-title" style="margin-top:20px;">📦 Unassigned Quizzes (${unassigned.length})</div>
            <div class="planner-assigned-list">
                ${unassigned.map(q => `<div class="planner-assigned-row">
                    <span class="planner-assigned-name">${escHtml(q.name)}</span>
                    <select class="planner-assign-select-inline" onchange="_assignQuiz2('${q.id}',this.value)">
                        <option value="">Assign to category...</option>
                        ${_planner.categories.map(c => `<option value="${c.id}">${c.icon} ${escHtml(c.name)}</option>`).join('')}
                    </select>
                </div>`).join('')}
            </div>`;
    }

    html += `</div>`;
    el.innerHTML = html;
}

async function _addCategory() {
    const inp  = document.getElementById('newCatName');
    const name = inp?.value.trim(); if (!name) return;
    const idx  = _planner.categories.length;
    _planner.categories.push({
        id:          'cat_' + Date.now(),
        name,
        color:       CAT_COLORS[idx % CAT_COLORS.length],
        icon:        CAT_ICONS[idx  % CAT_ICONS.length],
        dailyTarget: 3
    });
    await _plannerSave();
    if (inp) inp.value = '';
    _renderCategories();
}

async function _deleteCategory(catId) {
    if (!confirm('Delete this category? Quizzes will become unassigned.')) return;
    _planner.categories = _planner.categories.filter(c => c.id !== catId);
    Object.values(_planner.quizStats).forEach(s => { if (s.categoryId === catId) s.categoryId = null; });
    await _plannerSave();
    _renderCategories();
}

async function _assignQuiz(catId, quizId) {
    if (!quizId) return;
    if (!_planner.quizStats[quizId]) _planner.quizStats[quizId] = { categoryId: null, attempts: [], avgAccuracy: null, lastAttempted: null, nextReview: null, difficulty: 'unrated' };
    _planner.quizStats[quizId].categoryId = catId;
    await _plannerSave();
    _renderCategories();
}

async function _assignQuiz2(quizId, catId) {
    if (!catId) return;
    await _assignQuiz(catId, quizId);
}

async function _unassignQuiz(quizId) {
    if (_planner.quizStats[quizId]) _planner.quizStats[quizId].categoryId = null;
    await _plannerSave();
    _renderCategories();
}

async function _updateCatTarget(catId, val) {
    const cat = _planner.categories.find(c => c.id === catId);
    if (cat) cat.dailyTarget = Math.max(1, parseInt(val)||1);
    await _plannerSave();
}

async function _updateCatColor(catId, color) {
    const cat = _planner.categories.find(c => c.id === catId);
    if (cat) cat.color = color;
    await _plannerSave();
}

async function _cycleCatIcon(catId) {
    const cat = _planner.categories.find(c => c.id === catId);
    if (!cat) return;
    const idx = CAT_ICONS.indexOf(cat.icon);
    cat.icon = CAT_ICONS[(idx + 1) % CAT_ICONS.length];
    await _plannerSave();
    _renderCategories();
}

// ══════════════════════════════════════════════
// TAB 4 — PERFORMANCE
// ══════════════════════════════════════════════
function _renderPerformance() {
    const el = document.getElementById('ppanel-performance'); if (!el) return;
    const allQ = _getAllQuizzes();

    // Category filter
    let html = `<div class="planner-perf-filter">
        <button class="jnl-filter-btn ${_perfCategory==='all'?'active':''}" onclick="_setPerfCat('all')">All</button>
        ${_planner.categories.map(c => `
            <button class="jnl-filter-btn ${_perfCategory===c.id?'active':''}" onclick="_setPerfCat('${c.id}')"
                style="${_perfCategory===c.id?'background:'+c.color+';border-color:'+c.color:''}">
                ${c.icon} ${escHtml(c.name)}
            </button>`).join('')}
    </div>`;

    const filtered = allQ.filter(q => {
        if (_perfCategory === 'all') return !!_planner.quizStats[q.id];
        return _planner.quizStats[q.id]?.categoryId === _perfCategory;
    });

    if (filtered.length === 0) {
        html += `<div class="planner-empty-sub" style="padding:20px 0;">No quiz data yet for this category. Take some quizzes first!</div>`;
        el.innerHTML = html;
        return;
    }

    // Sort by accuracy ascending (weakest first)
    filtered.sort((a,b) => {
        const sa = _planner.quizStats[a.id]?.avgAccuracy ?? -1;
        const sb = _planner.quizStats[b.id]?.avgAccuracy ?? -1;
        return sa - sb;
    });

    html += `<div class="planner-perf-list">`;
    filtered.forEach(q => {
        const stat = _planner.quizStats[q.id];
        const cat  = _planner.categories.find(c => c.id === stat?.categoryId);
        const acc  = stat?.avgAccuracy ?? null;
        const next = stat?.nextReview;
        const today = TODAY_STR();
        const isOverdue = next && next < today;
        const isDue     = next === today;

        // Mini accuracy bars for last 5 attempts
        const bars = (stat?.attempts || []).map(a =>
            `<div class="perf-mini-bar" style="height:${a.accuracy}%;background:${a.accuracy>=75?'#27ae60':a.accuracy>=50?'#f39c12':'#e74c3c'}" title="${a.date}: ${a.accuracy}%"></div>`
        ).join('');

        html += `<div class="planner-perf-row">
            <div class="planner-perf-left">
                <div class="planner-perf-name">${escHtml(q.name)}</div>
                <div class="planner-perf-meta">
                    ${cat ? `<span class="cal-dot" style="background:${cat.color}"></span><span style="font-size:0.78rem;">${cat.icon} ${escHtml(cat.name)}</span>` : ''}
                    <span class="planner-meta-chip">${q.questions?.length||0} Qs</span>
                    <span class="planner-meta-chip">${stat?.attempts?.length||0} attempts</span>
                    ${stat?.lastAttempted ? `<span class="planner-meta-chip">Last: ${_daysAgo(stat.lastAttempted)}</span>` : ''}
                    <span class="planner-meta-chip ${isOverdue?'chip-red':isDue?'chip-blue':''}">
                        Next: ${next ? (isOverdue?'⚠️ Overdue':isDue?'Today':next) : 'Due now'}
                    </span>
                </div>
            </div>
            <div class="planner-perf-right">
                <div class="perf-mini-chart">${bars}</div>
                <div class="planner-acc-big ${stat?.difficulty||'unrated'}">${acc != null ? acc+'%' : 'New'}</div>
            </div>
        </div>`;
    });

    html += `</div>`;
    el.innerHTML = html;
}

function _setPerfCat(catId) {
    _perfCategory = catId;
    _renderPerformance();
}

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function _getAllQuizzes() {
    // Recursively collect all quizzes from folderStructure
    const quizzes = [];
    const walk = (node) => {
        if (!node) return;
        if (node.type === 'quiz') { quizzes.push(node); return; }
        (node.children || []).forEach(walk);
    };
    walk(folderStructure);
    return quizzes;
}
