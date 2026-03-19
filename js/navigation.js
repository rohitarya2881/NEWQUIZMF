/* =============================================
   navigation.js — Routing & Breadcrumb
   ============================================= */

function navigateToRoot() {
    currentPath   = '/';
    currentFolder = folderStructure;
    currentQuiz   = null;
    updateBreadcrumb();
    renderCurrentView();
    showQuickUploadArea();
}

function navigateToId(id) {
    const item = findItemById(id);
    if (!item) { showToast('Folder not found', 'warning'); return; }
    currentPath   = item.path || '/';
    currentFolder = item;
    currentQuiz   = null;
    updateBreadcrumb();
    renderCurrentView();
    showQuickUploadArea();
}

function navigateTo(path) {
    currentPath   = path;
    currentFolder = findItemByPath(path);
    currentQuiz   = null;
    updateBreadcrumb();
    renderCurrentView();
    showQuickUploadArea();
}

function navigateToParent() {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(p => p);
    parts.pop();
    navigateTo('/' + parts.join('/') || '/');
}

function updateBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    const parts = currentPath.split('/').filter(p => p);
    let html = `<span class="breadcrumb-item" onclick="navigateToRoot()">Root</span>`;
    let cum  = '';
    parts.forEach(p => {
        cum += '/' + p;
        html += ` <span class="breadcrumb-separator">/</span>
                  <span class="breadcrumb-item" onclick="navigateTo('${cum}')">${escHtml(p)}</span>`;
    });
    bc.innerHTML = html;
}
