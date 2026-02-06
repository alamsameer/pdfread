// State
const docId = window.location.pathname.split('/').pop();
let selectionStart = null;
let selectionEnd = null;
let pendingSelectionBlockId = null;
let currentAnnotationId = null; // Track editing state
let currentAnnotationData = null; // Store current annotation data

document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const res = await fetch(`/api/documents/${docId}`);
        if (!res.ok) throw new Error("Failed to load document");

        const doc = await res.json();
        document.getElementById('docTitle').innerText = doc.title;
        document.getElementById('pageCount').innerText = `${doc.total_pages} Pages`;

        const container = document.getElementById('pages');
        container.innerHTML = '';

        const maxPages = Math.min(doc.total_pages, 10);
        for (let i = 1; i <= maxPages; i++) {
            await loadPage(i);
        }

        await loadHighlights();

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
        alert(e.message);
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
            alert("Please select text within the same paragraph/block.");
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
        alert("Please select text first");
    }
}

async function applyHighlightWithParams(params = {}) {
    if (!selectionStart || !selectionEnd) {
        alert("Please select text first");
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
        alert("Failed to save annotation. Please try again.");
    }
}

async function loadHighlights() {
    try {
        const res = await fetch(`/api/documents/${docId}/annotations`);
        if (!res.ok) return;
        const highlights = await res.json();

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
    } catch (e) {
        console.error("Failed to load highlights", e);
    }
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
        alert("Failed to update annotation. Please try again.");
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
        alert("Failed to delete annotation. Please try again.");
    }
}