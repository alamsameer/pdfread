// State
const docId = window.location.pathname.split('/').pop();
let selectionStart = null;
let selectionEnd = null;
let pendingSelectionBlockId = null;
let currentAnnotationId = null; // Track editing state
let currentAnnotationData = null; // Store current annotation data

// Pagination state
let total_pages = 0;
let loaded_pages = 0;
let isLoading = false;

// Annotations state
let allAnnotations = [];

document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const res = await fetch(`/api/documents/${docId}`);
        if (!res.ok) throw new Error("Failed to load document");

        const doc = await res.json();
        document.getElementById('docTitle').innerText = doc.title;
        document.getElementById('pageCount').innerText = `${doc.total_pages} Pages`;

        // Initialize pagination state
        total_pages = doc.total_pages;
        loaded_pages = 0;

        const container = document.getElementById('pages');
        container.innerHTML = '';

        // Load initial pages (first 10 or all if less)
        const initialPages = Math.min(total_pages, 10);
        for (let i = 1; i <= initialPages; i++) {
            await loadPage(i);
            loaded_pages++;
        }

        // Add "Load More" button if there are more pages
        if (loaded_pages < total_pages) {
            addLoadMoreButton();
        }

        await loadHighlights();

        // Setup sidebar toggle
        setupSidebar();

    } catch (e) {
        showToast('Error', e.message, 'error');
    }
}

// Setup sidebar
function setupSidebar() {
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    closeBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });
}

        // Setup menu listeners for font size
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fontSize = e.target.dataset.size;

                if (currentAnnotationId) {
                    // Update existing annotation
                    updateAnnotation(currentAnnotationId, { font_size: fontSize });
                } else if (selectionStart && selectionEnd) {
                    // Apply to new selection
                    applyHighlightWithParams({ fontSize: fontSize });
                }
            });
        });

        // Setup menu listeners for font style
        document.querySelectorAll('.font-style-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fontStyle = e.target.dataset.style;

                if (currentAnnotationId) {
                    // Update existing annotation
                    updateAnnotation(currentAnnotationId, { font_style: fontStyle });
                } else if (selectionStart && selectionEnd) {
                    // Apply to new selection
                    applyHighlightWithParams({ fontStyle: fontStyle });
                }
            });
        });

        // Note Actions
        document.getElementById('btn-save').addEventListener('click', (e) => {
            e.stopPropagation();
            const note = document.getElementById('annotation-note').value;

            if (currentAnnotationId) {
                // Update existing annotation's note
                updateAnnotation(currentAnnotationId, { note: note });
            } else if (selectionStart && selectionEnd) {
                // Create new annotation with note
                applyHighlightWithParams({ note: note, color: '#ffeb3b' });
            }
        });

        document.getElementById('btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentAnnotationId) {
                deleteAnnotation(currentAnnotationId);
            }
        });

    } catch (e) {
        showToast('Error', e.message, 'error');
    }
}

async function loadPage(pageNum) {
    try {
        const res = await fetch(`/api/documents/${docId}/pages/${pageNum - 1}/blocks`);
        if (!res.ok) return;

        const blocks = await res.json();
        renderPage(pageNum, blocks);
    } catch (e) {
        console.error(`Failed to load page ${pageNum}`, e);
    }
}

// Add "Load More" button
function addLoadMoreButton() {
    const container = document.getElementById('pages');

    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'loadMoreBtn';
    loadMoreBtn.className = 'load-more-btn';
    loadMoreBtn.innerHTML = '<span class="btn-text">Load More Pages</span><span class="btn-info"></span>';
    loadMoreBtn.onclick = loadMorePages;

    container.appendChild(loadMoreBtn);
    updateLoadMoreButton();
}

// Update "Load More" button text
function updateLoadMoreButton() {
    const btn = document.getElementById('loadMoreBtn');
    if (!btn) {
        // If button doesn't exist and there are more pages, add it
        if (loaded_pages < total_pages) {
            addLoadMoreButton();
        }
        return;
    }

    const info = btn.querySelector('.btn-info');
    const remaining = total_pages - loaded_pages;

    if (remaining <= 0) {
        btn.remove();
    } else {
        info.textContent = `(${loaded_pages} of ${total_pages} loaded)`;
    }
}

// Load more pages
async function loadMorePages() {
    if (isLoading || loaded_pages >= total_pages) return;

    isLoading = true;
    const btn = document.getElementById('loadMoreBtn');
    const btnText = btn.querySelector('.btn-text');
    const originalText = btnText.textContent;

    try {
        btnText.textContent = 'Loading...';
        btn.disabled = true;

        // Load next 10 pages
        const pagesToLoad = Math.min(10, total_pages - loaded_pages);
        const startPage = loaded_pages + 1;

        for (let i = 0; i < pagesToLoad; i++) {
            await loadPage(startPage + i);
            loaded_pages++;
        }

        updateLoadMoreButton();

        // Reload highlights to include new pages
        await loadHighlights();
    } catch (e) {
        console.error('Failed to load more pages', e);
        showToast('Error', 'Failed to load pages. Please try again.', 'error');
        btnText.textContent = originalText;
        btn.disabled = false;
    } finally {
        isLoading = false;
    }
}

// Show toast notification
function showToast(title, message, type = 'info') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

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
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
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

function renderPage(pageNum, blocks) {
    const container = document.getElementById('pages');

    const pageDiv = document.createElement('div');
    pageDiv.className = 'page';
    pageDiv.dataset.page = pageNum;

    if (blocks.length === 0) {
        pageDiv.innerText = `Page ${pageNum} (No text content)`;
        container.appendChild(pageDiv);
        return;
    }

    blocks.sort((a, b) => a.block_order - b.block_order).forEach(block => {
        const blockDiv = document.createElement('div');
        blockDiv.className = `block`;

        // Handle images
        if (block.block_type === 'image' && block.image_path) {
            const img = document.createElement('img');
            img.src = block.image_path;
            img.style.maxWidth = '100%';
            img.style.display = 'block';
            img.style.margin = '10px auto';
            blockDiv.appendChild(img);
            pageDiv.appendChild(blockDiv);
            return;
        }

        let words = [];
        try {
            words = JSON.parse(block.words_meta || '[]');
        } catch (e) {
            console.error('Error parsing words_meta', e);
        }

        if (words.length > 0) {
            blockDiv.style.textAlign = 'left';

            words.forEach((w, index) => {
                if (w.isNewline && index > 0) {
                    const br = document.createElement('br');
                    blockDiv.appendChild(br);
                }

                const span = document.createElement('span');
                span.className = 'token';
                const tid = `${block.id}_${index}`;
                span.id = `t-${tid}`;
                span.dataset.bid = block.id;
                span.dataset.idx = index;
                span.dataset.tid = tid;

                // Apply original word styles
                if (w.fontSize) span.style.fontSize = `${w.fontSize}pt`;
                if (w.fontFamily) span.style.fontFamily = w.fontFamily + ", sans-serif";
                if (w.isBold) span.style.fontWeight = 'bold';
                if (w.isItalic) span.style.fontStyle = 'italic';
                if (w.color) span.style.color = w.color;

                if (w.isNewline) {
                    span.style.marginLeft = `${w.x}pt`;
                    span.style.display = 'inline-block';
                }

                span.innerText = w.text + " ";
                span.onclick = (e) => handleTokenClick(e, tid, block.id);
                blockDiv.appendChild(span);
            });
        } else {
            blockDiv.innerText = block.text || "";
        }
        pageDiv.appendChild(blockDiv);
    });
    container.appendChild(pageDiv);
}

function handleTokenClick(e, tokenId, blockId) {
    e.stopPropagation();

    const el = document.getElementById(`t-${tokenId}`);

    // Check if this token already has an annotation
    if (el && el.dataset.annId) {
        // EDIT MODE: User clicked on already highlighted text
        clearSelection();

        currentAnnotationId = el.dataset.annId;

        // Store current annotation data
        currentAnnotationData = {
            color: el.dataset.annColor || '#ffeb3b',
            note: el.dataset.note || '',
            fontSize: el.dataset.annFontSize || '',
            fontStyle: el.dataset.annFontStyle || ''
        };

        // Populate the note textarea
        document.getElementById('annotation-note').value = currentAnnotationData.note;

        // Show menu at click position
        showMenu(e.clientX, e.clientY);

        return;
    }

    // NEW SELECTION MODE
    currentAnnotationId = null;
    currentAnnotationData = null;
    document.getElementById('annotation-note').value = "";

    // First click or different block (reset)
    if (!selectionStart || (pendingSelectionBlockId && pendingSelectionBlockId !== blockId)) {
        clearSelection();
        selectionStart = tokenId;
        pendingSelectionBlockId = blockId;

        const el = document.getElementById(`t-${tokenId}`);
        if (el) el.classList.add('selected');

        return;
    }

    // Second click (must be same block)
    if (selectionStart && !selectionEnd) {
        if (blockId !== pendingSelectionBlockId) {
            showToast('Selection Error', 'Please select text within the same paragraph/block.', 'error');
            clearSelection();
            return;
        }

        selectionEnd = tokenId;

        // Calculate range
        const startEl = document.getElementById(`t-${selectionStart}`);
        const endEl = document.getElementById(`t-${selectionEnd}`);
        const startIdx = parseInt(startEl.dataset.idx);
        const endIdx = parseInt(endEl.dataset.idx);

        if (endIdx < startIdx) {
            let temp = selectionStart;
            selectionStart = selectionEnd;
            selectionEnd = temp;
        }

        previewSelection(selectionStart, selectionEnd);
        showMenu(e.clientX, e.clientY);
    } else {
        // Reset if already selected
        clearSelection();
        selectionStart = tokenId;
        pendingSelectionBlockId = blockId;
        document.getElementById(`t-${tokenId}`)?.classList.add('selected');
    }
}

function clearSelection() {
    document.querySelectorAll('.token.selected').forEach(el => el.classList.remove('selected'));
    document.getElementById('highlight-menu').classList.add('hidden');
    selectionStart = null;
    selectionEnd = null;
    pendingSelectionBlockId = null;
    currentAnnotationId = null;
    currentAnnotationData = null;
}

function previewSelection(start, end) {
    const range = getRange(start, end);
    range.forEach(tid => {
        document.getElementById(`t-${tid}`)?.classList.add('selected');
    });
}

function getRange(start, end) {
    const startEl = document.getElementById(`t-${start}`);
    const endEl = document.getElementById(`t-${end}`);
    if (!startEl || !endEl) return [];

    const allTokens = Array.from(document.querySelectorAll('.token'));
    const idx1 = allTokens.indexOf(startEl);
    const idx2 = allTokens.indexOf(endEl);

    const blockId = startEl.dataset.bid;

    return allTokens.slice(Math.min(idx1, idx2), Math.max(idx1, idx2) + 1)
        .filter(el => el.dataset.bid === blockId)
        .map(el => el.dataset.tid);
}

function showMenu(x, y) {
    const menu = document.getElementById('highlight-menu');
    const scrollY = window.scrollY;

    // Position menu to avoid going off screen
    let top = y + scrollY + 20;
    let left = x;

    // Check if menu would go off bottom
    if (y + 350 > window.innerHeight) {
        top = y + scrollY - 350;
    }

    // Check if menu would go off right edge
    if (x + 320 > window.innerWidth) {
        left = window.innerWidth - 340;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.classList.remove('hidden');
}

function animateHighlightSequence(tokens, color, type) {
    tokens.forEach((tid, index) => {
        const el = document.getElementById(`t-${tid}`);
        if (!el) return;

        el.style.transition = 'background-size 0.3s ease-out';

        if (type === 'underline') {
            el.style.backgroundImage = `linear-gradient(to right, ${color}, ${color})`;
            el.style.backgroundSize = '0% 2px';
            el.style.backgroundPosition = '0 100%';
            el.style.backgroundRepeat = 'no-repeat';
        } else {
            el.style.backgroundImage = `linear-gradient(to right, ${color}, ${color})`;
            el.style.backgroundSize = '0% 100%';
            el.style.backgroundPosition = '0 100%';
            el.style.backgroundRepeat = 'no-repeat';
            el.style.backgroundColor = 'transparent';
        }

        setTimeout(() => {
            if (type === 'underline') {
                el.style.backgroundSize = '100% 2px';
            } else {
                el.style.backgroundSize = '100% 100%';
            }
        }, index * 30);
    });
}

// Called by color buttons
function createHighlight(color) {
    if (currentAnnotationId) {
        // Update existing highlight color
        const note = document.getElementById('annotation-note').value;
        updateAnnotation(currentAnnotationId, { color: color, note: note || null });
    } else if (selectionStart && selectionEnd) {
        // Create new highlight
        const note = document.getElementById('annotation-note').value;
        applyHighlightWithParams({ color: color, note: note || null });
    } else {
        showToast('Selection Required', 'Please select text first', 'error');
    }
}

async function applyHighlightWithParams(params = {}) {
    if (!selectionStart || !selectionEnd) {
        showToast('Selection Required', 'Please select text first', 'error');
        return;
    }

    const startEl = document.getElementById(`t-${selectionStart}`);
    const endEl = document.getElementById(`t-${selectionEnd}`);

    if (!startEl || !endEl) return;

    const blockId = startEl.dataset.bid;
    const startIdx = parseInt(startEl.dataset.idx);
    const endIdx = parseInt(endEl.dataset.idx);

    // Determine animation type
    const color = params.color || "#ffeb3b";
    let type = 'highlight';
    if (params.fontStyle === 'underline') type = 'underline';

    // Trigger Animation
    const range = getRange(selectionStart, selectionEnd);
    animateHighlightSequence(range, color, type);

    // Persist to Backend
    const payload = {
        doc_id: docId,
        block_id: blockId,
        start_word_index: Math.min(startIdx, endIdx),
        end_word_index: Math.max(startIdx, endIdx) + 1,
        color: color,
        font_size: params.fontSize || null,
        font_style: params.fontStyle || null,
        note: params.note || null,
        user_id: "anonymous"
    };

    try {
        const res = await fetch('/api/annotations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error("Failed to save annotation");
        }

        // Clear selection and hide menu
        clearSelection();

        // Reload highlights to show the saved annotation
        await loadHighlights();

    } catch (e) {
        console.error("Failed to save highlight", e);
        showToast('Save Failed', 'Failed to save annotation. Please try again.', 'error');
    }
}

async function loadHighlights() {
    try {
        const res = await fetch(`/api/documents/${docId}/annotations`);
        if (!res.ok) return;
        const highlights = await res.json();

        // Store all annotations
        allAnnotations = highlights;

        // Update annotation count
        document.getElementById('annotationCount').textContent = highlights.length;

        // Clear existing annotation styles
        document.querySelectorAll('.token').forEach(el => {
            if (!el.classList.contains('selected')) {
                // Clear annotation-specific styles
                el.style.backgroundImage = '';
                el.style.backgroundSize = '';
                el.style.backgroundPosition = '';
                el.style.backgroundRepeat = '';
                el.style.backgroundColor = '';
                el.style.borderBottom = '';
                el.title = '';

                // Remove annotation data attributes
                delete el.dataset.annId;
                delete el.dataset.note;
                delete el.dataset.annColor;
                delete el.dataset.annFontSize;
                delete el.dataset.annFontStyle;
            }
        });

        // Apply all highlights
        highlights.forEach(h => {
            const start = h.start_word_index;
            const end = h.end_word_index;

            for (let i = start; i < end; i++) {
                const tid = `${h.block_id}_${i}`;
                const el = document.getElementById(`t-${tid}`);
                if (el) {
                    // Apply font size if specified (override original)
                    if (h.font_size) {
                        el.style.fontSize = h.font_size;
                    }

                    // Apply font styles
                    if (h.font_style === 'bold') {
                        el.style.fontWeight = 'bold';
                    } else if (h.font_style === 'italic') {
                        el.style.fontStyle = 'italic';
                    } else if (h.font_style === 'underline') {
                        // Underline style
                        el.style.backgroundImage = `linear-gradient(to right, ${h.color || '#000'}, ${h.color || '#000'})`;
                        el.style.backgroundSize = '100% 2px';
                        el.style.backgroundPosition = '0 100%';
                        el.style.backgroundRepeat = 'no-repeat';
                    }

                    // Apply highlight color (if not underline)
                    if (h.color && h.font_style !== 'underline') {
                        el.style.backgroundImage = `linear-gradient(to right, ${h.color}, ${h.color})`;
                        el.style.backgroundSize = '100% 100%';
                        el.style.backgroundPosition = '0 100%';
                        el.style.backgroundRepeat = 'no-repeat';
                        el.style.backgroundColor = 'transparent';
                    }

                    // Store annotation metadata for editing
                    el.dataset.annId = h.id;
                    el.dataset.note = h.note || "";
                    el.dataset.annColor = h.color || "";
                    el.dataset.annFontSize = h.font_size || "";
                    el.dataset.annFontStyle = h.font_style || "";

                    // Add tooltip and indicator for notes
                    if (h.note) {
                        el.title = h.note;
                        el.style.borderBottom = "2px dotted #666";
                        el.style.cursor = "help";
                    }
                }
            }
        });

        // Populate sidebar
        populateSidebar();
    } catch (e) {
        console.error("Failed to load highlights", e);
    }
}

// Populate annotation sidebar
function populateSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');

    if (allAnnotations.length === 0) {
        sidebarContent.innerHTML = `
            <div class="annotation-empty">
                <div class="annotation-empty-icon">📝</div>
                <div class="annotation-empty-text">No annotations yet</div>
                <div class="annotation-empty-subtext">Select text to create highlights</div>
            </div>
        `;
        return;
    }

    sidebarContent.innerHTML = '';

    // Group annotations by page
    const annotationsByPage = {};
    allAnnotations.forEach(ann => {
        // Find the page for this block
        const blockEl = document.querySelector(`[data-bid="${ann.block_id}"]`);
        if (blockEl) {
            const pageEl = blockEl.closest('.page');
            if (pageEl) {
                const pageNum = parseInt(pageEl.dataset.page);
                if (!annotationsByPage[pageNum]) {
                    annotationsByPage[pageNum] = [];
                }
                annotationsByPage[pageNum].push(ann);
            }
        }
    });

    // Render annotations grouped by page
    Object.keys(annotationsByPage).sort((a, b) => a - b).forEach(pageNum => {
        const pageGroup = document.createElement('div');
        pageGroup.className = 'annotation-page-group';
        pageGroup.innerHTML = `
            <div class="annotation-page-header">Page ${pageNum}</div>
        `;

        annotationsByPage[pageNum].forEach(ann => {
            const item = createAnnotationItem(ann);
            pageGroup.appendChild(item);
        });

        sidebarContent.appendChild(pageGroup);
    });
}

// Create annotation item for sidebar
function createAnnotationItem(annotation) {
    const item = document.createElement('div');
    item.className = 'annotation-item';
    item.onclick = () => scrollToAnnotation(annotation);

    // Get the annotated text
    const text = getAnnotationText(annotation);

    item.innerHTML = `
        <div class="annotation-item-header">
            <div class="annotation-color-indicator" style="background: ${annotation.color || '#ffeb3b'}"></div>
            <span class="annotation-page-badge">Highlight</span>
        </div>
        <div class="annotation-text">${escapeHtml(text)}</div>
        ${annotation.note ? `<div class="annotation-note">📝 ${escapeHtml(annotation.note)}</div>` : ''}
    `;

    return item;
}

// Get annotation text
function getAnnotationText(annotation) {
    const start = annotation.start_word_index;
    const end = annotation.end_word_index;

    let words = [];
    for (let i = start; i < end; i++) {
        const tid = `${annotation.block_id}_${i}`;
        const el = document.getElementById(`t-${tid}`);
        if (el) {
            words.push(el.textContent.trim());
        }
    }

    return words.join(' ') || 'Annotation text';
}

// Scroll to annotation
function scrollToAnnotation(annotation) {
    const tid = `${annotation.block_id}_${annotation.start_word_index}`;
    const el = document.getElementById(`t-${tid}`);

    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Flash effect
        el.style.transition = 'background-color 0.3s';
        const originalBg = el.style.backgroundColor;
        el.style.backgroundColor = '#64b5f6';

        setTimeout(() => {
            el.style.backgroundColor = originalBg;
        }, 1000);
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close menu on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('#highlight-menu') && !e.target.classList.contains('token')) {
        const menu = document.getElementById('highlight-menu');
        if (!menu.classList.contains('hidden')) {
            clearSelection();
        }
    }
});

// Update annotation
async function updateAnnotation(annId, params) {
    const saveBtn = document.getElementById('btn-save');
    const originalText = saveBtn.innerText;

    try {
        saveBtn.innerText = "Saving...";
        saveBtn.disabled = true;

        const res = await fetch(`/api/annotations/${annId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!res.ok) {
            throw new Error("Save failed");
        }

        // Show success feedback
        saveBtn.innerText = "Saved!";

        // Reload highlights to show updated annotation
        await loadHighlights();

        // Hide menu and clear state after a brief delay
        setTimeout(() => {
            document.getElementById('highlight-menu').classList.add('hidden');
            currentAnnotationId = null;
            currentAnnotationData = null;
        }, 500);

    } catch (e) {
        console.error("Update failed", e);
        saveBtn.innerText = "Error";
        showToast('Update Failed', 'Failed to update annotation. Please try again.', 'error');
    } finally {
        setTimeout(() => {
            saveBtn.innerText = originalText;
            saveBtn.disabled = false;
        }, 1500);
    }
}

// Delete Annotation
async function deleteAnnotation(annId) {
    if (!confirm("Delete this annotation?")) return;

    try {
        const res = await fetch(`/api/annotations/${annId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            throw new Error("Delete failed");
        }

        // Reload highlights to update UI
        await loadHighlights();

        document.getElementById('highlight-menu').classList.add('hidden');
        currentAnnotationId = null;
        currentAnnotationData = null;

    } catch (e) {
        console.error("Delete failed", e);
        showToast('Delete Failed', 'Failed to delete annotation. Please try again.', 'error');
    }
}