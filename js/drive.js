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
    // Load GAPI
    const s1 = document.createElement('script');
    s1.src = 'https://apis.google.com/js/api.js';
    s1.onload = () => {
        gapi.load('client', async () => {
            await gapi.client.init({});
            _gapiReady = true;
            _checkReady();
        });
    };
    document.head.appendChild(s1);

    // Load GIS (token client)
    const s2 = document.createElement('script');
    s2.src = 'https://accounts.google.com/gsi/client';
    s2.onload = () => {
        _tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GDRIVE_CLIENT_ID,
            scope:     GDRIVE_SCOPE,
            callback:  _onToken,
            // Use fragment redirect instead of popup to avoid COOP errors on GitHub Pages
            ux_mode:        'popup',
            error_callback: (err) => {
                console.warn('GIS error:', err);
                showToast('Sign-in error: ' + (err.type || 'unknown'), 'error');
                _updateDriveBtn('ready');
            }
        });
        _gisReady = true;
        _checkReady();
    };
    document.head.appendChild(s2);
}

function _checkReady() {
    if (_gapiReady && _gisReady) {
        _updateDriveBtn('ready');
    }
}

// ── Token callback ────────────────────────────
function _onToken(resp) {
    console.log('GIS token response:', resp);
    if (resp.error) {
        showToast('Google sign-in failed: ' + resp.error, 'error');
        _updateDriveBtn('ready');
        return;
    }
    _accessToken = resp.access_token;
    gapi.client.setToken({ access_token: _accessToken });
    _updateDriveBtn('signed-in');
    _doBackup();
}

// ── Sign in ───────────────────────────────────
function driveSignIn() {
    if (!_gapiReady || !_gisReady) { showToast('Google API loading…', 'info'); return; }
    _updateDriveBtn('loading');
    _tokenClient.requestAccessToken({ prompt: _accessToken ? '' : 'consent' });
}

// ── Main backup function ──────────────────────
async function backupToDrive() {
    if (!_accessToken) {
        driveSignIn();   // will auto-backup after sign-in via _onToken
        return;
    }
    await _doBackup();
}

async function _doBackup() {
    _updateDriveBtn('loading');
    try {
        // Build backup data (same as createFullBackup)
        const items = getAllItems();
        const journalKeys = ['todayTasks','goals','routine','routineDone','logs','history','timeSpent','habits','habitDone','revisionPlanner'];
        const journalData = {};
        for (const key of journalKeys) {
            const val = await jnlGet(key);
            if (val !== null) journalData[key] = val;
        }
        const backupData = JSON.stringify({
            version: '2.0', type: 'full_backup',
            date: new Date().toISOString(),
            structure: folderStructure, items, journalData,
            stats: {
                totalFolders:   items.filter(i=>i.type==='folder').length,
                totalQuizzes:   items.filter(i=>i.type==='quiz').length,
                totalQuestions: items.reduce((s,i)=>s+(i.questions?.length||0),0)
            }
        });

        // Check if we already have a file ID saved
        let fileId = localStorage.getItem(FILEID_KEY);

        if (fileId) {
            // Verify file still exists on Drive
            try {
                await gapi.client.request({ path: `https://www.googleapis.com/drive/v3/files/${fileId}`, method: 'GET' });
            } catch(e) {
                // File deleted from Drive — reset and create new
                fileId = null;
                localStorage.removeItem(FILEID_KEY);
            }
        }

        if (fileId) {
            // UPDATE existing file (PATCH)
            await _patchFile(fileId, backupData);
        } else {
            // CREATE new file
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
        if (err.status === 401) {
            _accessToken = null;
            driveSignIn();
        } else {
            showToast('Drive backup failed: ' + (err.result?.error?.message || err.message || 'Unknown error'), 'error');
            _updateDriveBtn('error');
        }
    }
}

// ── Create new file on Drive ──────────────────
async function _createFile(content) {
    const meta = JSON.stringify({ name: BACKUP_FILENAME, mimeType: 'application/json' });
    const body = _buildMultipart(meta, content);

    const resp = await gapi.client.request({
        path:    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        method:  'POST',
        headers: { 'Content-Type': 'multipart/related; boundary=BOUNDARY_XYZ', 'Authorization': 'Bearer ' + _accessToken },
        body
    });
    return resp.result.id;
}

// ── Update existing file on Drive ─────────────
async function _patchFile(fileId, content) {
    await gapi.client.request({
        path:    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _accessToken },
        body:    content
    });
}

// ── Restore from Drive ────────────────────────
async function restoreFromDrive() {
    if (!_accessToken) { driveSignIn(); return; }

    let fileId = localStorage.getItem(FILEID_KEY);
    if (!fileId) {
        // Search Drive for the backup file
        showToast('Searching Drive for backup…', 'info');
        try {
            const resp = await gapi.client.request({
                path:   `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}' and trashed=false&fields=files(id,name,modifiedTime)`,
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + _accessToken }
            });
            const files = resp.result.files;
            if (!files || files.length === 0) { showToast('No backup found on Drive', 'warning'); return; }
            fileId = files[0].id;
            localStorage.setItem(FILEID_KEY, fileId);
        } catch(e) { showToast('Could not search Drive', 'error'); return; }
    }

    if (!confirm('Restore from Google Drive? This will REPLACE all current data.')) return;

    try {
        const resp = await gapi.client.request({
            path:    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            method:  'GET',
            headers: { 'Authorization': 'Bearer ' + _accessToken }
        });
        const backup = typeof resp.result === 'string' ? JSON.parse(resp.result) : resp.result;
        if (!backup.items) { showToast('Invalid backup format', 'error'); return; }

        await clearAllData();
        for (const item of backup.items) await saveItem(item);
        if (backup.journalData) {
            for (const [key, val] of Object.entries(backup.journalData)) await jnlSet(key, val);
        }
        await loadFolderStructure(); navigateToRoot();
        showToast('✅ Restored from Google Drive!', 'success');
    } catch(e) { showToast('Restore failed: ' + (e.message||'error'), 'error'); }
}

// ── Multipart body builder ────────────────────
function _buildMultipart(meta, content) {
    return `--BOUNDARY_XYZ\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--BOUNDARY_XYZ\r\nContent-Type: application/json\r\n\r\n${content}\r\n--BOUNDARY_XYZ--`;
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
