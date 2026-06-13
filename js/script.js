/* ═══════════════════════════════════════════════════════════
   IMGPDF PRO — script.js
   Features:
   · Dark / Light theme toggle (localStorage)
   · PDF filename input
   · DPI selector (72 / 150 / 300)
   · A3 + A4 + Letter + Custom page sizes
   · Sort: Original / A→Z / Smallest / Largest
   · Thumbnail size slider
   · Undo last single removal (via toast action)
   · Image info strip (filename + size) on every thumb
   · Position badge on every thumb
   · "Add more" card at end of grid
   · Touch drag-and-drop reorder
   · Polaroid-style entrance animation (CSS)
   · Overlay progress bar synced to page count
   · Extended format support (accept="image/*")
═══════════════════════════════════════════════════════════ */

class ImageToPDFConverter {

  constructor() {
    this._applyStoredTheme();
    this.init();
  }

  /* ─────────────────────────────────────────
     THEME
  ───────────────────────────────────────── */
  _applyStoredTheme() {
    const saved = localStorage.getItem('imgpdf-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }

  toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('imgpdf-theme', next);
  }

  /* ─────────────────────────────────────────
     INIT
  ───────────────────────────────────────── */
  init() {
    this.pica       = window.pica();
    this.images     = [];          // { name, size, src, type, rotation, addedAt }
    this.undoStack  = [];          // last removed items for undo
    this.sortMode   = 'none';
    this.dragIndex  = null;
    this.dragCounter = 0;

    this._queryElements();
    this._attachListeners();
    this._updateHUD();
  }

  _queryElements() {
    // File / workspace
    this.fileInput       = document.getElementById('fileInput');
    this.dropZone        = document.getElementById('drop-zone');
    this.thumbGrid       = document.getElementById('thumbs');
    this.gridArea        = this.thumbGrid.parentElement;   // .grid-area
    this.workspace       = document.querySelector('.workspace');

    // HUD
    this.countEl         = document.getElementById('count');
    this.totalSizeEl     = document.getElementById('totalSize');
    this.pagesEl         = document.getElementById('pages');
    this.hudEl           = document.getElementById('hud');

    // Buttons
    this.uploadBtn       = document.getElementById('uploadBtn');
    this.createBtn       = document.getElementById('createBtn');
    this.removeAllBtn    = document.getElementById('removeAllBtn');
    this.themeToggleBtn  = document.getElementById('themeToggle');
    this.modalCloseBtn   = document.getElementById('modalClose');

    // Progress
    this.progressBar     = document.getElementById('progressBar');
    this.statusText      = document.getElementById('statusText');

    // Overlays / modal
    this.processingOverlay = document.getElementById('processingOverlay');
    this.overlayStatus   = document.getElementById('overlayStatus');
    this.overlayBar      = document.getElementById('overlayBar');
    this.overlayCount    = document.getElementById('overlayCount');
    this.imageModal      = document.getElementById('imageModal');
    this.modalImg        = document.getElementById('modalImg');
    this.modalMeta       = document.getElementById('modalMeta');
    this.toastContainer  = document.getElementById('toastContainer');

    // Settings — Output
    this.filenameEl      = document.getElementById('filename');
    this.qualityEl       = document.getElementById('quality');
    this.qualityValueEl  = document.getElementById('qualityValue');
    this.dpiEl           = document.getElementById('dpi');

    // Settings — Page
    this.pageSizeEl      = document.getElementById('pageSize');
    this.orientationEl   = document.getElementById('orientation');
    this.customSizeRow   = document.getElementById('customSizeRow');
    this.customW         = document.getElementById('customW');
    this.customH         = document.getElementById('customH');
    this.marginEl        = document.getElementById('margin');
    this.imageFitEl      = document.getElementById('imageFit');

    // Settings — Options
    this.pageNumbersEl   = document.getElementById('pageNumbers');
    this.preservePngEl   = document.getElementById('preservePng');

    // Workspace controls
    this.thumbSizeEl     = document.getElementById('thumbSize');
    this.sortBtns        = document.querySelectorAll('.sort-btn');
  }

  _attachListeners() {
    // Upload
    this.uploadBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', e => this.handleFiles(e.target.files));

    // Drag & drop on workspace
    this.workspace.addEventListener('dragenter', e => this._onDragEnter(e));
    this.workspace.addEventListener('dragleave', e => this._onDragLeave(e));
    this.workspace.addEventListener('dragover',  e => e.preventDefault());
    this.workspace.addEventListener('drop',       e => this._onDrop(e));

    // Quality display
    this.qualityEl.addEventListener('input', () => {
      this.qualityValueEl.textContent = this.qualityEl.value + '%';
    });

    // Page size
    this.pageSizeEl.addEventListener('change', () => this._handlePageSizeChange());
    this.orientationEl.addEventListener('change', () => this._updateHUD());
    this.customW.addEventListener('input', () => this._updateHUD());
    this.customH.addEventListener('input', () => this._updateHUD());

    // Actions
    this.createBtn.addEventListener('click', () => this.createPDF());
    this.removeAllBtn.addEventListener('click', () => this.removeAllImages());

    // Theme
    this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

    // Modal
    this.modalCloseBtn.addEventListener('click', () => this._hideModal());
    this.imageModal.addEventListener('click', e => {
      if (e.target === this.imageModal) this._hideModal();
    });

    // Thumb size
    this.thumbSizeEl.addEventListener('input', () => {
      document.documentElement.style.setProperty('--thumb-size', this.thumbSizeEl.value + 'px');
    });

    // Sort buttons
    this.sortBtns.forEach(btn => {
      btn.addEventListener('click', () => this._sortImages(btn.dataset.sort));
    });

    // Keyboard
    document.addEventListener('keydown', e => this._handleKeyboard(e));
  }

  /* ─────────────────────────────────────────
     FILE HANDLING & DRAG-DROP
  ───────────────────────────────────────── */
  _onDragEnter(e) {
    e.preventDefault();
    this.dragCounter++;
    this.workspace.classList.add('dragover');
  }

  _onDragLeave(e) {
    e.preventDefault();
    this.dragCounter--;
    if (this.dragCounter === 0) this.workspace.classList.remove('dragover');
  }

  _onDrop(e) {
    e.preventDefault();
    this.dragCounter = 0;
    this.workspace.classList.remove('dragover');
    this.handleFiles(e.dataTransfer.files);
  }

  handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));

    if (files.length === 0) {
      this._showToast('Only image files are accepted.', 'warning');
      return;
    }

    let added = 0;
    const promises = files.map(file => {
      // Skip duplicates
      if (this.images.some(img => img.name === file.name && img.size === file.size))
        return Promise.resolve(null);

      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
          added++;
          this.images.push({
            name:     file.name,
            size:     file.size,
            src:      e.target.result,
            type:     file.type,
            rotation: 0,
            addedAt:  Date.now() + added,
          });
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(() => {
      this._applySortOrder();
      this._renderThumbs();
      if (added > 0) {
        this._showToast(`Added ${added} image${added > 1 ? 's' : ''}.`, 'success');
      } else {
        this._showToast('Images already added.', 'warning');
      }
      // Reset file input so same file can be re-added after removal
      this.fileInput.value = '';
    });
  }

  /* ─────────────────────────────────────────
     SORT
  ───────────────────────────────────────── */
  _sortImages(mode) {
    this.sortMode = mode;

    // Update button states
    this.sortBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === mode);
    });

    this._applySortOrder();
    this._renderThumbs();
  }

  _applySortOrder() {
    switch (this.sortMode) {
      case 'name':
        this.images.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'size-asc':
        this.images.sort((a, b) => a.size - b.size);
        break;
      case 'size-desc':
        this.images.sort((a, b) => b.size - a.size);
        break;
      default: // 'none' — original insertion order
        this.images.sort((a, b) => a.addedAt - b.addedAt);
    }
  }

  /* ─────────────────────────────────────────
     RENDER THUMBNAILS
  ───────────────────────────────────────── */
  _renderThumbs() {
    this.thumbGrid.innerHTML = '';
    let totalSize = 0;

    this.images.forEach((img, i) => {
      totalSize += img.size;
      this.thumbGrid.appendChild(this._createThumb(img, i));
    });

    // "Add more" card
    if (this.images.length > 0) {
      const addCard = document.createElement('div');
      addCard.className = 'thumb-add';
      addCard.setAttribute('role', 'button');
      addCard.setAttribute('title', 'Add more images');
      addCard.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v8M8 12h8"/>
        </svg>
        <span>Add more</span>
      `;
      addCard.addEventListener('click', () => this.fileInput.click());
      this.thumbGrid.appendChild(addCard);
    }

    this._updateStatus(totalSize);
    this._updateGridVisibility();
  }

  _createThumb(img, index) {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.draggable = true;
    div.dataset.index = index;

    div.innerHTML = `
      <div class="thumb-img-wrap">
        <img src="${img.src}" alt="${img.name}" class="thumb-img"
             style="transform:rotate(${img.rotation}deg)" loading="lazy">
      </div>
      <div class="thumb-info">
        <span class="thumb-name" title="${img.name}">${img.name}</span>
        <span class="thumb-size">${this._formatSize(img.size)}</span>
      </div>
      <span class="thumb-num">${index + 1}</span>
      <div class="thumb-actions">
        <button class="thumb-action" data-action="preview" title="Preview">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M1 10s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z"/>
            <circle cx="10" cy="10" r="3"/>
          </svg>
        </button>
        <button class="thumb-action" data-action="rotate" title="Rotate 90°">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 8A6 6 0 1 0 9.5 14.5"/>
            <path d="M16 4v4h-4"/>
          </svg>
        </button>
        <button class="thumb-action del" data-action="remove" title="Remove">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <circle cx="10" cy="10" r="8"/>
            <path d="M7 7l6 6M13 7l-6 6"/>
          </svg>
        </button>
      </div>
    `;

    // Action button delegation
    div.querySelectorAll('.thumb-action').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'preview') this.previewImage(index);
        if (action === 'rotate')  this._rotateImage(index);
        if (action === 'remove')  this._removeImage(index);
      });
    });

    this._attachDragEvents(div, index);
    this._attachTouchDrag(div, index);
    return div;
  }

  /* ─────────────────────────────────────────
     IMAGE ACTIONS
  ───────────────────────────────────────── */
  previewImage(index) {
    const img = this.images[index];
    if (!img) return;
    this.modalImg.src = img.src;
    this.modalImg.style.transform = `rotate(${img.rotation}deg)`;
    this.modalMeta.textContent = `${img.name}  ·  ${this._formatSize(img.size)}`;
    this.imageModal.classList.add('active');
  }

  _hideModal() {
    this.imageModal.classList.remove('active');
  }

  _rotateImage(index) {
    if (!this.images[index]) return;
    this.images[index].rotation = (this.images[index].rotation + 90) % 360;

    // Update DOM directly (no full re-render needed)
    const img = this.thumbGrid.querySelector(`[data-index="${index}"] .thumb-img`);
    if (img) img.style.transform = `rotate(${this.images[index].rotation}deg)`;
    this._showToast(`Image ${index + 1} rotated.`);
  }

  _removeImage(index) {
    if (!this.images[index]) return;
    const removed = { image: this.images[index], index };
    this.undoStack.push(removed);
    if (this.undoStack.length > 8) this.undoStack.shift();

    this.images.splice(index, 1);
    this._renderThumbs();

    this._showToast(
      'Image removed.',
      'default',
      [{ label: 'Undo', action: () => this._undoRemove() }]
    );
  }

  _undoRemove() {
    if (!this.undoStack.length) return;
    const { image, index } = this.undoStack.pop();
    this.images.splice(Math.min(index, this.images.length), 0, image);
    this._applySortOrder();
    this._renderThumbs();
    this._showToast('Restored.', 'success');
  }

  removeAllImages() {
    if (this.images.length === 0) return;
    if (!confirm(`Remove all ${this.images.length} images?`)) return;
    this.undoStack = [];
    this.images = [];
    this._renderThumbs();
    this._showToast('All images cleared.', 'success');
  }

  /* ─────────────────────────────────────────
     DRAG & DROP REORDER (Mouse)
  ───────────────────────────────────────── */
  _attachDragEvents(el, index) {
    el.addEventListener('dragstart', e => {
      this.dragIndex = index;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      this.dragIndex = null;
      this.thumbGrid.querySelectorAll('.drag-over')
        .forEach(t => t.classList.remove('drag-over'));
    });

    el.addEventListener('dragover', e => {
      e.preventDefault();
      if (this.dragIndex !== null && this.dragIndex !== index) {
        this.thumbGrid.querySelectorAll('.drag-over')
          .forEach(t => t.classList.remove('drag-over'));
        el.classList.add('drag-over');
      }
    });

    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('drag-over');
      if (this.dragIndex !== null && this.dragIndex !== index) {
        this._reorder(index);
      }
    });
  }

  _reorder(dropIndex) {
    const moved = this.images.splice(this.dragIndex, 1)[0];
    this.images.splice(dropIndex, 0, moved);
    // After manual reorder, reset sort mode to 'none' (original)
    this.sortMode = 'none';
    this.sortBtns.forEach(b => b.classList.toggle('active', b.dataset.sort === 'none'));
    this._renderThumbs();
  }

  /* ─────────────────────────────────────────
     TOUCH DRAG REORDER
  ───────────────────────────────────────── */
  _attachTouchDrag(el, index) {
    let startX, startY, isDragging = false, ghost = null, longPressTimer;

    const onTouchStart = e => {
      if (e.target.closest('.thumb-action')) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;

      // Long-press to initiate drag
      longPressTimer = setTimeout(() => {
        isDragging = true;
        this.dragIndex = index;
        el.classList.add('dragging');

        // Create floating ghost
        const rect = el.getBoundingClientRect();
        ghost = el.cloneNode(true);
        ghost.style.cssText = `
          position:fixed; z-index:999; pointer-events:none;
          width:${rect.width}px; height:${rect.height}px;
          opacity:0.85; box-shadow:0 20px 50px rgba(0,0,0,0.5);
          border-radius:10px; top:${rect.top}px; left:${rect.left}px;
          transition:none;
        `;
        document.body.appendChild(ghost);
      }, 300);
    };

    const onTouchMove = e => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) clearTimeout(longPressTimer);

      if (!isDragging || !ghost) return;
      e.preventDefault();

      const t = e.touches[0];
      const rect = el.getBoundingClientRect();
      ghost.style.left = (t.clientX - rect.width / 2) + 'px';
      ghost.style.top  = (t.clientY - rect.height / 2) + 'px';

      // Highlight target
      ghost.style.display = 'none';
      const elUnder = document.elementFromPoint(t.clientX, t.clientY);
      ghost.style.display = '';

      const target = elUnder?.closest('.thumb:not(.dragging):not(.thumb-add)');
      this.thumbGrid.querySelectorAll('.drag-over')
        .forEach(t => t.classList.remove('drag-over'));
      if (target) target.classList.add('drag-over');
    };

    const onTouchEnd = e => {
      clearTimeout(longPressTimer);
      if (!isDragging) return;

      el.classList.remove('dragging');
      if (ghost) { ghost.remove(); ghost = null; }

      const t = e.changedTouches[0];
      const elUnder = document.elementFromPoint(t.clientX, t.clientY);
      const target = elUnder?.closest('.thumb:not(.dragging):not(.thumb-add)');

      if (target) {
        const targetIndex = Number(target.dataset.index);
        if (!isNaN(targetIndex) && targetIndex !== this.dragIndex) {
          this._reorder(targetIndex);
        }
      }

      this.thumbGrid.querySelectorAll('.drag-over')
        .forEach(t => t.classList.remove('drag-over'));

      isDragging = false;
      this.dragIndex = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });
  }

  /* ─────────────────────────────────────────
     UI STATE UPDATES
  ───────────────────────────────────────── */
  _updateStatus(totalSize) {
    const n = this.images.length;
    this.countEl.textContent    = n;
    this.totalSizeEl.textContent = n > 0 ? this._formatSize(totalSize) : '—';
    this.createBtn.disabled      = n === 0;
    this.statusText.textContent  = n > 0 ? `${n} image${n > 1 ? 's' : ''} ready — export when done.` : 'Add images to begin';

    if (n === 0) this.progressBar.style.width = '0%';

    this.hudEl.classList.toggle('active', n > 0);
  }

  _updateGridVisibility() {
    this.gridArea.classList.toggle('has-images', this.images.length > 0);
  }

  _handlePageSizeChange() {
    const isCustom = this.pageSizeEl.value === 'custom';
    this.customSizeRow.style.display = isCustom ? 'flex' : 'none';
    this._updateHUD();
  }

  _updateHUD() {
    const size = this.pageSizeEl.value;
    if (size === 'custom') {
      const w = this.customW.value || '?';
      const h = this.customH.value || '?';
      this.pagesEl.textContent = `${w}×${h}`;
    } else {
      this.pagesEl.textContent = size.toUpperCase();
    }
  }

  /* ─────────────────────────────────────────
     KEYBOARD SHORTCUTS
  ───────────────────────────────────────── */
  _handleKeyboard(e) {
    if (e.key === 'Escape' && this.imageModal.classList.contains('active')) {
      this._hideModal();
      return;
    }
    // Delete key: only when not focused on an input
    if ((e.key === 'Delete' || e.key === 'Backspace') &&
        !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) &&
        this.images.length > 0) {
      this.removeAllImages();
    }
  }

  /* ─────────────────────────────────────────
     PDF CREATION
  ───────────────────────────────────────── */
  async createPDF() {
    if (this.images.length === 0) return;

    this._showProcessingOverlay('Preparing…');
    this.progressBar.style.width = '0%';

    try {
      const { jsPDF } = window.jspdf;
      const cfg  = this._buildConfig();
      const doc  = new jsPDF({
        orientation: cfg.pageWidth > cfg.pageHeight ? 'landscape' : 'portrait',
        unit:        'mm',
        format:      [cfg.pageWidth, cfg.pageHeight],
      });

      await this._processAllImages(doc, cfg);
      this._savePDF(doc);

    } catch (err) {
      console.error('PDF error:', err);
      this._showToast('Failed to create PDF: ' + err.message, 'error');
      this.statusText.textContent = 'Failed — try again.';
    } finally {
      this._hideProcessingOverlay();
    }
  }

  _buildConfig() {
    const margin = Math.max(0, Number(this.marginEl.value) || 0);
    const quality = Number(this.qualityEl.value) / 100;   // 0.10–1.00
    const dpi     = Number(this.dpiEl.value) || 150;

    const sizes = { a4: [210, 297], a3: [297, 420], letter: [216, 279] };
    let [pw, ph] = this.pageSizeEl.value === 'custom'
      ? [Number(this.customW.value) || 210, Number(this.customH.value) || 297]
      : (sizes[this.pageSizeEl.value] || sizes.a4);

    if (this.orientationEl.value === 'landscape') [pw, ph] = [ph, pw];

    return {
      margin,
      pageWidth:  pw,
      pageHeight: ph,
      quality,
      dpi,
      fitMode:      this.imageFitEl.value,
      addNumbers:   this.pageNumbersEl.checked,
      preservePng:  this.preservePngEl.checked,
    };
  }

  async _processAllImages(doc, cfg) {
    const total     = this.images.length;
    const safeW     = cfg.pageWidth  - 2 * cfg.margin;
    const safeH     = cfg.pageHeight - 2 * cfg.margin;
    const pageRatio = safeW / safeH;

    for (let i = 0; i < total; i++) {
      if (i > 0) doc.addPage();

      const msg = `Page ${i + 1} of ${total}`;
      this.overlayStatus.textContent  = msg;
      this.overlayCount.textContent   = `${i + 1} / ${total}`;
      this.statusText.textContent     = msg;

      await this._processSingleImage(doc, cfg, this.images[i], safeW, safeH, pageRatio);

      const pct = ((i + 1) / total) * 100;
      this.progressBar.style.width = pct + '%';
      this.overlayBar.style.width  = pct + '%';
    }
  }

  async _processSingleImage(doc, cfg, imgData, safeW, safeH, pageRatio) {
    const img    = await this._loadImage(imgData.src);
    const format = (cfg.preservePng && imgData.type === 'image/png') ? 'PNG' : 'JPEG';
    const dataUrl = await this._resizeWithPica(img, format, cfg.quality, cfg.dpi, cfg.pageWidth, cfg.pageHeight);
    const dims    = this._calcDimensions(img, imgData.rotation, safeW, safeH, pageRatio, cfg.fitMode);

    this._addImageToPDF(doc, dataUrl, format, dims, cfg.fitMode, cfg.margin, safeW, safeH);

    if (cfg.addNumbers) {
      const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
      const total   = this.images.length;
      doc.setFontSize(9);
      doc.setTextColor(160);
      const txt = `${pageNum} / ${total}`;
      const tw  = doc.getStringUnitWidth(txt) * 9 / doc.internal.scaleFactor;
      doc.text(txt, cfg.pageWidth - cfg.margin - tw, cfg.pageHeight - cfg.margin + 4);
    }
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async _resizeWithPica(img, format, quality, dpi, pageW, pageH) {
    const pxPerMm = dpi / 25.4;
    const maxW    = Math.round(pageW * pxPerMm);
    const maxH    = Math.round(pageH * pxPerMm);

    let { width, height } = this._fitDims(img.width, img.height, maxW, maxH);
    width  = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));

    const canvas    = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;

    await this.pica.resize(img, canvas, {
      alpha:   format === 'PNG',
      quality: 3,   // Lanczos
    });

    return canvas.toDataURL(
      format === 'PNG' ? 'image/png' : 'image/jpeg',
      quality
    );
  }

  _fitDims(w, h, maxW, maxH) {
    if (w <= maxW && h <= maxH) return { width: w, height: h };
    const ratio = w / h;
    if (ratio > maxW / maxH) {
      return { width: maxW, height: maxW / ratio };
    } else {
      return { width: maxH * ratio, height: maxH };
    }
  }

  _calcDimensions(img, rotation, safeW, safeH, pageRatio, fitMode) {
    let iw = img.width, ih = img.height;
    if (rotation === 90 || rotation === 270) [iw, ih] = [ih, iw];
    const ir = iw / ih;

    let fw, fh;
    switch (fitMode) {
      case 'stretch':
        fw = safeW; fh = safeH;
        break;
      case 'cover':
        if (ir > pageRatio) { fh = safeH; fw = safeH * ir; }
        else                { fw = safeW; fh = safeW / ir; }
        break;
      default: // fit
        if (ir > pageRatio) { fw = safeW; fh = safeW / ir; }
        else                { fh = safeH; fw = safeH * ir; }
    }

    return {
      fw, fh,
      fx: (safeW - fw) / 2,
      fy: (safeH - fh) / 2,
    };
  }

  _addImageToPDF(doc, dataUrl, format, { fw, fh, fx, fy }, fitMode, margin, safeW, safeH) {
    if (fitMode === 'cover') {
      doc.saveGraphicsState();
      doc.rect(margin, margin, safeW, safeH).clip();
      doc.addImage(dataUrl, format, margin + fx, margin + fy, fw, fh);
      doc.restoreGraphicsState();
    } else {
      doc.addImage(dataUrl, format, margin + fx, margin + fy, fw, fh);
    }
  }

  _getFilename() {
    const raw = (this.filenameEl.value || '').trim() || 'converted-images';
    return raw.toLowerCase().endsWith('.pdf') ? raw : raw + '.pdf';
  }

  _savePDF(doc) {
    doc.save(this._getFilename());
    this._showToast('PDF exported successfully!', 'success');
    this.statusText.textContent = 'Done — PDF saved.';
  }

  /* ─────────────────────────────────────────
     OVERLAY & PROGRESS
  ───────────────────────────────────────── */
  _showProcessingOverlay(msg) {
    this.overlayStatus.textContent = msg;
    this.overlayBar.style.width    = '0%';
    this.overlayCount.textContent  = '';
    this.processingOverlay.classList.add('active');
  }

  _hideProcessingOverlay() {
    this.processingOverlay.classList.remove('active');
  }

  /* ─────────────────────────────────────────
     TOAST
  ───────────────────────────────────────── */
  /**
   * @param {string} msg
   * @param {'default'|'success'|'error'|'warning'} type
   * @param {{label:string, action:function}[]} actions
   */
  _showToast(msg, type = 'default', actions = []) {
    const toast = document.createElement('div');
    toast.className = `toast ${type !== 'default' ? type : ''}`.trim();

    const span = document.createElement('span');
    span.className = 'toast-msg';
    span.textContent = msg;
    toast.appendChild(span);

    actions.forEach(({ label, action }) => {
      const btn = document.createElement('button');
      btn.className = 'toast-action';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        action();
        this._dismissToast(toast);
      });
      toast.appendChild(btn);
    });

    this.toastContainer.appendChild(toast);

    // Auto dismiss
    const timer = setTimeout(() => this._dismissToast(toast), actions.length ? 5000 : 3200);
    toast._timer = timer;
  }

  _dismissToast(toast) {
    clearTimeout(toast._timer);
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 260);
  }

  /* ─────────────────────────────────────────
     UTILITIES
  ───────────────────────────────────────── */
  _formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const kb = bytes / 1024;
    if (kb < 1000) return kb.toFixed(1) + ' KB';
    return (kb / 1024).toFixed(2) + ' MB';
  }
}

/* ═══════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════ */
let converter;
document.addEventListener('DOMContentLoaded', () => {
  converter = new ImageToPDFConverter();
});
window.ImageToPDFConverter = ImageToPDFConverter;
