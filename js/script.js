/* ==========================================================
   IMAGE → PDF PRO CONVERTER
   Semua logika interaktif situs
========================================================== */

const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("drop-zone");
const thumbs = document.getElementById("thumbs");
const countEl = document.getElementById("count");
const totalSizeEl = document.getElementById("totalSize");
const createBtn = document.getElementById("createBtn");
const removeAllBtn = document.getElementById("removeAllBtn");
const progressBar = document.getElementById("progressBar");
const statusText = document.getElementById("statusText");
const toastContainer = document.getElementById("toastContainer");
const imageModal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImg");

// Options
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

let images = []; // array penyimpanan file
let dragIndex = null;

/* ==========================================================
   EVENT INPUT GAMBAR
========================================================== */
document.getElementById("uploadBtn").onclick = () => fileInput.click();

fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});

/* ==========================================================
   HANDLE FILES
========================================================== */
function handleFiles(fileList) {
  const newFiles = Array.from(fileList).filter((f) =>
    ["image/png", "image/jpeg", "image/webp"].includes(f.type)
  );
  if (newFiles.length === 0) return showToast("⚠️ Hanya menerima PNG, JPG, atau WEBP.");

  newFiles.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      images.push({
        name: file.name,
        size: file.size,
        src: e.target.result,
        rotation: 0
      });
      renderThumbs();
    };
    reader.readAsDataURL(file);
  });
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
    div.innerHTML = `
      <img src="${img.src}" alt="thumb">
      <div class="actions">
        <button onclick="previewImage(${i})">👁️</button>
        <button onclick="rotateImage(${i})">⟳</button>
        <button onclick="removeImage(${i})">✖</button>
      </div>
    `;

    // drag events
    div.addEventListener("dragstart", () => (dragIndex = i));
    div.addEventListener("dragover", (e) => e.preventDefault());
    div.addEventListener("drop", () => reorderImages(i));
    thumbs.appendChild(div);
  });

  countEl.textContent = images.length;
  totalSizeEl.textContent = formatSize(totalSize);
  createBtn.disabled = images.length === 0;
  statusText.textContent = images.length
    ? "Siap membuat PDF."
    : "Menunggu gambar...";
}

/* ==========================================================
   ACTIONS
========================================================== */
function previewImage(index) {
  modalImg.src = images[index].src;
  imageModal.classList.add("active");
}
imageModal.addEventListener("click", () => imageModal.classList.remove("active"));

function rotateImage(index) {
  images[index].rotation = (images[index].rotation + 90) % 360;
  showToast(`🔁 Gambar ${index + 1} diputar.`);
}

function removeImage(index) {
  images.splice(index, 1);
  renderThumbs();
  showToast("🗑️ Gambar dihapus.");
}

removeAllBtn.addEventListener("click", () => {
  if (images.length === 0) return;
  if (confirm("Hapus semua gambar?")) {
    images = [];
    renderThumbs();
  }
});

/* ==========================================================
   REORDERING
========================================================== */
function reorderImages(dropIndex) {
  const moved = images.splice(dragIndex, 1)[0];
  images.splice(dropIndex, 0, moved);
  renderThumbs();
}

/* ==========================================================
   QUALITY SLIDER
========================================================== */
qualityEl.addEventListener("input", () => {
  qualityValueEl.textContent = qualityEl.value;
});

/* ==========================================================
   CUSTOM PAGE SIZE
========================================================== */
pageSizeEl.addEventListener("change", () => {
  customSizeRow.style.display = pageSizeEl.value === "custom" ? "block" : "none";
});

/* ==========================================================
   CREATE PDF
========================================================== */
createBtn.addEventListener("click", async () => {
  if (images.length === 0) return;

  const { jsPDF } = window.jspdf;
  const margin = Number(marginEl.value) || 0;
  const fitMode = imageFitEl.value;
  const quality = Number(qualityEl.value);
  const addNumbers = pageNumbersEl.checked;
  const preservePng = preservePngEl.checked;

  let pageW, pageH;
  if (pageSizeEl.value === "custom") {
    pageW = Number(customW.value);
    pageH = Number(customH.value);
  } else {
    const sizes = { a4: [210, 297], letter: [216, 279] };
    [pageW, pageH] = sizes[pageSizeEl.value];
  }

  if (orientationEl.value === "landscape") [pageW, pageH] = [pageH, pageW];

  const doc = new jsPDF({
    orientation: orientationEl.value,
    unit: "mm",
    format: [pageW, pageH]
  });

  progressBar.style.width = "0%";
  statusText.textContent = "📄 Membuat PDF...";

  for (let i = 0; i < images.length; i++) {
    if (i > 0) doc.addPage();

    const img = images[i];
    const imgData = await fixRotationAndResize(img.src, img.rotation, fitMode, pageW, pageH, margin, preservePng);
    doc.addImage(imgData, "JPEG", margin, margin, pageW - 2 * margin, pageH - 2 * margin, "", "FAST", quality);

    if (addNumbers) {
      doc.setFontSize(10);
      doc.text(`${i + 1} / ${images.length}`, pageW - margin - 10, pageH - margin - 5);
    }

    progressBar.style.width = ((i + 1) / images.length) * 100 + "%";
    statusText.textContent = `Halaman ${i + 1} dari ${images.length}`;
  }

  doc.save("images.pdf");
  showToast("✅ PDF berhasil dibuat!");
  progressBar.style.width = "100%";
  statusText.textContent = "Selesai.";
});

/* ==========================================================
   IMAGE PROCESSING
========================================================== */
async function fixRotationAndResize(src, rotation, fitMode, pageW, pageH, margin, preservePng) {
  const img = new Image();
  img.src = src;
  await img.decode();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const safeW = pageW - 2 * margin;
  const safeH = pageH - 2 * margin;

  // hitung rasio
  let drawW = safeW, drawH = safeH;
  const imgRatio = img.width / img.height;
  const pageRatio = safeW / safeH;

  if (fitMode === "fit") {
    if (imgRatio > pageRatio) drawH = safeW / imgRatio;
    else drawW = safeH * imgRatio;
  } else if (fitMode === "cover") {
    if (imgRatio > pageRatio) drawW = safeH * imgRatio;
    else drawH = safeW / imgRatio;
  }

  canvas.width = drawW;
  canvas.height = drawH;

  if (rotation) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
  }

  ctx.drawImage(img, 0, 0, drawW, drawH);

  return preservePng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.92);
}

/* ==========================================================
   UTILITIES
========================================================== */
function formatSize(size) {
  const kb = size / 1024;
  return kb > 1024 ? (kb / 1024).toFixed(2) + " MB" : kb.toFixed(1) + " KB";
}

function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3000);
  }
