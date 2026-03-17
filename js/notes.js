/* =============================================
   notes.js — Advanced Journal (IndexedDB)
   ============================================= */

const TODAY = () => new Date().toISOString().split('T')[0];
const FMT   = d  => new Date(d).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});

// ── In-memory cache (loaded once on open) ────
let _jnl = {
    todayTasks  : {},
    goals       : [],
    routine     : [],
    routineDone : {},
    logs        : [],
    history     : {},
    timeSpent   : {}   // { [date]: minutes }
};

async function _jnlLoad() {
    const keys = ['todayTasks','goals','routine','routineDone','logs','history','timeSpent'];
    for (const k of keys) {
        const v = await jnlGet(k);
        if (v !== null) _jnl[k] = v;
    }
}

async function _jnlSave(key) {
    await jnlSet(key, _jnl[key]);
}

// ── Entry point ───────────────────────────────
async function showNotes() {
    showView('notesContainer');
    await _jnlLoad();
    document.getElementById('jnlDateHeading').textContent =
        new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    jnlTab('today');
}

function jnlTab(name) {
    document.querySelectorAll('.jnl-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.jnl-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('jtab-'+name)?.classList.add('active');
    document.getElementById('jpanel-'+name)?.classList.add('active');
    const fn = {today:renderToday,goals:renderGoals,routine:renderRoutine,log:renderLog,stats:renderStats,habits:renderHabits};
    fn[name]?.();
}

// ══════════════════════════════════════════════
// TODAY
// ══════════════════════════════════════════════
async function addTodayTask() {
    const inp = document.getElementById('todayTaskInput');
    const text = inp?.value.trim(); if (!text) return;
    const d = TODAY();
    if (!_jnl.todayTasks[d]) _jnl.todayTasks[d] = [];
    _jnl.todayTasks[d].push({ id: Date.now(), text, done: false });
    await _jnlSave('todayTasks');
    inp.value = '';
    renderToday(); _recordHistory();
}

async function toggleTodayTask(id) {
    const d = TODAY();
    const t = _jnl.todayTasks[d]?.find(t => t.id === id);
    if (t) t.done = !t.done;
    await _jnlSave('todayTasks');
    renderToday(); _recordHistory();
}

async function deleteTodayTask(id) {
    const d = TODAY();
    _jnl.todayTasks[d] = (_jnl.todayTasks[d] || []).filter(t => t.id !== id);
    await _jnlSave('todayTasks');
    renderToday(); _recordHistory();
}

function renderToday() {
    const d       = TODAY();
    const tasks   = _jnl.todayTasks[d] || [];
    const routine = _jnl.routine;
    const rdone   = _jnl.routineDone[d] || [];

    const tl = document.getElementById('todayTaskList');
    if (tl) tl.innerHTML = tasks.length
        ? tasks.map(t => `<div class="jnl-task ${t.done?'done':''}">
            <span class="jnl-check" onclick="toggleTodayTask(${t.id})">${t.done?'✅':'⬜'}</span>
            <span class="jnl-task-text">${escHtml(t.text)}</span>
            <button class="jnl-del" onclick="deleteTodayTask(${t.id})">✕</button>
          </div>`).join('')
        : '<div class="jnl-empty">No tasks yet — add one above ↑</div>';

    const rl = document.getElementById('routineTodayList');
    if (rl) rl.innerHTML = routine.length
        ? routine.map(r => { const done = rdone.includes(r.id); return `
            <div class="jnl-task ${done?'done':''}">
                <span class="jnl-check" onclick="toggleRoutineToday(${r.id})">${done?'✅':'⬜'}</span>
                <span class="jnl-task-text">${escHtml(r.text)}</span>
                <span class="jnl-routine-badge">🔁</span>
            </div>`; }).join('')
        : '<div class="jnl-empty">No routine tasks — add them in the Routine tab →</div>';

    const done  = tasks.filter(t=>t.done).length + rdone.length;
    const total = tasks.length + routine.length;
    const prog  = document.getElementById('todayProgress');
    if (prog) { prog.textContent = `${done}/${total}`; prog.className = 'jnl-badge '+(total&&done===total?'jnl-badge-green':'jnl-badge-blue'); }
}

// ══════════════════════════════════════════════
// GOALS
// ══════════════════════════════════════════════
async function addGoal() {
    const inp = document.getElementById('goalInput');
    const text = inp?.value.trim(); if (!text) return;
    const tom = new Date(); tom.setDate(tom.getDate()+1);
    _jnl.goals.unshift({ id: Date.now(), text, done: false, date: TODAY(), targetDate: tom.toISOString().split('T')[0] });
    await _jnlSave('goals');
    inp.value = ''; renderGoals();
}

async function toggleGoal(id) {
    const g = _jnl.goals.find(g => g.id === id);
    if (g) { g.done = !g.done; g.completedDate = g.done ? TODAY() : null; }
    await _jnlSave('goals');
    renderGoals(); _recordHistory();
}

async function deleteGoal(id) {
    _jnl.goals = _jnl.goals.filter(g => g.id !== id);
    await _jnlSave('goals'); renderGoals();
}

function renderGoals() {
    const tom = new Date(); tom.setDate(tom.getDate()+1);
    const tomStr = tom.toISOString().split('T')[0];
    const tomGoals = _jnl.goals.filter(g => g.targetDate === tomStr);
    const otherGoals = _jnl.goals.filter(g => g.targetDate !== tomStr);

    const gl = document.getElementById('goalList');
    if (gl) gl.innerHTML = tomGoals.length
        ? tomGoals.map(g => _goalCard(g)).join('')
        : '<div class="jnl-empty">No goals set for tomorrow yet.</div>';

    const ugl = document.getElementById('upcomingGoalList');
    if (ugl) ugl.innerHTML = otherGoals.length
        ? otherGoals.map(g => _goalCard(g, true)).join('')
        : '<div class="jnl-empty">No other goals.</div>';
}

function _goalCard(g, showDate=false) {
    return `<div class="jnl-task ${g.done?'done':''}">
        <span class="jnl-check" onclick="toggleGoal(${g.id})">${g.done?'✅':'⬜'}</span>
        <span class="jnl-task-text">${escHtml(g.text)}${showDate?`<span class="jnl-date-tag">📅 ${FMT(g.targetDate)}</span>`:''}</span>
        <button class="jnl-del" onclick="deleteGoal(${g.id})">✕</button>
    </div>`;
}

// ══════════════════════════════════════════════
// ROUTINE
// ══════════════════════════════════════════════
async function addRoutine() {
    const inp = document.getElementById('routineInput');
    const text = inp?.value.trim(); if (!text) return;
    _jnl.routine.push({ id: Date.now(), text });
    await _jnlSave('routine');
    inp.value = ''; renderRoutine();
}

async function deleteRoutine(id) {
    _jnl.routine = _jnl.routine.filter(r => r.id !== id);
    await _jnlSave('routine'); renderRoutine();
}

async function toggleRoutineToday(id) {
    const d = TODAY();
    if (!_jnl.routineDone[d]) _jnl.routineDone[d] = [];
    if (_jnl.routineDone[d].includes(id)) _jnl.routineDone[d] = _jnl.routineDone[d].filter(x => x !== id);
    else _jnl.routineDone[d].push(id);
    await _jnlSave('routineDone');
    renderRoutine(); renderToday(); _recordHistory();
}

function renderRoutine() {
    const rdone = _jnl.routineDone[TODAY()] || [];
    const rl = document.getElementById('routineList'); if (!rl) return;
    rl.innerHTML = _jnl.routine.length
        ? _jnl.routine.map(r => { const done = rdone.includes(r.id); return `
            <div class="jnl-task ${done?'done':''}">
                <span class="jnl-check" onclick="toggleRoutineToday(${r.id})">${done?'✅':'⬜'}</span>
                <span class="jnl-task-text">${escHtml(r.text)}</span>
                <span class="jnl-routine-badge">🔁 Daily</span>
                <button class="jnl-del" onclick="deleteRoutine(${r.id})">✕</button>
            </div>`; }).join('')
        : '<div class="jnl-empty">No routine tasks yet. Add habits you want to do every day.</div>';
}

// ══════════════════════════════════════════════
// DAILY LOG
// ══════════════════════════════════════════════
async function saveLog() {
    const inp = document.getElementById('logInput');
    const text = inp?.value.trim(); if (!text) return;
    _jnl.logs.unshift({ id: Date.now(), date: new Date().toISOString(), text });
    await _jnlSave('logs');
    inp.value = ''; renderLog();
    showToast('Log entry saved', 'success');
}

async function deleteLog(id) {
    _jnl.logs = _jnl.logs.filter(l => l.id !== id);
    await _jnlSave('logs'); renderLog();
}

function renderLog() {
    const ll = document.getElementById('logList'); if (!ll) return;
    ll.innerHTML = _jnl.logs.length
        ? _jnl.logs.map(l => `<div class="jnl-log-card">
            <button class="jnl-del" onclick="deleteLog(${l.id})">✕</button>
            <div class="jnl-log-date">📅 ${new Date(l.date).toLocaleString()}</div>
            <div class="jnl-log-text">${escHtml(l.text)}</div>
          </div>`).join('')
        : '<div class="jnl-empty">No entries yet. Write what you did today!</div>';
}

document.addEventListener('keydown', e => {
    if (document.activeElement?.id === 'logInput' && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); saveLog();
    }
});

// ══════════════════════════════════════════════
// HISTORY & STATS
// ══════════════════════════════════════════════
async function _recordHistory() {
    const d = TODAY();
    const tasks = _jnl.todayTasks[d] || [];
    _jnl.history[d] = {
        total:        tasks.length,
        done:         tasks.filter(t=>t.done).length,
        routineTotal: _jnl.routine.length,
        routineDone:  (_jnl.routineDone[d] || []).length,
        goalsTotal:   _jnl.goals.length,
        goalsDone:    _jnl.goals.filter(g=>g.done).length,
    };
    await _jnlSave('history');
}

function renderStats() {
    const d        = TODAY();
    const h        = _jnl.history[d] || {total:0,done:0,routineTotal:0,routineDone:0,goalsTotal:0,goalsDone:0};
    const totalDone = h.done + h.routineDone;
    const totalAll  = h.total + h.routineTotal;
    const pct       = totalAll ? Math.round(totalDone/totalAll*100) : 0;
    const streak    = _calcStreak();
    const todayMins = (_jnl.timeSpent||{})[d] || 0;

    // Stat cards
    const sg = document.getElementById('jnlStatsGrid');
    if (sg) sg.innerHTML = `
        <div class="jnl-stat-card">
            <div class="jnl-stat-icon">✅</div>
            <div class="jnl-stat-val">${totalDone}/${totalAll}</div>
            <div class="jnl-stat-lbl">Today Done</div>
            <div class="jnl-stat-bar"><div style="width:${pct}%"></div></div>
        </div>
        <div class="jnl-stat-card">
            <div class="jnl-stat-icon">🎯</div>
            <div class="jnl-stat-val">${h.goalsDone||0}/${h.goalsTotal||0}</div>
            <div class="jnl-stat-lbl">Goals Achieved</div>
        </div>
        <div class="jnl-stat-card">
            <div class="jnl-stat-icon">🔥</div>
            <div class="jnl-stat-val">${streak}</div>
            <div class="jnl-stat-lbl">Day Streak</div>
        </div>
        <div class="jnl-stat-card">
            <div class="jnl-stat-icon">⏱️</div>
            <div class="jnl-stat-val">${todayMins}m</div>
            <div class="jnl-stat-lbl">Today on Site</div>
        </div>`;

    // Dual GitHub-style calendars
    const wc = document.getElementById('jnlWeekChart');
    if (wc) {
        const isDark = document.body.classList.contains('dark-theme');
        wc.innerHTML = `
            <div class="dual-cal-label">⏱️ Time Spent on Site</div>
            <div id="calTime"></div>
            <div class="dual-cal-label" style="margin-top:20px;">✅ Task Completion</div>
            <div id="calTasks"></div>`;
        _renderCal(document.getElementById('calTime'),  _jnl.timeSpent||{},   'time',  isDark);
        _renderCal(document.getElementById('calTasks'), _jnl.history||{},     'tasks', isDark);
    }

    // Recent history
    const hl = document.getElementById('jnlHistoryList');
    if (hl) {
        const entries = Object.entries(_jnl.history||{}).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,10);
        hl.innerHTML = entries.length ? entries.map(([date,hh]) => {
            const tot = (hh.total||0)+(hh.routineTotal||0);
            const dn  = (hh.done||0)+(hh.routineDone||0);
            const p   = tot ? Math.round(dn/tot*100) : 0;
            const emoji = p===100?'🌟':p>=70?'✅':p>=40?'📈':'📉';
            return `<div class="jnl-log-card">
                <div class="jnl-log-date">${emoji} ${FMT(date)}</div>
                <div style="display:flex;align-items:center;gap:10px;margin-top:6px;">
                    <div class="jnl-hist-bar"><div style="width:${p}%;background:${p===100?'#27ae60':p>=70?'#4a6fa5':'#f39c12'}"></div></div>
                    <span style="font-size:0.82rem;font-weight:700;color:#4a6fa5;">${p}% · ${dn}/${tot}</span>
                </div></div>`;
        }).join('') : '<div class="jnl-empty">No history yet.</div>';
    }
}

// ── Calendar renderer ─────────────────────────
function _renderCal(el, data, mode, isDark) {
    if (!el) return;

    const CELL = 11;  // must match CSS .cal-cell width/height
    const GAP  = 3;   // must match CSS .cal-weeks gap
    const STEP = CELL + GAP; // 14px per column

    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];

    // Start from Sunday 52 weeks before this week's Sunday
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const start = new Date(weekStart);
    start.setDate(start.getDate() - 52 * 7);

    // Palettes
    const pal = mode === 'time'
        ? (isDark ? ['#161b22','#0e4429','#006d32','#26a641','#39d353']
                  : ['#ebedf0','#9be9a8','#40c463','#30a14e','#216e39'])
        : (isDark ? ['#161b22','#0a3069','#0550ae','#388bfd','#58a6ff']
                  : ['#ebedf0','#bfdbfe','#60a5fa','#2563eb','#1e3a8a']);

    const getLevel = ds => {
        if (mode === 'time') {
            const m = data[ds] || 0;
            return !m ? 0 : m < 5 ? 1 : m < 15 ? 2 : m < 30 ? 3 : 4;
        }
        const hh = data[ds]; if (!hh) return 0;
        const tot = (hh.total||0)+(hh.routineTotal||0);
        const dn  = (hh.done||0)+(hh.routineDone||0);
        if (!tot) return 0;
        const p = Math.round(dn/tot*100);
        return !p ? 0 : p < 40 ? 1 : p < 70 ? 2 : p < 100 ? 3 : 4;
    };

    const getTip = ds => {
        if (mode === 'time') {
            const m = data[ds]||0;
            return `${ds}: ${m ? m+' min on site' : 'no activity'}`;
        }
        const hh = data[ds];
        const tot = hh ? (hh.total||0)+(hh.routineTotal||0) : 0;
        const dn  = hh ? (hh.done||0)+(hh.routineDone||0) : 0;
        return tot ? `${ds}: ${dn}/${tot} tasks done` : `${ds}: no tasks`;
    };

    // Build week columns + detect month breaks
    const weeks = [];
    const monthBreaks = [];
    let lastMonth = -1;
    const cur = new Date(start);

    for (let col = 0; col <= 52; col++) {
        const week = [];
        for (let row = 0; row < 7; row++) {
            const ds     = cur.toISOString().split('T')[0];
            const future = cur > today;
            if (row === 0 && !future) {
                const m = cur.getMonth();
                if (m !== lastMonth) { monthBreaks.push({ col, label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m] }); lastMonth = m; }
            }
            week.push({ ds, level: future ? -1 : getLevel(ds), tip: future ? '' : getTip(ds), isToday: ds === todayStr, future });
            cur.setDate(cur.getDate() + 1);
        }
        weeks.push(week);
        if (cur > today) break;
    }

    const totalCols = weeks.length;
    const DAY_LABEL_W = 26; // must match .cal-day-labels width + gap

    // Month row — absolute labels, width = day-label-offset + totalCols * STEP
    const monthRowW = DAY_LABEL_W + totalCols * STEP;
    let monthHTML = `<div class="cal-month-row" style="width:${monthRowW}px;">`;
    monthBreaks.forEach(mb => {
        monthHTML += `<span class="cal-month-lbl" style="left:${DAY_LABEL_W + mb.col * STEP}px">${mb.label}</span>`;
    });
    monthHTML += '</div>';

    // Day labels (Mon/Wed/Fri only)
    const dayNames = ['','Mon','','Wed','','Fri',''];
    const dayLabelsHTML = '<div class="cal-day-labels">' + dayNames.map(d=>`<span>${d}</span>`).join('') + '</div>';

    // Week cells
    let weeksHTML = '<div class="cal-weeks">';
    weeks.forEach(wk => {
        weeksHTML += '<div class="cal-week">';
        wk.forEach(c => {
            const bg  = pal[c.level < 0 ? 0 : c.level];
            const out = c.isToday ? 'outline:2px solid #4a6fa5;outline-offset:-2px;' : '';
            weeksHTML += `<div class="cal-cell" style="background:${bg};${out}" title="${c.tip}"></div>`;
        });
        weeksHTML += '</div>';
    });
    weeksHTML += '</div>';

    // Legend
    const legLabels = mode === 'time' ? ['None','<5m','5-15m','15-30m','30m+'] : ['0%','1-39%','40-69%','70-99%','100%'];
    let legendHTML = '<div class="cal-legend"><span>Less</span>';
    pal.forEach((c,i) => legendHTML += `<div class="cal-cell" style="background:${c}" title="${legLabels[i]}"></div>`);
    legendHTML += '<span>More</span></div>';

    el.innerHTML = `
        <div class="cal-card">
            <div class="cal-scroll" id="calScroll_${mode}">
                <div class="cal-inner">
                    ${monthHTML}
                    <div class="cal-body">${dayLabelsHTML}${weeksHTML}</div>
                </div>
            </div>
            ${legendHTML}
        </div>`;

    // Scroll to rightmost (most recent) — rAF ensures layout is painted first
    const scrollEl = el.querySelector('.cal-scroll');
    if (scrollEl) requestAnimationFrame(() => { scrollEl.scrollLeft = scrollEl.scrollWidth; });
}

function _calcStreak() {
    let streak = 0;
    const dt = new Date();
    for (let i=0; i<365; i++) {
        const ds = dt.toISOString().split('T')[0];
        const hh = _jnl.history[ds];
        if (!hh) break;
        const tot = hh.total + hh.routineTotal;
        const dn  = hh.done  + hh.routineDone;
        if (tot > 0 && dn > 0) streak++;
        else if (i > 0) break;
        dt.setDate(dt.getDate()-1);
    }
    return streak;
}
