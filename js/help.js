/* =============================================
   AI QUESTION GENERATOR — COMPLETE MODULE
   Add this anywhere after your HELP_SECTIONS
   Fully standalone
   ============================================= */

// Add this section inside HELP_SECTIONS array
HELP_SECTIONS.push({
    icon: '🤖',
    title: 'AI Question Generator',
    color: '#6c5ce7',
    steps: [
        'Paste your notes, PDF text, or study material into ChatGPT/Gemini/Claude',
        'Tap <b>Copy AI Prompt</b> to copy a ready-made MCQ generation prompt',
        'Paste the copied prompt into AI',
        'AI generates perfectly formatted JSON questions automatically',
        'Copy the generated JSON and import it using <b>Smart Upload</b>',
        'Supports SSC, UPSC, Banking, Railway, NEET, JEE and more',
    ]
});


/* =============================================
   SHOW AI PROMPT MODAL
   ============================================= */

function showAIPromptModal() {

    document.getElementById('aiPromptOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'aiPromptOverlay';

    overlay.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.75);
        backdrop-filter:blur(6px);
        z-index:99999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:16px;
    `;

    const promptText = `Generate high-quality multiple choice questions from the study material below.

IMPORTANT RULES:
- Return ONLY valid JSON
- Do NOT write markdown
- Do NOT add explanations outside JSON
- Output must be directly importable

Required JSON format:

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

QUESTION REQUIREMENTS:
- Generate at least 20 MCQs
- SSC/UPSC competitive exam level
- Include factual + conceptual questions
- Avoid duplicates
- Add concise explanations
- Mix easy, medium, hard questions
- Make distractor options realistic
- Use clean language

OPTIONAL:
- Use Hindi if source material is Hindi
- Include current affairs style if relevant

STUDY MATERIAL:
[PASTE YOUR NOTES / PDF TEXT HERE]`;

    overlay.innerHTML = `
        <div style="
            width:100%;
            max-width:820px;
            max-height:92vh;
            overflow:auto;
            background:#111827;
            border:1px solid rgba(255,255,255,0.08);
            border-radius:20px;
            padding:24px;
            box-shadow:0 20px 60px rgba(0,0,0,0.4);
            font-family:inherit;
        ">

            <!-- Header -->
            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                margin-bottom:18px;
            ">

                <div>
                    <div style="
                        color:white;
                        font-size:1.4rem;
                        font-weight:800;
                    ">
                        🤖 AI Question Generator
                    </div>

                    <div style="
                        color:rgba(255,255,255,0.6);
                        font-size:0.9rem;
                        margin-top:4px;
                    ">
                        Copy this prompt and paste into ChatGPT / Gemini / Claude
                    </div>
                </div>

                <button onclick="closeAIPromptModal()"
                    style="
                        width:40px;
                        height:40px;
                        border-radius:50%;
                        border:none;
                        cursor:pointer;
                        background:rgba(255,255,255,0.08);
                        color:white;
                        font-size:1.1rem;
                    ">
                    ✕
                </button>

            </div>

            <!-- Prompt Box -->
            <textarea readonly
                id="aiPromptTextarea"
                style="
                    width:100%;
                    height:420px;
                    resize:none;
                    border:none;
                    outline:none;
                    border-radius:14px;
                    padding:18px;
                    background:#0b1220;
                    color:#d1d5db;
                    font-size:0.9rem;
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

                <button onclick="copyAIPrompt()"
                    id="copyPromptBtn"
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
                        font-size:0.95rem;
                    ">
                    📋 Copy Prompt
                </button>

                <button onclick="openChatGPT()"
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
                        font-size:0.95rem;
                    ">
                    🚀 Open ChatGPT
                </button>

            </div>

            <!-- Tips -->
            <div style="
                margin-top:22px;
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
                    💡 Best Results Tips
                </div>

                <ul style="
                    margin:0;
                    padding-left:18px;
                    color:rgba(255,255,255,0.75);
                    line-height:1.7;
                    font-size:0.88rem;
                ">
                    <li>Paste clean notes or textbook text</li>
                    <li>Use 2–10 pages at a time for better quality</li>
                    <li>Ask AI for Hindi or bilingual MCQs if needed</li>
                    <li>Import generated JSON using Smart Upload</li>
                    <li>You can regenerate for harder questions</li>
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
   CLOSE MODAL
   ============================================= */

function closeAIPromptModal() {
    const el = document.getElementById('aiPromptOverlay');

    if (!el) return;

    el.style.opacity = '0';
    el.style.transition = '0.2s';

    setTimeout(() => el.remove(), 200);
}


/* =============================================
   COPY PROMPT
   ============================================= */

async function copyAIPrompt() {

    const textarea = document.getElementById('aiPromptTextarea');

    if (!textarea) return;

    try {

        await navigator.clipboard.writeText(textarea.value);

        const btn = document.getElementById('copyPromptBtn');

        if (btn) {

            const old = btn.innerHTML;

            btn.innerHTML = '✅ Copied Successfully';

            btn.style.background = '#10b981';

            setTimeout(() => {
                btn.innerHTML = old;
                btn.style.background = '#6c5ce7';
            }, 2200);
        }

    } catch (err) {

        textarea.select();
        document.execCommand('copy');

        alert('Prompt copied!');
    }
}


/* =============================================
   OPEN CHATGPT
   ============================================= */

function openChatGPT() {
    window.open('https://chat.openai.com', '_blank');
}


/* =============================================
   OPTIONAL FLOATING BUTTON
   Add this once after app loads
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
        bottom:88px;
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

        transition:transform 0.15s ease;
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
   AUTO INIT
   ============================================= */

window.addEventListener('load', () => {
    addAIFloatingButton();
});


/* =============================================
   OPTIONAL:
   Add inside sidebar/menu somewhere

   onclick="showAIPromptModal()"

   ============================================= */
