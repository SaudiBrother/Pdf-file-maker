# Pro Image → PDF Converter

A professional, lightweight web application designed to merge multiple images into a single, high-quality PDF file.  
It includes full customization options, live previews, drag-and-drop image ordering, and efficient on-device processing.


## Features

- **Modern Interface** — a clean, responsive design with a subtle pastel glass aesthetic.  
- **Drag and Drop Support** — easily reorder images with intuitive drag-and-drop functionality.  
- **High-Quality Resizing** — powered by [Pica.js](https://github.com/nodeca/pica) for superior image scaling and clarity.  
- **Advanced Configuration Options**  
  - Page sizes: `A4`, `Letter`, or custom dimensions (in millimeters)  
  - Orientation: `Portrait` or `Landscape`  
  - Adjustable margins and image fit modes (`fit`, `stretch`, `cover`)  
  - JPEG quality slider  
  - Optional page numbering  
  - PNG transparency preservation  
- **Real-Time HUD and Progress Bar** — provides continuous feedback during PDF generation.  
- **Image Preview Modal** — preview, zoom, and rotate images prior to export.  
- **Toast Notifications** — delivers immediate feedback for all user actions.


## Tech Stack

- **HTML5** and **CSS3** (utilizing CSS variables and custom components)  
- **JavaScript (ES6+)**  
- [**jsPDF**](https://github.com/parallax/jsPDF) — for PDF generation  
- [**Pica.js**](https://github.com/nodeca/pica) — for high-quality image resizing  


## How to Use

1. Open the application in your browser:  
   [https://SaudiBrother.github.io/Pdf-file-maker/](https://SaudiBrother.github.io/Pdf-file-maker/)

2. Click **“Select Images”** or drag and drop your images into the workspace.  
3. Reorder, rotate, or preview the images as required.  
4. Adjust **page settings, orientation, margins, and quality parameters**.  
5. Click **“Create PDF”** to begin the export process.  
6. Once the progress bar completes, your PDF will be automatically downloaded.


## Notes

- Supported formats: **PNG**, **JPG**, **WEBP**  
- Recommended browsers: **Chrome**, **Edge**, or **Firefox** (latest version)  
- All processing is handled **locally**; no data is uploaded to any server.  
- Optimized for up to **50 images simultaneously**, depending on image resolution.  


## License

This project is distributed under the **MIT License**.  
Author: [SaudiBrother](https://github.com/SaudiBrother)
