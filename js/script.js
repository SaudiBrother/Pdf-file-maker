document.getElementById("createPdf").addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const input = document.getElementById("imageUpload");
  const statusText = document.getElementById("status");

  if (input.files.length === 0) {
    statusText.textContent = "⚠️ Please upload at least one image.";
    return;
  }

  statusText.textContent = "⏳ Creating your PDF... please wait.";

  const pdf = new jsPDF();
  let firstPage = true;

  for (const file of input.files) {
    const img = await loadImage(URL.createObjectURL(file));
    const width = pdf.internal.pageSize.getWidth();
    const height = (img.height * width) / img.width;

    if (!firstPage) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, 0, width, height);
    firstPage = false;
  }

  pdf.save("converted.pdf");
  statusText.textContent = "✅ PDF created successfully!";
});

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = url;
  });
}
