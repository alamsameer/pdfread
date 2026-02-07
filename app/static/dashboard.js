// State
let documents = [];
let documentToDelete = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
    loadDocuments();
    setupUploadModal();
    setupDeleteModal();
}

// Load Documents
async function loadDocuments() {
    showLoading();

    try {
        const response = await fetch('/api/documents');
        if (!response.ok) {
            throw new Error('Failed to load documents');
        }

        documents = await response.json();
        hideLoading();

        if (documents.length === 0) {
            showEmpty();
        } else {
            renderDocuments();
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        hideLoading();
        showError(error.message);
    }
}

// Render Documents
function renderDocuments() {
    const grid = document.getElementById('documentsGrid');
    grid.innerHTML = '';
    grid.style.display = 'grid';

    documents.forEach(doc => {
        const card = createDocumentCard(doc);
        grid.appendChild(card);
    });
}

function createDocumentCard(doc) {
    const card = document.createElement('div');
    card.className = 'doc-card';
    card.innerHTML = `
        <div class="doc-card-icon">📄</div>
        <h3 class="doc-card-title" title="${escapeHtml(doc.title)}">
            ${escapeHtml(doc.title)}
        </h3>
        <div class="doc-card-meta">
            <div class="doc-card-meta-item">
                <span class="doc-card-meta-icon">📄</span>
                <span>${doc.total_pages} page${doc.total_pages !== 1 ? 's' : ''}</span>
            </div>
            <div class="doc-card-meta-item">
                <span class="doc-card-meta-icon">📅</span>
                <span>${formatDate(doc.created_at)}</span>
            </div>
        </div>
        <div class="doc-card-actions">
            <button class="btn-primary" onclick="openDocument('${doc.id}')">
                📖 Open
            </button>
            <button class="btn-danger" onclick="confirmDelete('${doc.id}')">
                🗑️ Delete
            </button>
        </div>
    `;
    return card;
}

// Open Document
function openDocument(docId) {
    window.location.href = `/reader/${docId}`;
}

// Delete Document
function confirmDelete(docId) {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    documentToDelete = docId;
    document.getElementById('deleteDocTitle').textContent = doc.title;
    document.getElementById('deleteModal').classList.add('active');
}

async function executeDelete() {
    if (!documentToDelete) return;

    const doc = documents.find(d => d.id === documentToDelete);
    const docTitle = doc ? doc.title : 'Document';

    try {
        const response = await fetch(`/api/documents/${documentToDelete}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete document');
        }

        showToast('Success', `"${docTitle}" has been deleted`, 'success');
        closeDeleteModal();

        // Reload documents
        await loadDocuments();
    } catch (error) {
        console.error('Error deleting document:', error);
        showToast('Error', 'Failed to delete document. Please try again.', 'error');
    }
}

// Setup Upload Modal
function setupUploadModal() {
    const modal = document.getElementById('uploadModal');
    const uploadBtn = document.getElementById('uploadBtn');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // Open modal
    uploadBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    // Close modal on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeUploadModal();
        }
    });

    // Drop zone click
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleUpload(e.target.files[0]);
        }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            handleUpload(files[0]);
        } else {
            showToast('Error', 'Please upload a PDF file', 'error');
        }
    });
}

// Handle Upload
async function handleUpload(file) {
    const dropZone = document.getElementById('dropZone');
    const progress = document.getElementById('uploadProgress');

    // Show progress
    dropZone.style.display = 'none';
    progress.style.display = 'block';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Upload failed');
        }

        const data = await response.json();

        showToast('Success', `"${file.name}" uploaded successfully`, 'success');

        // Close modal and reload
        closeUploadModal();
        await loadDocuments();

        // Redirect to reader
        setTimeout(() => {
            window.location.href = `/reader/${data.document_id}`;
        }, 500);
    } catch (error) {
        console.error('Error uploading:', error);
        showToast('Error', error.message, 'error');

        // Reset modal
        dropZone.style.display = 'block';
        progress.style.display = 'none';
    }
}

// Close Upload Modal
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    const dropZone = document.getElementById('dropZone');
    const progress = document.getElementById('uploadProgress');
    const fileInput = document.getElementById('fileInput');

    modal.classList.remove('active');
    dropZone.style.display = 'block';
    progress.style.display = 'none';
    fileInput.value = '';
}

// Setup Delete Modal
function setupDeleteModal() {
    const modal = document.getElementById('deleteModal');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeDeleteModal();
        }
    });

    // Confirm delete
    confirmBtn.addEventListener('click', executeDelete);
}

// Close Delete Modal
function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.classList.remove('active');
    documentToDelete = null;
}

// UI Helpers
function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('documentsGrid').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
}

function showEmpty() {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('documentsGrid').style.display = 'none';
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('documentsGrid').style.display = 'none';
}

// Toast Notifications
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, 5000);
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}
