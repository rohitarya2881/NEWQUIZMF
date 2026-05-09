/* =============================================
   help.js — Help & Onboarding Guide
   Completely standalone — no interference
   with any existing code or data
   ============================================= */

const HELP_SECTIONS = [
    {
        icon: '📁',
        title: 'Folders & Quizzes',
        color: '#4a6fa5',
        steps: [
            'Tap <b>+ Folder</b> to create a subject folder (e.g. SSC GS → History)',
            'Go inside a folder → tap <b>+ Quiz</b> to create a quiz',
            'Single click a folder to open it — breadcrumb shows your location',
            'Tap <b>📝</b> icon on any card to add a personal note (study bookmark)',
            'Tap <b>🔗</b> to share a quiz/folder with anyone via link',
        ]
    },
    {
        icon: '✏️',
        title: 'Adding Questions',
        color: '#8e44ad',
        steps: [
            'Open a quiz → tap <b>Add Question</b> to add manually',
            'Use <b>Smart Upload</b> to bulk import from a JSON file',
            'JSON format: <code>[ { "question":"...", "options":["A","B","C","D"], "correctIndex":0, "explanation":"..." } ]</code>',
            'Tap <b>✏️</b> on any flashcard to edit or delete that question',
            'Use <b>🔀 Shuffle Options</b> in FAB menu to break muscle memory',
        ]
    },
    {
        icon: '▶',
        title: 'Taking a Quiz',
        color: '#27ae60',
        steps: [
            'Open a quiz → tap <b>▶ Start</b> — settings dialog opens first',
            'Set question range (From/To), shuffle on/off, timer mode',
            'Toggle <b>Shuffle Options</b> to randomise A/B/C/D each time',
            'If you exit mid-quiz → <b>📍 bookmark</b> saves automatically',
            'Next time you open that quiz → tap <b>▶ Continue</b> to resume',
        ]
    },
    {
        icon: '🃏',
        title: 'Flashcards',
        color: '#e67e22',
        steps: [
            'Open a quiz → tap <b>Flashcards</b> to view all cards',
            'Tap any card to flip and reveal the answer + explanation',
            'Hover a card → <b>🔍</b> appears (top-left) to Google search the question',
            'Hover a card → <b>✏️</b> appears (top-right) to edit that question',
            'Use <b>Reveal All / Hide All</b> buttons to flip all at once',
        ]
    },
    {
        icon: '🎵',
        title: 'Quiz Reels',
        color: '#e74c3c',
        steps: [
            'Go inside a folder → FAB (＋) → <b>Quiz Reels</b>',
            'Full-screen swipe cards like TikTok/Reels with music',
            'Swipe <b>▲ up</b> for next, <b>▼ down</b> for previous',
            'Tap an option → correct/wrong shown → card auto-flips to explanation',
            'Tap <b>⚙️</b> in music bar to add MP3 files from your GitHub /music/ folder',
        ]
    },
    {
        icon: '📅',
        title: 'Revision Planner',
        color: '#4a6fa5',
        steps: [
            'Sidebar → <b>📅 Revision Planner</b>',
            '<b>Categories tab</b>: create subjects (Polity, History…), assign quizzes to each',
            '<b>Today tab</b>: shows what\'s due today, sorted weakest first — tap ▶ Start',
            'After each quiz → score auto-saved, next review date calculated automatically',
            'Accuracy < 50% → review tomorrow · 95%+ → review in 21 days',
        ]
    },
    {
        icon: '📓',
        title: 'Learning Journal',
        color: '#16a085',
        steps: [
            'Sidebar → <b>Learning Journal</b> → 5 tabs',
            '<b>Today</b>: add daily tasks + tick routine habits',
            '<b>Goals</b>: set goals for tomorrow or this week',
            '<b>Routine</b>: daily habits that auto-appear every day',
            '<b>Daily Log</b>: write free-form entries, edit anytime, filter by today/week',
            '<b>Stats</b>: GitHub-style calendars for tasks + time spent on site',
        ]
    },
    {
        icon: '🏆',
        title: 'Habits & Time Tracker',
        color: '#f39c12',
        steps: [
            'Journal → <b>🏆 Habits</b> tab',
            'Add up to 10 daily habits — each = 10 points (max 100/day)',
            'Every day just tick off completed habits',
            'Monthly bar chart shows your score per day (dates on X, marks on Y)',
            'Time tracker auto-counts active minutes on site (idle ignored) — 1hr = 10pts',
        ]
    },
    {
        icon: '🍅',
        title: 'Pomodoro Flow',
        color: '#c0392b',
        steps: [
            'Sidebar → <b>Pomodoro Timer</b> or FAB → <b>Pomodoro</b>',
            'Set questions per section, study/quiz/break time with sliders',
            '<b>Study phase</b>: flip flashcards at your pace',
            '<b>Quiz phase</b>: answer questions, score shown instantly',
            '<b>Break phase</b>: rest tips shown, previous results visible',
        ]
    },
    {
        icon: '☁️',
        title: 'Google Drive Backup',
        color: '#4a6fa5',
        steps: [
            'Sidebar → Data Management → <b>☁️ Backup to Drive</b>',
            'Sign in with Google once → creates <code>quizmaster_backup.json</code> in your Drive',
            'Every subsequent backup <b>updates the same file</b> — no duplicates',
            'Auto-syncs every 30 minutes if signed in',
            '<b>Restore from Drive</b> → brings back everything including journal & habits',
        ]
    },
    {
        icon: '🔗',
        title: 'Sharing Quizzes',
        color: '#27ae60',
        steps: [
            'Open any folder/quiz → tap <b>🔗</b> button',
            'App uploads quiz to cloud → generates a short share link',
            'Share via <b>WhatsApp</b>, <b>Telegram</b>, or copy link',
            'Friend opens link → sees quiz preview → picks folder to import into → done',
            'Your personal data (journal, scores) is never shared — only quiz content',
        ]
    },
    {
        icon: '📱',
        title: 'Install as App (PWA)',
        color: '#3498db',
        steps: [
            '<b>Android (Chrome)</b>: blue banner appears at bottom → tap Install',
            '<b>iPhone (Safari)</b>: tap Share button → "Add to Home Screen"',
            'App installs with icon on homescreen — opens fullscreen like native app',
            'Works completely <b>offline</b> once installed',
            'Long-press app icon for shortcuts: Take Quiz, Planner, Journal',
        ]
    },
];

// ══════════════════════════════════════════════
// SHOW HELP
// ══════════════════════════════════════════════
function showHelp() {
    document.getElementById('helpOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'helpOverlay';
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:5000;
        background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);
        display:flex;align-items:flex-start;justify-content:center;
        overflow-y:auto;padding:20px 16px 40px;`;

    overlay.innerHTML = `
        <div style="width:100%;max-width:680px;font-family:inherit;">
            <!-- Header -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                <div>
                    <div style="font-size:1.5rem;font-weight:800;color:white;">📚 QuizMaster Pro</div>
                    <div style="font-size:0.85rem;color:rgba(255,255,255,0.6);margin-top:2px;">Complete User Guide</div>
                </div>
                <button onclick="closeHelp()"
                    style="background:rgba(255,255,255,0.12);border:none;color:white;
                    width:36px;height:36px;border-radius:50%;font-size:1.1rem;cursor:pointer;
                    display:flex;align-items:center;justify-content:center;">✕</button>
            </div>

            <!-- Quick nav -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
                ${HELP_SECTIONS.map((s,i) => `
                    <button onclick="document.getElementById('helpSec${i}').scrollIntoView({behavior:'smooth',block:'start'})"
                        style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);
                        color:white;padding:5px 12px;border-radius:20px;cursor:pointer;font-size:0.75rem;
                        font-family:inherit;transition:background 0.15s;white-space:nowrap;">
                        ${s.icon} ${s.title}
                    </button>`).join('')}
            </div>

            <!-- Sections -->
            ${HELP_SECTIONS.map((s,i) => `
                <div id="helpSec${i}" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
                    border-radius:12px;padding:18px 20px;margin-bottom:12px;border-left:4px solid ${s.color};">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                        <span style="font-size:1.4rem;">${s.icon}</span>
                        <span style="font-weight:700;font-size:1rem;color:white;">${s.title}</span>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${s.steps.map((step, si) => `
                            <div style="display:flex;align-items:flex-start;gap:10px;">
                                <span style="width:20px;height:20px;border-radius:50%;background:${s.color};
                                    color:white;font-size:0.65rem;font-weight:700;display:flex;align-items:center;
                                    justify-content:center;flex-shrink:0;margin-top:1px;">${si+1}</span>
                                <span style="font-size:0.86rem;color:rgba(255,255,255,0.85);line-height:1.5;">${step}</span>
                            </div>`).join('')}
                    </div>
                </div>`).join('')}

            <!-- Footer -->
            <div style="text-align:center;padding:20px;color:rgba(255,255,255,0.4);font-size:0.78rem;">
                QuizMaster Pro — Built for serious SSC/UPSC aspirants 🎯
            </div>
        </div>`;

    // Close on background click
    overlay.addEventListener('click', e => { if (e.target === overlay) closeHelp(); });
    document.body.appendChild(overlay);
}

function closeHelp() {
    const el = document.getElementById('helpOverlay');
    if (el) { el.style.opacity = '0'; el.style.transition = 'opacity 0.2s'; setTimeout(() => el.remove(), 200); }
}

// Close on Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('helpOverlay')) closeHelp();
});
