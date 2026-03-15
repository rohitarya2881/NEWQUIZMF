/* =============================================
   notes.js — Learning Journal
   ============================================= */

let notes = JSON.parse(localStorage.getItem('qmpNotes') || '[]');

function showNotes() {
    showView('notesContainer');
    renderNotes();
}

function renderNotes() {
    const el = document.getElementById('notesList'); if (!el) return;
    if (!notes.length) { el.innerHTML = '<div class="empty-state">No notes yet. Write something!</div>'; return; }
    el.innerHTML = notes.map((n, i) => `
        <div class="note-card">
            <button class="note-delete" onclick="deleteNote(${i})">✕</button>
            <p>${escHtml(n.text)}</p>
            <div class="note-meta">📅 ${new Date(n.date).toLocaleString()}</div>
        </div>`).join('');
}

function saveNote() {
    const inp  = document.getElementById('noteInput'); if (!inp) return;
    const text = inp.value.trim();
    if (!text) { showToast('Write something first', 'warning'); return; }
    notes.unshift({ text, date: new Date().toISOString() });
    localStorage.setItem('qmpNotes', JSON.stringify(notes));
    inp.value = '';
    renderNotes();
    showToast('Note saved', 'success');
}

function deleteNote(i) {
    notes.splice(i, 1);
    localStorage.setItem('qmpNotes', JSON.stringify(notes));
    renderNotes();
}

function clearAllNotes() {
    if (!notes.length) return;
    if (confirm('Clear all notes?')) {
        notes = [];
        localStorage.setItem('qmpNotes', '[]');
        renderNotes();
        showToast('All notes cleared', 'info');
    }
}

// Save on Enter (Shift+Enter = new line)
document.addEventListener('keydown', e => {
    if (document.activeElement?.id === 'noteInput' && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); saveNote();
    }
});
