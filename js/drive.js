/* =============================================
   drive.js — Google Drive Auto-Backup
   Single file: quizmaster_backup.json
   Updates in place, never creates duplicates
   ============================================= */

const GDRIVE_CLIENT_ID  = '564645485634-rg7sod7v98j4k279e7kro5s3ssa55mj7.apps.googleusercontent.com';
const GDRIVE_SCOPE      = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILENAME   = 'quizmaster_backup.json';
const FILEID_KEY        = 'gd_backup_file_id';  // localStorage key for file ID

let _gapiReady    = false;
let _gisReady     = false;
let _tokenClient  = null;
let _accessToken  = null;

// ── Load Google scripts ───────────────────────
function initDriveBackup() {
    // Only need GIS for OAuth token — all Drive API calls use raw fetch
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => {
        _tokenClient = google.accounts.oauth2.initTokenClient({
            client_id:      GDRIVE_CLIENT_ID,
            scope:          GDRIVE_SCOPE,
            callback:       _onToken,
            error_callback: (err) => {
                console.warn('GIS error:', err);
                showToast('Sign-in error: ' + (err.type || 'unknown'), 'error');
                _updateDriveBtn('ready');
            }
        });
        _gapiReady = true;
        _gisReady  = true;
        _checkReady();
    };
    s.onerror = () => {
        console.warn('GIS script failed to load');
        _updateDriveBtn('ready');
    };
    document.head.appendChild(s);
}

function _checkReady() {
    if (_gapiReady && _gisReady) {
        _updateDriveBtn('ready');
    }
}

let _pendingAction = 'backup'; // 'backup' | 'restore'

// ── Token callback ────────────────────────────
function _onToken(resp) {
    console.log('GIS token response:', resp);
    if (resp.error) {
        showToast('Google sign-in failed: ' + resp.error, 'error');
        _updateDriveBtn('ready');
        return;
    }
    _accessToken = resp.access_token;
    _updateDriveBtn('signed-in');
    if (_pendingAction === 'restore') {
        _pendingAction = 'backup';
        restoreFromDrive();
    } else {
        _doBackup();
    }
}

// ── Sign in ───────────────────────────────────
function driveSignIn() {
    if (!_tokenClient) { showToast('Google API still loading, try again in a moment', 'info'); return; }
    _updateDriveBtn('loading');
    _tokenClient.requestAccessToken({ prompt: _accessToken ? '' : 'consent' });
}

// ── Main backup function ──────────────────────
async function backupToDrive() {
    _pendingAction = 'backup';
    if (!_accessToken) { driveSignIn(); return; }
    await _doBackup();
}

async function _doBackup() {
    _updateDriveBtn('loading');
    try {
        const items = getAllItems();
        const journalKeys = ['todayTasks','goals','routine','routineDone','logs','history','timeSpent','habits','habitDone','revisionPlanner'];
        const journalData = {};
        for (const key of journalKeys) {
            const val = await jnlGet(key);
            if (val !== null) journalData[key] = val;
        }
        const backupData = JSON.stringify({
            version:'2.0', type:'full_backup', date:new Date().toISOString(),
            structure:folderStructure, items, journalData,
            stats:{ totalFolders:items.filter(i=>i.type==='folder').length, totalQuizzes:items.filter(i=>i.type==='quiz').length, totalQuestions:items.reduce((s,i)=>s+(i.questions?.length||0),0) }
        });

        let fileId = localStorage.getItem(FILEID_KEY);

        // Verify file still exists
        if (fileId) {
            const check = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id`, {
                headers: { 'Authorization': 'Bearer ' + _accessToken }
            });
            if (!check.ok) { fileId = null; localStorage.removeItem(FILEID_KEY); }
        }

        if (fileId) {
            await _patchFile(fileId, backupData);
        } else {
            fileId = await _createFile(backupData);
            localStorage.setItem(FILEID_KEY, fileId);
        }

        const now = new Date().toLocaleTimeString();
        localStorage.setItem('gd_last_backup', now);
        _updateDriveBtn('signed-in');
        showToast(`✅ Backed up to Google Drive (${now})`, 'success');
        _updateDriveStatus();

    } catch(err) {
        console.error('Drive backup error:', err);
        if (err.status === 401 || err.message?.includes('401')) {
            _accessToken = null; driveSignIn();
        } else {
            showToast('Drive backup failed: ' + (err.message || 'Unknown error'), 'error');
            _updateDriveBtn('error');
        }
    }
}

// ── Create new file ───────────────────────────
async function _createFile(content) {
    const boundary = 'QMPRO_BOUNDARY';
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: BACKUP_FILENAME, mimeType: 'application/json' })}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
    const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + _accessToken, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body
    });
    if (!resp.ok) throw new Error('Create failed: ' + resp.status);
    const data = await resp.json();
    return data.id;
}

// ── Update existing file ──────────────────────
async function _patchFile(fileId, content) {
    const resp = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + _accessToken, 'Content-Type': 'application/json' },
        body: content
    });
    if (!resp.ok) throw new Error('Patch failed: ' + resp.status);
}

// ── Restore from Drive ────────────────────────
async function restoreFromDrive() {
    _pendingAction = 'restore';
    if (!_accessToken) { driveSignIn(); return; }

    let fileId = localStorage.getItem(FILEID_KEY);
    if (!fileId) {
        showToast('Searching Drive for backup…', 'info');
        const resp = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}' and trashed=false&fields=files(id,name,modifiedTime)`, {
            headers: { 'Authorization': 'Bearer ' + _accessToken }
        });
        const data = await resp.json();
        if (!data.files?.length) { showToast('No backup found on Drive', 'warning'); return; }
        fileId = data.files[0].id;
        localStorage.setItem(FILEID_KEY, fileId);
    }

    if (!confirm('Restore from Google Drive? This will REPLACE all current data.')) return;

    try {
        const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': 'Bearer ' + _accessToken }
        });
        if (!resp.ok) throw new Error('Download failed: ' + resp.status);
        const backup = await resp.json();
        if (!backup.items) { showToast('Invalid backup format', 'error'); return; }
        await clearAllData();
        for (const item of backup.items) await saveItem(item);
        if (backup.journalData) {
            for (const [key, val] of Object.entries(backup.journalData)) await jnlSet(key, val);
        }
        await loadFolderStructure(); navigateToRoot();
        showToast('✅ Restored from Google Drive!', 'success');
    } catch(e) { showToast('Restore failed: ' + e.message, 'error'); }
}

// ── UI helpers ────────────────────────────────
function _updateDriveBtn(state) {
    const btn  = document.getElementById('driveBakBtn');
    const dot  = document.getElementById('driveStatusDot');
    const txt  = document.getElementById('driveStatusText');

    const states = {
        'loading':   { text:'⏳ Syncing…',        disabled:true,  dotColor:'#f39c12', statusText:'Drive: Syncing…'       },
        'ready':     { text:'☁️ Backup to Drive', disabled:false, dotColor:'#aaa',    statusText:'Drive: Not signed in'   },
        'signed-in': { text:'☁️ Sync to Drive',   disabled:false, dotColor:'#27ae60', statusText:'Drive: Connected ✓'    },
        'error':     { text:'☁️ Retry Drive',      disabled:false, dotColor:'#e74c3c', statusText:'Drive: Error — retry'  },
    };
    const s = states[state] || states['ready'];

    if (btn) { btn.textContent = s.text; btn.disabled = s.disabled; }
    if (dot) dot.style.background = s.dotColor;
    if (txt) txt.textContent = s.statusText;
    if (txt) txt.style.color = s.dotColor;
}

function _updateDriveStatus() {
    const el = document.getElementById('driveLastBackup');
    const t  = localStorage.getItem('gd_last_backup');
    if (el) el.textContent = t ? `Last synced: ${t}` : 'Never synced';
    // Show connected state if we have a saved file ID
    const fileId = localStorage.getItem('gd_backup_file_id');
    if (fileId && !_accessToken) {
        const dot = document.getElementById('driveStatusDot');
        const txt = document.getElementById('driveStatusText');
        if (dot) dot.style.background = '#f39c12';
        if (txt) { txt.textContent = 'Drive: Sign in to sync'; txt.style.color = '#f39c12'; }
    }
}

// ── Auto-backup every 30 min if signed in ─────
setInterval(() => {
    if (_accessToken) _doBackup();
}, 30 * 60 * 1000);
