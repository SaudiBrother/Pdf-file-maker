/* ==========================================================
   IMAGE → PDF PRO CONVERTER
   Versi 2.0
   - Fungsionalitas Pica.js untuk resize berkualitas tinggi
   - Perbaikan bug rotasi thumbnail
   - Perbaikan bug Kualitas JPG
   - Implementasi Fit/Stretch/Cover yang benar
   - HUD dinamis
   - UI overlay saat pemrosesan
========================================================== */

// Inisialisasi Pica
const pica = window.pica();

// Elemen DOM
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("drop-zone");
const thumbs = document.getElementById("thumbs");
const countEl = document.getElementById("count");
const totalSizeEl = document.getElementById("totalSize");
const pagesEl = document.getElementById("pages"); // Baru
const createBtn = document.getElementById("createBtn");
const removeAllBtn = document.getElementById("removeAllBtn");
const progressBar = document.getElementById("progressBar");
const statusText = document.getElementById("statusText");
const toastContainer = document.getElementById("toastContainer");
const imageModal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImg");
const workspace = document.querySelector(".workspace"); // Baru

// Overlay
const processingOverlay = document.getElementById("processingOverlay"); // Baru
const overlayStatus = document.getElementById("overlayStatus"); // Baru

// Opsi
const pageSizeEl = document.getElementById("pageSize");
const orientationEl = document.getElementById("orientation");
const marginEl = document.getElementById("margin");
const imageFitEl = document.getElementById("imageFit");
const qualityEl = document.getElementById("quality");
const qualityValueEl = document.getElementById("qualityValue");
const pageNumbersEl = document.getElementById("pageNumbers");
const preservePngEl = document.getElementById("preservePng");
const customSizeRow = document.getElementById("customSizeRow");
const customW = document.getElementById("customW");
const customH = document.getElementById("customH");

let images = []; // array penyimpanan file { name, size, src, rotation, type }
let dragIndex = null;
let dragCounter = 0; // Untuk mencegah bug dragleave

/* ==========================================================
   EVENT INPUT GAMBAR
========================================================== */
document.getElementById("uploadBtn").onclick = () => fileInput.click();

fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

// Event Drag & Drop yang lebih baik
workspace.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragCounter++;
  workspace.classList.add("dragover");
});

workspace.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0) {
    workspace.classList.remove("dragover");
  }
});

workspace.addEventListener("dragover", (e) => e.preventDefault());

workspace.addEventListener("drop", (e) => {
  e.preventDefault();
  dragCounter = 0;
  workspace.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});

/* ==========================================================
   HANDLE FILES
========================================================== */
function handleFiles(fileList) {
  const newFiles = Array.from(fileList).filter((f) =>
    ["image/png", "image/jpeg", "image/webp"].includes(f.type)
  );
  if (newFiles.length === 0) {
    return showToast("⚠️ Hanya menerima PNG, JPG, atau WEBP.", "warning");
  }

  let filesAdded = 0;
  newFiles.forEach((file) => {
    // Cek duplikat berdasarkan nama dan ukuran
    if (images.some(img => img.name === file.name && img.size === file.size)) {
      return;
    }
    
    filesAdded++;
    const reader = new FileReader();
    reader.onload = (e) => {
      images.push({
        name: file.name,
        size: file.size,
        src: e.target.result,
        type: file.type,
        rotation: 0
      });
      renderThumbs();
    };
    reader.readAsDataURL(file);
  });

  if (filesAdded > 0) {
    showToast(`🖼️ Berhasil menambahkan ${filesAdded} gambar.`, "success");
  } else {
    showToast("Gambar tersebut sudah ada.", "warning");
  }
}

/* ==========================================================
   RENDER THUMBNAILS
========================================================== */
function renderThumbs() {
  thumbs.innerHTML = "";
  let totalSize = 0;

  images.forEach((img, i) => {
    totalSize += img.size;

    const div = document.createElement("div");
    div.className = "thumb";
    div.draggable = true;
    div.dataset.index = i; // Simpan index

    // Konten (termasuk ikon SVG)
    div.innerHTML = `
      <img src="${img.src}" alt="${img.name}" class="thumb-img" style="transform: rotate(${img.rotation}deg)">
      <div class="actions">
        <button onclick="previewImage(${i})" title="Pratinjau">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path></svg>
        </button>
        <button onclick="rotateImage(event, ${i})" title="Putar 90°">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201-4.42 5.5 5.5 0 011.066-1.066l.09.09a.75.75 0 001.06-1.06l-.09-.09a7 7 0 00-11.36 5.58 7 7 0 0010.02 5.61l-1.04-1.04a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l2.5-2.5a.75.75 0 10-1.06-1.06l-1.04 1.04z" clip-rule="evenodd"></path></svg>
        </button>
        <button onclick="removeImage(event, ${i})" title="Hapus" class="delete">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"></path></svg>
        </button>
      </div>
    `;

    // drag events
    div.addEventListener("dragstart", (e) => {
      dragIndex = i;
      e.target.classList.add("dragging");
    });
    div.addEventListener("dragend", (e) => {
      e.target.classList.remove("dragging");
      dragIndex = null;
    });
    div.addEventListener("dragover", (e) => {
      e.preventDefault();
      // Opsi: tambahkan visual feedback saat hover
    });
    div.addEventListener("drop", (e) => {
      e.preventDefault();
      if (dragIndex === null) return;
      reorderImages(i);
    });
    
    thumbs.appendChild(div);
  });

  // Update status
  countEl.textContent = images.length;
  totalSizeEl.textContent = formatSize(totalSize);
  createBtn.disabled = images.length === 0;
  statusText.textContent = images.length
    ? "Siap membuat PDF."
    : "Menunggu gambar...";
  
  // Jika tidak ada gambar, reset progress bar
  if (images.length === 0) {
    progressBar.style.width = "0%";
  }
}

/* ==========================================================
   ACTIONS
========================================================== */
function previewImage(index) {
  if (!images[index]) return;
  modalImg.src = images[index].src;
  modalImg.style.transform = `rotate(${images[index].rotation}deg)`; // Tampilkan rotasi di modal
  imageModal.classList.add("active");
}
imageModal.addEventListener("click", () => imageModal.classList.remove("active"));

function rotateImage(event, index) {
  event.stopPropagation(); // Hentikan event agar tidak memicu drag
  if (!images[index]) return;
  
  images[index].rotation = (images[index].rotation + 90) % 360;
  
  // PERBAIKAN: Update thumbnail UI secara langsung
  const thumbImg = thumbs.querySelector(`[data-index="${index}"] .thumb-img`);
  if (thumbImg) {
    thumbImg.style.transform = `rotate(${images[index].rotation}deg)`;
  }
  
  showToast(`🔁 Gambar ${index + 1} diputar.`);
}

function removeImage(event, index) {
  event.stopPropagation(); // Hentikan event agar tidak memicu drag
  if (!images[index]) return;
  
  images.splice(index, 1);
  renderThumbs(); // Render ulang untuk memperbaiki index
  showToast("🗑️ Gambar dihapus.", "success");
}

removeAllBtn.addEventListener("click", () => {
  if (images.length === 0) return;
  if (confirm("Apakah Anda yakin ingin menghapus semua gambar?")) {
    images = [];
    renderThumbs();
    showToast("Semua gambar dihapus.", "success");
  }
});

/* ==========================================================
   REORDERING
========================================================== */
function reorderImages(dropIndex) {
  if (dragIndex === dropIndex) return;
  const moved = images.splice(dragIndex, 1)[0];
  images.splice(dropIndex, 0, moved);
  renderThumbs(); // Render ulang untuk memperbaiki index
}

/* ==========================================================
   OPTION LISTENERS
========================================================== */
qualityEl.addEventListener("input", () => {
  qualityValueEl.textContent = Number(qualityEl.value).toFixed(2);
});

pageSizeEl.addEventListener("change", () => {
  customSizeRow.style.display = pageSizeEl.value === "custom" ? "flex" : "none";
  updateHud();
});
orientationEl.addEventListener("change", updateHud);
customW.addEventListener("input", updateHud);
customH.addEventListener("input", updateHud);

function updateHud() {
  const size = pageSizeEl.value;
  if (size === 'custom') {
    const w = customW.value || "?";
    const h = customH.value || "?";
    pagesEl.textContent = `${w}x${h}mm`;
  } else {
    pagesEl.textContent = size.toUpperCase();
  }
}

/* ==========================================================
   HELPER: GET IMAGE DIMENSIONS
========================================================== */
function getImageDimensions(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/* ==========================================================
   CREATE PDF (LOGIKA UTAMA DITULIS ULANG)
========================================================== */
createBtn.addEventListener("click", async () => {
  if (images.length === 0) return;

  processingOverlay.classList.add("active");
  overlayStatus.textContent = "Mempersiapkan PDF...";
  
  try {
    const { jsPDF } = window.jspdf;
    const margin = Number(marginEl.value) || 0;
    const fitMode = imageFitEl.value;
    const quality = Number(qualityEl.value);
    const addNumbers = pageNumbersEl.checked;
    const preservePng = preservePngEl.checked;

    let pageW, pageH;
    const size = pageSizeEl.value;
    
    if (size === "custom") {
      pageW = Number(customW.value) || 210; // Default A4
      pageH = Number(customH.value) || 297; // Default A4
    } else {
      const sizes = { a4: [210, 297], letter: [216, 279] };
      [pageW, pageH] = sizes[size];
    }

    if (orientationEl.value === "landscape") {
      [pageW, pageH] = [pageH, pageW];
    }

    const doc = new jsPDF({
      orientation: orientationEl.value,
      unit: "mm",
      format: [pageW, pageH]
    });

    progressBar.style.width = "0%";
    statusText.textContent = "📄 Membuat PDF...";

    const safeW_mm = pageW - 2 * margin;
    const safeH_mm = pageH - 2 * margin;
    const pageRatio = safeW_mm / safeH_mm;

    for (let i = 0; i < images.length; i++) {
      if (i > 0) doc.addPage();
      
      const imgData = images[i];
      const statusMsg = `Memproses gambar ${i + 1} dari ${images.length}...`;
      statusText.textContent = statusMsg;
      overlayStatus.textContent = statusMsg;

      // 1. Muat gambar asli
      const img = new Image();
      img.src = imgData.src;
      await img.decode();

      // 2. Tentukan format output
      let format = 'JPEG';
      if (preservePng && imgData.type === 'image/png') {
        format = 'PNG';
      }

      // 3. Resize berkualitas tinggi dengan Pica
      // Batasi dimensi maks untuk performa, misal setara 300 DPI A4
      const DPI = 150; // 150 DPI adalah keseimbangan baik
      const pxPerMm = DPI / 25.4;
      const maxW_px = Math.round(pageW * pxPerMm);
      const maxH_px = Math.round(pageH * pxPerMm);

      let w = img.width, h = img.height;
      if (w > maxW_px || h > maxH_px) {
        const ratio = w / h;
        if (ratio > (maxW_px / maxH_px)) { // Lebih lebar
          if (w > maxW_px) { h = (h * maxW_px) / w; w = maxW_px; }
        } else { // Lebih tinggi
          if (h > maxH_px) { w = (w * maxH_px) / h; h = maxH_px; }
        }
      }

      const resizeCanvas = document.createElement('canvas');
      resizeCanvas.width = Math.round(w);
      resizeCanvas.height = Math.round(h);
      
      await pica.resize(img, resizeCanvas, { alpha: format === 'PNG' });
      
      const dataUrl = resizeCanvas.toDataURL(
        format === 'PNG' ? 'image/png' : 'image/jpeg',
        quality // PERBAIKAN: Menggunakan nilai 'quality' dari slider
      );

      // 4. Hitung dimensi & posisi di PDF
      let origW = img.width;
      let origH = img.height;
      
      // Sesuaikan dimensi untuk rotasi
      if (imgData.rotation === 90 || imgData.rotation === 270) {
        [origW, origH] = [origH, origW];
      }
      
      const imgRatio = origW / origH;
      let finalW, finalH, finalX, finalY;

      if (fitMode === 'stretch') {
        finalW = safeW_mm;
        finalH = safeH_mm;
      } else if (fitMode === 'cover') {
        if (imgRatio > pageRatio) {
          finalW = safeH_mm * imgRatio;
          finalH = safeH_mm;
        } else {
          finalW = safeW_mm;
          finalH = safeW_mm / imgRatio;
        }
      } else { // 'fit' (default)
        if (imgRatio > pageRatio) {
          finalW = safeW_mm;
          finalH = safeW_mm / imgRatio;
        } else {
          finalW = safeH_mm * imgRatio;
          finalH = safeH_mm;
        }
      }

      // Pusatkan gambar
      finalX = margin + (safeW_mm - finalW) / 2;
      finalY = margin + (safeH_mm - finalH) / 2;

      // 5. Tambahkan ke PDF
      // PERBAIKAN: Gunakan 'clip' untuk mode 'cover'
      if (fitMode === 'cover') {
        doc.saveGraphicsState();
        doc.rect(margin, margin, safeW_mm, safeH_mm).clip();
        doc.addImage(dataUrl, format, finalX, finalY, finalW, finalH, null, 'NONE', imgData.rotation);
        doc.restoreGraphicsState();
      } else {
        doc.addImage(dataUrl, format, finalX, finalY, finalW, finalH, null, 'NONE', imgData.rotation);
      }

      // 6. Tambah nomor halaman
      if (addNumbers) {
        doc.setFontSize(10);
        doc.setTextColor(150);
        const text = `${i + 1} / ${images.length}`;
        const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
        doc.text(text, pageW - margin - textWidth, pageH - margin + 4);
      }

      progressBar.style.width = ((i + 1) / images.length) * 100 + "%";
    }

    doc.save("converted-images.pdf");
    showToast("✅ PDF berhasil dibuat!", "success");
    statusText.textContent = "Selesai. Siap untuk tugas berikutnya.";
    
  } catch (error) {
    console.error(error);
    showToast(`❌ Terjadi kesalahan: ${error.message}`, "error");
    statusText.textContent = "Gagal membuat PDF.";
  } finally {
    processingOverlay.classList.remove("active");
  }
});

/* ==========================================================
   UTILITIES
========================================================== */
function formatSize(size) {
  if (size === 0) return "0 KB";
  const kb = size / 1024;
  return kb > 1024 ? (kb / 1024).toFixed(2) + " MB" : kb.toFixed(1) + " KB";
}

function showToast(msg, type = "") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.style.opacity = 0;
    t.style.transform = "translateX(20px)";
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// Inisialisasi awal
updateHud();
