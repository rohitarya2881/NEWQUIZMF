/* =============================================
   pomodoro.js — Pomodoro Timer
   ============================================= */

let pomoInterval   = null;
let pomoSeconds    = 0;
let pomoIsBreak    = false;
let pomoRoundCount = 0;

function startPomodoro() {
    showView('pomodoroContainer');
    pomoReset();
}

function pomoStart() {
    if (pomoInterval) return;
    pomoInterval = setInterval(() => {
        if (pomoSeconds <= 0) {
            clearInterval(pomoInterval); pomoInterval = null;
            if (!pomoIsBreak) { pomoRoundCount++; document.getElementById('pomoRounds').textContent = pomoRoundCount; }
            pomoIsBreak = !pomoIsBreak;
            const mins = parseInt(document.getElementById(pomoIsBreak ? 'pomoBreak' : 'pomoFocus')?.value) || 5;
            pomoSeconds = mins * 60;
            document.getElementById('pomoStatus').textContent = pomoIsBreak ? '☕ Take a break!' : '🎯 Focus time!';
            pomoStart();
            return;
        }
        pomoSeconds--;
        const m = String(Math.floor(pomoSeconds / 60)).padStart(2,'0');
        const s = String(pomoSeconds % 60).padStart(2,'0');
        document.getElementById('pomoDisplay').textContent = `${m}:${s}`;
    }, 1000);
    document.getElementById('pomoStatus').textContent = pomoIsBreak ? '☕ Break in progress' : '🎯 Focus!';
}

function pomoPause() {
    if (pomoInterval) {
        clearInterval(pomoInterval); pomoInterval = null;
        document.getElementById('pomoStatus').textContent = '⏸️ Paused';
    }
}

function pomoReset() {
    clearInterval(pomoInterval); pomoInterval = null;
    pomoIsBreak = false;
    const mins  = parseInt(document.getElementById('pomoFocus')?.value) || 25;
    pomoSeconds = mins * 60;
    const m     = String(Math.floor(pomoSeconds / 60)).padStart(2,'0');
    const disp  = document.getElementById('pomoDisplay');
    if (disp) disp.textContent = `${m}:00`;
    const stat  = document.getElementById('pomoStatus');
    if (stat) stat.textContent = 'Ready to focus!';
}
