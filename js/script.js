/* ==========================================================
   IMAGE → PDF PRO CONVERTER
   Version 2.0 - Enhanced
   - High-quality Pica.js image processing
   - Fixed thumbnail rotation bugs
   - Improved JPG quality handling
   - Proper Fit/Stretch/Cover implementation
   - Dynamic HUD updates
   - Enhanced UI overlays and error handling
========================================================== */

class ImageToPDFConverter {
    constructor() {
        this.init();
    }

    init() {
        // Initialize Pica for high-quality image resizing
        this.pica = window.pica();
        this.images = []; // Store files: { name, size, src, rotation, type }
        this.dragIndex = null;
        this.dragCounter = 0;
        
        this.initializeElements();
        this.attachEventListeners();
        this.updateHUD();
    }

    initializeElements() {
        // Core DOM elements
        this.fileInput = document.getElementById("fileInput");
        this.dropZone = document.getElementById("drop-zone");
        this.thumbs = document.getElementById("thumbs");
        this.countEl = document.getElementById("count");
        this.totalSizeEl = document.getElementById("totalSize");
        this.pagesEl = document.getElementById("pages");
        this.createBtn = document.getElementById("createBtn");
        this.removeAllBtn = document.getElementById("removeAllBtn");
        this.progressBar = document.getElementById("progressBar");
        this.statusText = document.getElementById("statusText");
        this.toastContainer = document.getElementById("toastContainer");
        this.imageModal = document.getElementById("imageModal");
        this.modalImg = document.getElementById("modalImg");
        this.workspace = document.querySelector(".workspace");

        // Overlay elements
        this.processingOverlay = document.getElementById("processingOverlay");
        this.overlayStatus = document.getElementById("overlayStatus");

        // Option elements
        this.pageSizeEl = document.getElementById("pageSize");
        this.orientationEl = document.getElementById("orientation");
        this.marginEl = document.getElementById("margin");
        this.imageFitEl = document.getElementById("imageFit");
        this.qualityEl = document.getElementById("quality");
        this.qualityValueEl = document.getElementById("qualityValue");
        this.pageNumbersEl = document.getElementById("pageNumbers");
        this.preservePngEl = document.getElementById("preservePng");
        this.customSizeRow = document.getElementById("customSizeRow");
        this.customW = document.getElementById("customW");
        this.customH = document.getElementById("customH");
    }

    attachEventListeners() {
        // File input events
        document.getElementById("uploadBtn").addEventListener("click", () => this.fileInput.click());
        this.fileInput.addEventListener("change", (e) => this.handleFiles(e.target.files));

        // Enhanced drag and drop
        this.workspace.addEventListener("dragenter", this.handleDragEnter.bind(this));
        this.workspace.addEventListener("dragleave", this.handleDragLeave.bind(this));
        this.workspace.addEventListener("dragover", this.handleDragOver.bind(this));
        this.workspace.addEventListener("drop", this.handleDrop.bind(this));

        // Control events
        this.qualityEl.addEventListener("input", this.updateQualityDisplay.bind(this));
        this.pageSizeEl.addEventListener("change", this.handlePageSizeChange.bind(this));
        this.orientationEl.addEventListener("change", this.updateHUD.bind(this));
        this.customW.addEventListener("input", this.updateHUD.bind(this));
        this.customH.addEventListener("input", this.updateHUD.bind(this));
        this.createBtn.addEventListener("click", this.createPDF.bind(this));
        this.removeAllBtn.addEventListener("click", this.removeAllImages.bind(this));

        // Modal events
        this.imageModal.addEventListener("click", () => this.hideModal());
        
        // Global keyboard events
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
    }

    /* ==========================================================
       FILE HANDLING & DRAG-DROP
    ========================================================== */
    handleDragEnter(e) {
        e.preventDefault();
        this.dragCounter++;
        this.workspace.classList.add("dragover");
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.dragCounter--;
        if (this.dragCounter === 0) {
            this.workspace.classList.remove("dragover");
        }
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDrop(e) {
        e.preventDefault();
        this.dragCounter = 0;
        this.workspace.classList.remove("dragover");
        this.handleFiles(e.dataTransfer.files);
    }

    handleFiles(fileList) {
        const validTypes = ["image/png", "image/jpeg", "image/webp"];
        const newFiles = Array.from(fileList).filter(file => 
            validTypes.includes(file.type)
        );

        if (newFiles.length === 0) {
            this.showToast("⚠️ Only PNG, JPG, or WEBP files are accepted.", "warning");
            return;
        }

        let filesAdded = 0;
        const loadPromises = newFiles.map(file => {
            // Check for duplicates by name and size
            if (this.images.some(img => 
                img.name === file.name && img.size === file.size
            )) {
                return Promise.resolve(null);
            }

            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    filesAdded++;
                    this.images.push({
                        name: file.name,
                        size: file.size,
                        src: e.target.result,
                        type: file.type,
                        rotation: 0
                    });
                    resolve();
                };
                reader.onerror = () => resolve();
                reader.readAsDataURL(file);
            });
        });

        Promise.all(loadPromises).then(() => {
            this.renderThumbs();
            if (filesAdded > 0) {
                this.showToast(`🖼️ Successfully added ${filesAdded} images.`, "success");
            } else {
                this.showToast("All images are already added.", "warning");
            }
        });
    }

    /* ==========================================================
       THUMBNAIL MANAGEMENT
    ========================================================== */
    renderThumbs() {
        this.thumbs.innerHTML = "";
        let totalSize = 0;

        this.images.forEach((img, index) => {
            totalSize += img.size;

            const thumbElement = this.createThumbElement(img, index);
            this.thumbs.appendChild(thumbElement);
        });

        this.updateStatus(totalSize);
        this.toggleWorkspaceState();
    }

    createThumbElement(img, index) {
        const div = document.createElement("div");
        div.className = "thumb";
        div.draggable = true;
        div.dataset.index = index;

        div.innerHTML = `
            <img src="${img.src}" alt="${img.name}" class="thumb-img" 
                 style="transform: rotate(${img.rotation}deg)">
            <div class="actions">
                <button onclick="converter.previewImage(${index})" title="Preview">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
                    </svg>
                </button>
                <button onclick="converter.rotateImage(event, ${index})" title="Rotate 90°">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201-4.42 5.5 5.5 0 011.066-1.066l.09.09a.75.75 0 001.06-1.06l-.09-.09a7 7 0 00-11.36 5.58 7 7 0 0010.02 5.61l-1.04-1.04a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l2.5-2.5a.75.75 0 10-1.06-1.06l-1.04 1.04z" clip-rule="evenodd"></path>
                    </svg>
                </button>
                <button onclick="converter.removeImage(event, ${index})" title="Delete" class="delete">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;

        this.attachDragEvents(div, index);
        return div;
    }

    attachDragEvents(element, index) {
        element.addEventListener("dragstart", (e) => {
            this.dragIndex = index;
            e.target.classList.add("dragging");
        });

        element.addEventListener("dragend", (e) => {
            e.target.classList.remove("dragging");
            this.dragIndex = null;
        });

        element.addEventListener("dragover", (e) => e.preventDefault());

        element.addEventListener("drop", (e) => {
            e.preventDefault();
            if (this.dragIndex !== null) {
                this.reorderImages(index);
            }
        });
    }

    updateStatus(totalSize) {
        this.countEl.textContent = this.images.length;
        this.totalSizeEl.textContent = this.formatSize(totalSize);
        this.createBtn.disabled = this.images.length === 0;
        
        this.statusText.textContent = this.images.length
            ? "Ready to create PDF."
            : "Waiting for images...";

        if (this.images.length === 0) {
            this.progressBar.style.width = "0%";
        }
    }

    toggleWorkspaceState() {
        if (this.images.length > 0) {
            this.workspace.classList.add("has-images");
        } else {
            this.workspace.classList.remove("has-images");
        }
    }

    /* ==========================================================
       IMAGE ACTIONS
    ========================================================== */
    previewImage(index) {
        if (!this.images[index]) return;
        
        this.modalImg.src = this.images[index].src;
        this.modalImg.style.transform = `rotate(${this.images[index].rotation}deg)`;
        this.imageModal.classList.add("active");
    }

    hideModal() {
        this.imageModal.classList.remove("active");
    }

    rotateImage(event, index) {
        event.stopPropagation();
        if (!this.images[index]) return;
        
        // Update rotation (0° → 90° → 180° → 270° → 0°)
        this.images[index].rotation = (this.images[index].rotation + 90) % 360;
        
        // Direct UI update for better performance
        const thumbImg = this.thumbs.querySelector(`[data-index="${index}"] .thumb-img`);
        if (thumbImg) {
            thumbImg.style.transform = `rotate(${this.images[index].rotation}deg)`;
        }
        
        this.showToast(`🔁 Image ${index + 1} rotated.`);
    }

    removeImage(event, index) {
        event.stopPropagation();
        if (!this.images[index]) return;
        
        this.images.splice(index, 1);
        this.renderThumbs();
        this.showToast("🗑️ Image removed.", "success");
    }

    removeAllImages() {
        if (this.images.length === 0) return;
        
        if (confirm("Are you sure you want to remove all images?")) {
            this.images = [];
            this.renderThumbs();
            this.showToast("All images removed.", "success");
        }
    }

    /* ==========================================================
       REORDERING & UTILITIES
    ========================================================== */
    reorderImages(dropIndex) {
        if (this.dragIndex === dropIndex || this.dragIndex === null) return;
        
        const movedImage = this.images.splice(this.dragIndex, 1)[0];
        this.images.splice(dropIndex, 0, movedImage);
        this.renderThumbs();
    }

    /* ==========================================================
       OPTION HANDLERS
    ========================================================== */
    updateQualityDisplay() {
        this.qualityValueEl.textContent = Number(this.qualityEl.value).toFixed(2);
    }

    handlePageSizeChange() {
        this.customSizeRow.style.display = 
            this.pageSizeEl.value === "custom" ? "flex" : "none";
        this.updateHUD();
    }

    updateHUD() {
        const size = this.pageSizeEl.value;
        if (size === 'custom') {
            const w = this.customW.value || "?";
            const h = this.customH.value || "?";
            this.pagesEl.textContent = `${w}×${h}mm`;
        } else {
            this.pagesEl.textContent = size.toUpperCase();
        }
    }

    /* ==========================================================
       PDF CREATION - ENHANCED
    ========================================================== */
    async createPDF() {
        if (this.images.length === 0) return;

        this.showProcessingOverlay("Preparing PDF...");
        
        try {
            const { jsPDF } = window.jspdf;
            const config = this.getPDFConfig();
            const doc = this.initializePDF(jsPDF, config);

            await this.processImages(doc, config);
            
            this.finalizePDF(doc);
            
        } catch (error) {
            this.handlePDFError(error);
        } finally {
            this.hideProcessingOverlay();
        }
    }

    getPDFConfig() {
        const margin = Number(this.marginEl.value) || 0;
        const quality = Number(this.qualityEl.value);
        
        let pageWidth, pageHeight;
        const size = this.pageSizeEl.value;
        
        if (size === "custom") {
            pageWidth = Number(this.customW.value) || 210;
            pageHeight = Number(this.customH.value) || 297;
        } else {
            const sizes = { 
                a4: [210, 297], 
                letter: [216, 279] 
            };
            [pageWidth, pageHeight] = sizes[size] || sizes.a4;
        }

        if (this.orientationEl.value === "landscape") {
            [pageWidth, pageHeight] = [pageHeight, pageWidth];
        }

        return {
            margin,
            pageWidth,
            pageHeight,
            quality,
            fitMode: this.imageFitEl.value,
            addNumbers: this.pageNumbersEl.checked,
            preservePng: this.preservePngEl.checked
        };
    }

    initializePDF(jsPDF, config) {
        return new jsPDF({
            orientation: config.pageWidth > config.pageHeight ? "landscape" : "portrait",
            unit: "mm",
            format: [config.pageWidth, config.pageHeight]
        });
    }

    async processImages(doc, config) {
        const safeWidth = config.pageWidth - 2 * config.margin;
        const safeHeight = config.pageHeight - 2 * config.margin;
        const pageRatio = safeWidth / safeHeight;

        for (let i = 0; i < this.images.length; i++) {
            if (i > 0) doc.addPage();
            
            await this.processSingleImage(doc, config, this.images[i], i, safeWidth, safeHeight, pageRatio);
            this.updateProgress(i + 1, this.images.length);
        }
    }

    async processSingleImage(doc, config, imageData, index, safeWidth, safeHeight, pageRatio) {
        const statusMsg = `Processing image ${index + 1} of ${this.images.length}...`;
        this.updateStatusText(statusMsg);

        // Load and decode image
        const img = await this.loadImage(imageData.src);
        
        // Determine output format
        const format = this.getOutputFormat(imageData, config.preservePng);
        
        // High-quality resize with Pica
        const resizedDataUrl = await this.resizeImage(img, format, config.quality, config.pageWidth, config.pageHeight);
        
        // Calculate dimensions and position
        const dimensions = this.calculateImageDimensions(img, imageData.rotation, safeWidth, safeHeight, pageRatio, config.fitMode);
        
        // Add to PDF with proper clipping for cover mode
        this.addImageToPDF(doc, resizedDataUrl, format, dimensions, config.fitMode, config.margin, safeWidth, safeHeight);
        
        // Add page numbers if enabled
        if (config.addNumbers) {
            this.addPageNumber(doc, index, this.images.length, config.pageWidth, config.pageHeight, config.margin);
        }
    }

    async loadImage(src) {
        const img = new Image();
        img.src = src;
        await img.decode();
        return img;
    }

    getOutputFormat(imageData, preservePng) {
        return (preservePng && imageData.type === 'image/png') ? 'PNG' : 'JPEG';
    }

    async resizeImage(img, format, quality, pageWidth, pageHeight) {
        const DPI = 150; // Balanced quality and performance
        const pxPerMm = DPI / 25.4;
        const maxWidth = Math.round(pageWidth * pxPerMm);
        const maxHeight = Math.round(pageHeight * pxPerMm);

        let { width, height } = this.calculateResizeDimensions(img, maxWidth, maxHeight);

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        
        await this.pica.resize(img, canvas, { 
            alpha: format === 'PNG',
            quality: 3 // High quality Lanczos filter
        });
        
        return canvas.toDataURL(
            format === 'PNG' ? 'image/png' : 'image/jpeg',
            quality
        );
    }

    calculateResizeDimensions(img, maxWidth, maxHeight) {
        let width = img.width;
        let height = img.height;
        const ratio = width / height;

        if (width > maxWidth || height > maxHeight) {
            if (ratio > (maxWidth / maxHeight)) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
        }

        return { width, height };
    }

    calculateImageDimensions(img, rotation, safeWidth, safeHeight, pageRatio, fitMode) {
        let originalWidth = img.width;
        let originalHeight = img.height;
        
        // Adjust dimensions for rotation
        if (rotation === 90 || rotation === 270) {
            [originalWidth, originalHeight] = [originalHeight, originalWidth];
        }
        
        const imageRatio = originalWidth / originalHeight;
        let finalWidth, finalHeight;

        switch (fitMode) {
            case 'stretch':
                finalWidth = safeWidth;
                finalHeight = safeHeight;
                break;
            case 'cover':
                if (imageRatio > pageRatio) {
                    finalWidth = safeHeight * imageRatio;
                    finalHeight = safeHeight;
                } else {
                    finalWidth = safeWidth;
                    finalHeight = safeWidth / imageRatio;
                }
                break;
            default: // 'fit'
                if (imageRatio > pageRatio) {
                    finalWidth = safeWidth;
                    finalHeight = safeWidth / imageRatio;
                } else {
                    finalWidth = safeHeight * imageRatio;
                    finalHeight = safeHeight;
                }
        }

        // Center the image
        const finalX = (safeWidth - finalWidth) / 2;
        const finalY = (safeHeight - finalHeight) / 2;

        return { finalWidth, finalHeight, finalX, finalY };
    }

    addImageToPDF(doc, dataUrl, format, dimensions, fitMode, margin, safeWidth, safeHeight) {
        const { finalWidth, finalHeight, finalX, finalY } = dimensions;

        if (fitMode === 'cover') {
            doc.saveGraphicsState();
            doc.rect(margin, margin, safeWidth, safeHeight).clip();
            doc.addImage(dataUrl, format, margin + finalX, margin + finalY, finalWidth, finalHeight);
            doc.restoreGraphicsState();
        } else {
            doc.addImage(dataUrl, format, margin + finalX, margin + finalY, finalWidth, finalHeight);
        }
    }

    addPageNumber(doc, currentPage, totalPages, pageWidth, pageHeight, margin) {
        doc.setFontSize(10);
        doc.setTextColor(150);
        const text = `${currentPage + 1} / ${totalPages}`;
        const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
        doc.text(text, pageWidth - margin - textWidth, pageHeight - margin + 4);
    }

    finalizePDF(doc) {
        doc.save("converted-images.pdf");
        this.showToast("✅ PDF created successfully!", "success");
        this.statusText.textContent = "Completed. Ready for next task.";
    }

    handlePDFError(error) {
        console.error("PDF Creation Error:", error);
        this.showToast(`❌ Error creating PDF: ${error.message}`, "error");
        this.statusText.textContent = "Failed to create PDF.";
    }

    /* ==========================================================
       PROGRESS & UI UPDATES
    ========================================================== */
    updateProgress(current, total) {
        const percentage = (current / total) * 100;
        this.progressBar.style.width = `${percentage}%`;
    }

    updateStatusText(message) {
        this.statusText.textContent = message;
        this.overlayStatus.textContent = message;
    }

    showProcessingOverlay(message) {
        this.overlayStatus.textContent = message;
        this.processingOverlay.classList.add("active");
    }

    hideProcessingOverlay() {
        this.processingOverlay.classList.remove("active");
    }

    /* ==========================================================
       UTILITIES
    ========================================================== */
    formatSize(size) {
        if (size === 0) return "0 KB";
        const kb = size / 1024;
        return kb > 1024 
            ? `${(kb / 1024).toFixed(2)} MB` 
            : `${kb.toFixed(1)} KB`;
    }

    showToast(message, type = "") {
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.toastContainer.appendChild(toast);

        // Enhanced toast animation
        toast.style.animation = "toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";

        setTimeout(() => {
            toast.style.animation = "toastOut 0.3s ease forwards";
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    /* ==========================================================
       KEYBOARD SHORTCUTS
    ========================================================== */
    handleKeyboard(e) {
        // Escape key to close modal
        if (e.key === 'Escape' && this.imageModal.classList.contains('active')) {
            this.hideModal();
        }

        // Delete key to remove selected image (if we had selection)
        if (e.key === 'Delete' && this.images.length > 0) {
            // Could be enhanced with image selection
            this.removeAllImages();
        }
    }
}

/* ==========================================================
   INITIALIZATION
========================================================== */
// Global instance
let converter;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    converter = new ImageToPDFConverter();
});

// Export for global access (if needed)
window.ImageToPDFConverter = ImageToPDFConverter;
