/* =============================================
   help.js — COMPLETE UPDATED VERSION
   Includes:
   ✅ Help System
   ✅ AI Question Generator
   ✅ Copy Prompt Button
   ✅ Floating AI Button
   ✅ ChatGPT Launcher
   ✅ Modern UI
   Standalone — replace old file completely
   ============================================= */

const HELP_SECTIONS = [

    {
        icon: '📁',
        title: 'Folders & Quizzes',
        color: '#4a6fa5',
        steps: [
            'Tap <b>+ Folder</b> to create a subject folder',
            'Go inside folder → tap <b>+ Quiz</b>',
            'Single click folder to open',
            'Tap <b>📝</b> to add notes',
            'Tap <b>🔗</b> to share quizzes'
        ]
    },

    {
        icon: '✏️',
        title: 'Adding Questions',
        color: '#8e44ad',
        steps: [
            'Open quiz → tap <b>Add Question</b>',
            'Use <b>Smart Upload</b> for bulk import',
            'Supports JSON question format',
            'Edit questions using <b>✏️</b>',
            'Shuffle options anytime'
        ]
    },

    {
        icon: '▶',
        title: 'Taking a Quiz',
        color: '#27ae60',
        steps: [
            'Tap <b>▶ Start</b>',
            'Choose timer/shuffle settings',
            'Bookmark saves automatically',
            'Continue later anytime'
        ]
    },

    {
        icon: '🃏',
        title: 'Flashcards',
        color: '#e67e22',
        steps: [
            'Open Flashcards mode',
            'Tap card to reveal answer',
            'Search question on Google',
            'Edit flashcards instantly'
        ]
    },

    {
        icon: '🎵',
        title: 'Quiz Reels',
        color: '#e74c3c',
        steps: [
            'TikTok-style quiz reels',
            'Swipe up/down navigation',
            'Auto answer reveal',
            'Supports background music'
        ]
    },

    {
        icon: '📅',
        title: 'Revision Planner',
        color: '#4a6fa5',
        steps: [
            'Create categories',
            'Track weak subjects',
            'Auto review scheduling',
            'Daily revision recommendations'
        ]
    },

    {
        icon: '📓',
        title: 'Learning Journal',
        color: '#16a085',
        steps: [
            'Track daily study',
            'Add goals and habits',
            'Write daily logs',
            'View study statistics'
        ]
    },

    {
        icon: '🏆',
        title: 'Habits & Time Tracker',
        color: '#f39c12',
        steps: [
            'Track study habits',
            'Daily points system',
            'Monthly progress charts',
            'Automatic time tracking'
        ]
    },

    {
        icon: '🍅',
        title: 'Pomodoro Flow',
        color: '#c0392b',
        steps: [
            'Study phase',
            'Quiz phase',
            'Break phase',
            'Custom timers'
        ]
    },

    {
        icon: '☁️',
        title: 'Google Drive Backup',
        color: '#3498db',
        steps: [
            'Backup all quizzes',
            'Auto sync every 30 mins',
            'Restore anytime',
            'Single backup file'
        ]
    },

    {
        icon: '🔗',
        title: 'Sharing Quizzes',
        color: '#27ae60',
        steps: [
            'Generate share links',
            'Share via WhatsApp',
            'Import quizzes instantly',
            'Private data never shared'
        ]
    },

    {
        icon: '📱',
        title: 'Install as App',
        color: '#2980b9',
        steps: [
            'Install as PWA',
            'Works offline',
            'Home screen support',
            'Native app experience'
        ]
    },

    /* =============================================
       NEW AI GENERATOR SECTION
       ============================================= */

    {
        icon: '🤖',
        title: 'AI Question Generator',
        color: '#6c5ce7',
        steps: [
            'Paste notes/textbook/PDF text into AI',
            'Tap <b>Copy AI Prompt</b>',
            'Paste prompt into ChatGPT/Gemini/Claude',
            'AI generates quiz JSON automatically',
            'Import generated JSON using Smart Upload',
            'Perfect for SSC/UPSC/NEET/JEE preparation'
        ]
    }
];


/* =============================================
   SHOW HELP
   ============================================= */

function showHelp() {

    document.getElementById('helpOverlay')?.remove();

    const overlay = document.createElement('div');

    overlay.id = 'helpOverlay';

    overlay.style.cssText = `
        position:fixed;
        inset:0;
        z-index:5000;
        background:rgba(0,0,0,0.75);
        backdrop-filter:blur(6px);
        overflow-y:auto;
        padding:20px;
    `;

    overlay.innerHTML = `
        <div style="
            max-width:760px;
            margin:auto;
            font-family:inherit;
        ">

            <!-- Header -->
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:20px;
            ">

                <div>
                    <div style="
                        color:white;
                        font-size:1.8rem;
                        font-weight:800;
                    ">
                        📚 QuizMaster Pro
                    </div>

                    <div style="
                        color:rgba(255,255,255,0.6);
                        margin-top:4px;
                    ">
                        Complete User Guide
                    </div>
                </div>

                <button onclick="closeHelp()"
                    style="
                        width:40px;
                        height:40px;
                        border:none;
                        border-radius:50%;
                        cursor:pointer;
                        background:rgba(255,255,255,0.1);
                        color:white;
                        font-size:1.1rem;
                    ">
                    ✕
                </button>

            </div>

            <!-- AI BUTTON -->
            <button onclick="showAIPromptModal()"
                style="
                    width:100%;
                    margin-bottom:18px;
                    padding:16px;
                    border:none;
                    border-radius:14px;
                    background:#6c5ce7;
                    color:white;
                    font-weight:800;
                    font-size:1rem;
                    cursor:pointer;
                    box-shadow:0 8px 30px rgba(108,92,231,0.35);
                ">
                🤖 Open AI Question Generator
            </button>

            <!-- Sections -->
            ${HELP_SECTIONS.map((s,i)=>`

                <div style="
                    background:rgba(255,255,255,0.06);
                    border:1px solid rgba(255,255,255,0.08);
                    border-left:4px solid ${s.color};
                    border-radius:14px;
                    padding:18px;
                    margin-bottom:14px;
                ">

                    <div style="
                        display:flex;
                        align-items:center;
                        gap:10px;
                        margin-bottom:14px;
                    ">
                        <div style="font-size:1.4rem;">
                            ${s.icon}
                        </div>

                        <div style="
                            color:white;
                            font-size:1rem;
                            font-weight:700;
                        ">
                            ${s.title}
                        </div>
                    </div>

                    ${s.steps.map((step,si)=>`

                        <div style="
                            display:flex;
                            gap:10px;
                            margin-bottom:10px;
                            align-items:flex-start;
                        ">

                            <div style="
                                min-width:22px;
                                height:22px;
                                border-radius:50%;
                                background:${s.color};
                                color:white;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                font-size:0.7rem;
                                font-weight:700;
                                margin-top:2px;
                            ">
                                ${si+1}
                            </div>

                            <div style="
                                color:rgba(255,255,255,0.82);
                                line-height:1.5;
                                font-size:0.9rem;
                            ">
                                ${step}
                            </div>

                        </div>

                    `).join('')}

                </div>

            `).join('')}

            <div style="
                text-align:center;
                color:rgba(255,255,255,0.45);
                padding:16px;
                font-size:0.8rem;
            ">
                Built for serious aspirants 🚀
            </div>

        </div>
    `;

    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeHelp();
    });

    document.body.appendChild(overlay);
}


/* =============================================
   CLOSE HELP
   ============================================= */

function closeHelp() {

    const el = document.getElementById('helpOverlay');

    if (!el) return;

    el.style.opacity = '0';
    el.style.transition = '0.2s';

    setTimeout(() => el.remove(), 200);
}


/* =============================================
   AI PROMPT MODAL
   ============================================= */

function showAIPromptModal() {

    document.getElementById('aiPromptOverlay')?.remove();

    const promptText = `Generate high-quality multiple choice questions from the study material below.

IMPORTANT RULES:
- Return ONLY valid JSON
- Do NOT write markdown
- Output must be directly importable

JSON FORMAT:

[
  {
    "question": "Question text",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "correctIndex": 0,
    "explanation": "Short explanation"
  }
]

REQUIREMENTS:
- Generate minimum 20 MCQs
- SSC/UPSC exam level
- Mix easy/medium/hard
- Include conceptual questions
- Avoid duplicate questions
- Add concise explanations
- Make options realistic

STUDY MATERIAL:
[PASTE YOUR STUDY MATERIAL HERE]`;

    const overlay = document.createElement('div');

    overlay.id = 'aiPromptOverlay';

    overlay.style.cssText = `
        position:fixed;
        inset:0;
        z-index:99999;
        background:rgba(0,0,0,0.78);
        backdrop-filter:blur(6px);
        display:flex;
        justify-content:center;
        align-items:center;
        padding:18px;
    `;

    overlay.innerHTML = `
        <div style="
            width:100%;
            max-width:850px;
            background:#111827;
            border-radius:20px;
            border:1px solid rgba(255,255,255,0.08);
            padding:22px;
            max-height:92vh;
            overflow:auto;
        ">

            <!-- Header -->
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:16px;
            ">

                <div>
                    <div style="
                        color:white;
                        font-size:1.5rem;
                        font-weight:800;
                    ">
                        🤖 AI Question Generator
                    </div>

                    <div style="
                        color:rgba(255,255,255,0.6);
                        margin-top:4px;
                        font-size:0.9rem;
                    ">
                        Generate quizzes instantly using AI
                    </div>
                </div>

                <button onclick="closeAIPromptModal()"
                    style="
                        width:40px;
                        height:40px;
                        border:none;
                        border-radius:50%;
                        background:rgba(255,255,255,0.08);
                        color:white;
                        cursor:pointer;
                        font-size:1rem;
                    ">
                    ✕
                </button>

            </div>

            <!-- Textarea -->
            <textarea
                id="aiPromptTextarea"
                readonly
                style="
                    width:100%;
                    height:420px;
                    border:none;
                    outline:none;
                    resize:none;
                    border-radius:14px;
                    padding:18px;
                    background:#0b1220;
                    color:#d1d5db;
                    font-size:0.88rem;
                    line-height:1.6;
                    font-family:monospace;
                    border:1px solid rgba(255,255,255,0.08);
                "
            >${promptText}</textarea>

            <!-- Buttons -->
            <div style="
                display:flex;
                gap:12px;
                flex-wrap:wrap;
                margin-top:18px;
            ">

                <button
                    id="copyPromptBtn"
                    onclick="copyAIPrompt()"
                    style="
                        flex:1;
                        min-width:180px;
                        padding:14px;
                        border:none;
                        border-radius:12px;
                        background:#6c5ce7;
                        color:white;
                        font-weight:700;
                        cursor:pointer;
                    ">
                    📋 Copy Prompt
                </button>

                <button
                    onclick="window.open('https://chat.openai.com','_blank')"
                    style="
                        flex:1;
                        min-width:180px;
                        padding:14px;
                        border:none;
                        border-radius:12px;
                        background:#10b981;
                        color:white;
                        font-weight:700;
                        cursor:pointer;
                    ">
                    🚀 Open ChatGPT
                </button>

            </div>

            <!-- Tips -->
            <div style="
                margin-top:20px;
                padding:16px;
                border-radius:14px;
                background:rgba(255,255,255,0.04);
                border:1px solid rgba(255,255,255,0.06);
            ">

                <div style="
                    color:white;
                    font-weight:700;
                    margin-bottom:10px;
                ">
                    💡 Tips
                </div>

                <ul style="
                    margin:0;
                    padding-left:18px;
                    color:rgba(255,255,255,0.72);
                    line-height:1.7;
                    font-size:0.88rem;
                ">
                    <li>Paste clean textbook notes</li>
                    <li>Use 2–5 pages at once</li>
                    <li>Generate Hindi or bilingual MCQs</li>
                    <li>Import output using Smart Upload</li>
                </ul>

            </div>

        </div>
    `;

    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeAIPromptModal();
    });

    document.body.appendChild(overlay);
}


/* =============================================
   CLOSE AI MODAL
   ============================================= */

function closeAIPromptModal() {

    const el = document.getElementById('aiPromptOverlay');

    if (!el) return;

    el.style.opacity = '0';
    el.style.transition = '0.2s';

    setTimeout(() => el.remove(), 200);
}


/* =============================================
   COPY AI PROMPT
   ============================================= */

async function copyAIPrompt() {

    const textarea = document.getElementById('aiPromptTextarea');

    if (!textarea) return;

    try {

        await navigator.clipboard.writeText(textarea.value);

        const btn = document.getElementById('copyPromptBtn');

        const old = btn.innerHTML;

        btn.innerHTML = '✅ Prompt Copied';
        btn.style.background = '#10b981';

        setTimeout(() => {
            btn.innerHTML = old;
            btn.style.background = '#6c5ce7';
        }, 2000);

    } catch {

        textarea.select();
        document.execCommand('copy');

        alert('Prompt copied!');
    }
}


/* =============================================
   FLOATING AI BUTTON
   ============================================= */

function addAIFloatingButton() {

    if (document.getElementById('aiFloatingBtn')) return;

    const btn = document.createElement('button');

    btn.id = 'aiFloatingBtn';

    btn.innerHTML = '🤖 AI';

    btn.onclick = showAIPromptModal;

    btn.style.cssText = `
        position:fixed;
        right:18px;
        bottom:90px;
        z-index:4000;

        border:none;
        border-radius:999px;

        padding:14px 18px;

        background:#6c5ce7;
        color:white;

        font-weight:800;
        font-size:0.95rem;

        cursor:pointer;

        box-shadow:0 10px 30px rgba(108,92,231,0.4);

        transition:0.15s;
    `;

    btn.onmouseenter = () => {
        btn.style.transform = 'scale(1.06)';
    };

    btn.onmouseleave = () => {
        btn.style.transform = 'scale(1)';
    };

    document.body.appendChild(btn);
}


/* =============================================
   ESC KEY SUPPORT
   ============================================= */

document.addEventListener('keydown', e => {

    if (e.key === 'Escape') {

        closeHelp();
        closeAIPromptModal();
    }
});


/* =============================================
   AUTO INIT
   ============================================= */

window.addEventListener('load', () => {

    addAIFloatingButton();
});
