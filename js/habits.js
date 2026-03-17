/* =============================================
   habits.js — Daily Habits Tracker (10 habits × 10pts)
   Storage: IndexedDB via jnlGet/jnlSet
   Keys: 'habits' (list), 'habitDone' ({date:[ids]})
   ============================================= */

let _habits   = [];          // [{id,text}] max 10
let _habitDone = {};         // { 'YYYY-MM-DD': [id,...] }
let _habitMonth = null;      // currently viewed month 'YYYY-MM'

const HABIT_TODAY  = () => new Date().toISOString().split('T')[0];
const HABIT_MAX    = 10;
const HABIT_PTS    = 10;     // points per habit

async function _habitLoad() {
    const h = await jnlGet('habits');
    const d = await jnlGet('habitDone');
    if (h) _habits    = h;
    if (d) _habitDone = d;
}

async function _habitSave() {
    await jnlSet('habits',    _habits);
    await jnlSet('habitDone', _habitDone);
}

// ── Called by jnlTab ─────────────────────────
async function renderHabits() {
    await _habitLoad();
    if (!_habitMonth) {
        const now = new Date();
        _habitMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    }
    _renderHabitSetup();
    _renderHabitChecklist();
    _renderHabitChart();
    _updateHabitScore();
}

// ── Add habit ────────────────────────────────
async function addHabit() {
    if (_habits.length >= HABIT_MAX) { showToast(`Max ${HABIT_MAX} habits allowed`, 'warning'); return; }
    const inp = document.getElementById('habitInput');
    const text = inp?.value.trim(); if (!text) return;
    _habits.push({ id: Date.now(), text });
    await _habitSave();
    inp.value = '';
    _renderHabitSetup();
    _renderHabitChecklist();
    _updateHabitScore();
}

async function deleteHabit(id) {
    _habits = _habits.filter(h => h.id !== id);
    // Remove from all done records
    for (const d in _habitDone) _habitDone[d] = _habitDone[d].filter(x => x !== id);
    await _habitSave();
    _renderHabitSetup();
    _renderHabitChecklist();
    _updateHabitScore();
    _renderHabitChart();
}

// ── Toggle done today ────────────────────────
async function toggleHabit(id) {
    const d = HABIT_TODAY();
    if (!_habitDone[d]) _habitDone[d] = [];
    if (_habitDone[d].includes(id)) _habitDone[d] = _habitDone[d].filter(x => x !== id);
    else _habitDone[d].push(id);
    await _habitSave();
    _renderHabitChecklist();
    _updateHabitScore();
    _renderHabitChart();
}

// ── Render setup list ────────────────────────
function _renderHabitSetup() {
    const cnt = document.getElementById('habitCount');
    if (cnt) cnt.textContent = `${_habits.length}/${HABIT_MAX}`;

    // Hide add row when full
    const row = document.getElementById('habitAddRow');
    if (row) row.style.display = _habits.length >= HABIT_MAX ? 'none' : 'flex';

    const el = document.getElementById('habitSetupList'); if (!el) return;
    el.innerHTML = _habits.length
        ? _habits.map(h => `
            <div class="jnl-task">
                <span style="font-size:1rem;">💪</span>
                <span class="jnl-task-text">${escHtml(h.text)}</span>
                <button class="jnl-del" onclick="deleteHabit(${h.id})">✕</button>
            </div>`).join('')
        : '<div class="jnl-empty">Add up to 10 daily habits above ↑</div>';
}

// ── Render today checklist ───────────────────
function _renderHabitChecklist() {
    const el = document.getElementById('habitCheckList'); if (!el) return;
    const done = _habitDone[HABIT_TODAY()] || [];
    el.innerHTML = _habits.length
        ? _habits.map(h => {
            const isDone = done.includes(h.id);
            return `<div class="jnl-task ${isDone ? 'done' : ''}">
                <span class="jnl-check" onclick="toggleHabit(${h.id})">${isDone ? '✅' : '⬜'}</span>
                <span class="jnl-task-text">${escHtml(h.text)}</span>
                <span style="font-size:0.75rem;font-weight:700;color:${isDone?'#27ae60':'#aaa'};flex-shrink:0;">+${HABIT_PTS}pts</span>
            </div>`;
          }).join('')
        : '<div class="jnl-empty">No habits set yet — add them above ↑</div>';
}

// ── Score badge ──────────────────────────────
function _updateHabitScore() {
    const done  = (_habitDone[HABIT_TODAY()] || []).length;
    const score = done * HABIT_PTS;
    const max   = _habits.length * HABIT_PTS;
    const el    = document.getElementById('habitScoreBadge'); if (!el) return;
    el.textContent = `${score} / ${max} pts`;
    el.className = `jnl-badge ${score === max && max > 0 ? 'jnl-badge-green' : 'jnl-badge-blue'}`;
}

// ── Month navigation ─────────────────────────
function habitChangeMonth(dir) {
    const [y, m] = _habitMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    _habitMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    _renderHabitChart();
}

// ── Monthly bar chart — dates on X, marks on Y ──
function _renderHabitChart() {
    const el = document.getElementById('habitBarChart'); if (!el) return;
    const lbl = document.getElementById('habitMonthLabel');

    const [y, m] = _habitMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthName = new Date(y, m-1, 1).toLocaleDateString(undefined, {month:'long', year:'numeric'});
    if (lbl) lbl.textContent = monthName;

    const maxPts  = _habits.length * HABIT_PTS || 100;
    const today   = HABIT_TODAY();
    const isDark  = document.body.classList.contains('dark-theme');

    // Y axis ticks: 0, 25, 50, 75, 100 (as actual points)
    const yTicks  = [0, 25, 50, 75, 100].map(p => Math.round(p * maxPts / 100));
    const CHART_H = 160; // px height of bar area

    // Build data
    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const ds     = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const done   = (_habitDone[ds] || []).length;
        const score  = done * HABIT_PTS;
        const pct    = maxPts > 0 ? score / maxPts * 100 : 0;
        data.push({ day, ds, score, pct, isToday: ds === today, isFuture: ds > today });
    }

    const barColor = (pct, isFuture) => {
        if (isFuture) return 'transparent';
        if (pct === 0) return isDark ? '#1e2a35' : '#e0e0e0';
        if (pct >= 100) return '#27ae60';
        if (pct >= 70)  return '#4a6fa5';
        if (pct >= 40)  return '#f39c12';
        return '#e74c3c';
    };

    let html = `<div class="hbc-wrap">
        <!-- Y axis -->
        <div class="hbc-yaxis">`;
    [...yTicks].reverse().forEach(v => {
        html += `<div class="hbc-ytick">${v}</div>`;
    });
    html += `</div>
        <!-- Chart area -->
        <div class="hbc-area">
            <!-- Y gridlines -->
            <div class="hbc-grid">`;
    yTicks.forEach(() => { html += `<div class="hbc-gridline"></div>`; });
    html += `</div>
            <!-- Bars -->
            <div class="hbc-bars">`;
    data.forEach(d => {
        const h   = Math.max(0, Math.min(100, d.pct));
        const col = barColor(d.pct, d.isFuture);
        html += `<div class="hbc-bar-col ${d.isToday ? 'hbc-today' : ''}">
            <div class="hbc-bar-inner" title="${d.ds}: ${d.score}pts">
                <div class="hbc-bar-fill" style="height:${h}%;background:${col};"></div>
            </div>
            <div class="hbc-bar-label">${d.day}</div>
        </div>`;
    });
    html += `</div></div></div>`;

    // Legend
    html += `<div class="hbc-legend">
        <span class="habit-leg" style="--c:#27ae60">100pts</span>
        <span class="habit-leg" style="--c:#4a6fa5">70%+</span>
        <span class="habit-leg" style="--c:#f39c12">40%+</span>
        <span class="habit-leg" style="--c:#e74c3c">&lt;40%</span>
    </div>`;

    el.innerHTML = html;
}
