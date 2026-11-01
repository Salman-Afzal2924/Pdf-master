
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const fileInfo = document.getElementById("fileInfo");
const compressBtn = document.getElementById("compressBtn");
const removeFileBtn = document.getElementById("removeFileBtn");
const qualitySelect = document.getElementById("quality");
const message = document.getElementById("message");

let selectedFile = null;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// Open file selector
uploadArea.addEventListener("click", () => {
    fileInput.click();
});

// File selection
fileInput.addEventListener("change", event => {
    handleFile(event.target.files[0]);
});

// Drag and drop
uploadArea.addEventListener("dragover", event => {
    event.preventDefault();
    uploadArea.style.background = "#eee5ff";
});

uploadArea.addEventListener("dragleave", () => {
    uploadArea.style.background = "#faf8ff";
});

uploadArea.addEventListener("drop", event => {
    event.preventDefault();
    uploadArea.style.background = "#faf8ff";

    handleFile(event.dataTransfer.files[0]);
});

// Handle uploaded PDF
async function handleFile(file) {
    message.textContent = "";

    if (!file) return;

    if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
    ) {
        message.textContent = "Please select a valid PDF file.";
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        message.textContent = "Maximum file size is 50 MB.";
        return;
    }

    try {
        const bytes = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(bytes)
        }).promise;

        selectedFile = file;

        fileInfo.style.display = "block";
        fileInfo.innerHTML = `
            <strong>${escapeHTML(file.name)}</strong><br>
            Size: ${formatSize(file.size)}<br>
            Pages: ${pdf.numPages}
        `;

        compressBtn.disabled = false;
        removeFileBtn.style.display = "inline-block";

        message.textContent = "PDF uploaded successfully.";

    } catch (error) {
        resetFile();
        message.textContent =
            "Unable to read this PDF. Please try another file.";
    }
}

// Remove PDF
removeFileBtn.addEventListener("click", () => {
    resetFile();
    message.textContent = "PDF removed successfully.";
});

// Reset uploaded file
function resetFile() {
    selectedFile = null;
    fileInput.value = "";

    fileInfo.style.display = "none";
    fileInfo.innerHTML = "";

    compressBtn.disabled = true;
    removeFileBtn.style.display = "none";
}

// Compress PDF
compressBtn.addEventListener("click", async () => {
    if (!selectedFile) {
        message.textContent = "Please upload a PDF first.";
        return;
    }

    compressBtn.disabled = true;
    removeFileBtn.disabled = true;

    try {
        message.textContent = "Preparing PDF...";

        const bytes = await selectedFile.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(bytes)
        }).promise;

        const outputPDF = await PDFLib.PDFDocument.create();

        const quality = Number(qualitySelect.value);

        // Lower scale reduces output resolution
        const scale = quality >= 0.8 ? 1.5 :
                      quality >= 0.6 ? 1.2 : 0.9;

        for (let pageNumber = 1;
             pageNumber <= pdf.numPages;
             pageNumber++) {

            message.textContent =
                `Compressing page ${pageNumber} of ${pdf.numPages}...`;

            const page = await pdf.getPage(pageNumber);

            const viewport = page.getViewport({ scale });

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const imageBlob = await new Promise(resolve => {
                canvas.toBlob(resolve, "image/jpeg", quality);
            });

            if (!imageBlob) {
                throw new Error("Unable to optimize a PDF page.");
            }

            const imageBytes = await imageBlob.arrayBuffer();

            const jpgImage = await outputPDF.embedJpg(imageBytes);

            // Keep original page dimensions
            const originalViewport = page.getViewport({ scale: 1 });

            const outputPage = outputPDF.addPage([
                originalViewport.width,
                originalViewport.height
            ]);

            outputPage.drawImage(jpgImage, {
                x: 0,
                y: 0,
                width: originalViewport.width,
                height: originalViewport.height
            });

            canvas.width = 0;
            canvas.height = 0;
        }

        message.textContent = "Creating compressed PDF...";

        const compressedBytes = await outputPDF.save();

        const blob = new Blob([compressedBytes], {
            type: "application/pdf"
        });

        const downloadURL = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = downloadURL;
        link.download = "PDFMaster_Compressed.pdf";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(downloadURL), 1000);

        const originalSize = selectedFile.size;
        const newSize = blob.size;
        const difference = originalSize - newSize;

        if (difference > 0) {
            const percentage = (difference / originalSize) * 100;

            message.textContent =
                `Done! Original: ${formatSize(originalSize)} | ` +
                `Compressed: ${formatSize(newSize)} | ` +
                `Reduced by ${percentage.toFixed(1)}%.`;
        } else {
            message.textContent =
                `Done! New file: ${formatSize(newSize)}. ` +
                "This PDF could not be reduced in size.";
        }

    } catch (error) {
        console.error(error);
        message.textContent =
            error.message || "Compression failed. Please try another PDF.";

    } finally {
        compressBtn.disabled = !selectedFile;
        removeFileBtn.disabled = false;
    }
});

// Format file size
function formatSize(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// Escape filename
function escapeHTML(value) {
    return value.replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}
