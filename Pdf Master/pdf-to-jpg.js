
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const fileInfo = document.getElementById("fileInfo");
const convertBtn = document.getElementById("convertBtn");
const removeFileBtn = document.getElementById("removeFileBtn");
const qualitySelect = document.getElementById("quality");
const message = document.getElementById("message");

let selectedFile = null;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// Open file selector
uploadArea.addEventListener("click", () => fileInput.click());

// Select PDF
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

// Handle PDF
async function handleFile(file) {
    message.textContent = "";

    if (!file) return;

    if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
    ) {
        message.textContent = "Please select a valid PDF.";
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
            Total Pages: ${pdf.numPages}
        `;

        convertBtn.disabled = false;
        removeFileBtn.style.display = "inline-block";

        message.textContent = "PDF uploaded successfully.";

    } catch (error) {
        resetFile();
        message.textContent = "Unable to read this PDF.";
    }
}

// Remove PDF
removeFileBtn.addEventListener("click", () => {
    resetFile();
    message.textContent = "PDF removed successfully.";
});

// Reset
function resetFile() {
    selectedFile = null;
    fileInput.value = "";

    fileInfo.style.display = "none";
    fileInfo.innerHTML = "";

    convertBtn.disabled = true;
    removeFileBtn.style.display = "none";
}

// Convert PDF to JPG
convertBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    convertBtn.disabled = true;
    removeFileBtn.disabled = true;

    try {
        message.textContent = "Preparing conversion...";

        const bytes = await selectedFile.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(bytes)
        }).promise;

        const zip = new JSZip();
        const quality = Number(qualitySelect.value);

        for (let i = 1; i <= pdf.numPages; i++) {
            message.textContent =
                `Converting page ${i} of ${pdf.numPages}...`;

            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, "image/jpeg", quality);
            });

            if (!blob) {
                throw new Error(`Could not convert page ${i}.`);
            }

            zip.file(
                `page-${i}.jpg`,
                await blob.arrayBuffer()
            );

            canvas.width = 0;
            canvas.height = 0;
        }

        message.textContent = "Creating ZIP file...";

        const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE"
        });

        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "PDFMaster_JPG_Images.zip";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        message.textContent =
            `Success! ${pdf.numPages} JPG images downloaded in a ZIP file.`;

    } catch (error) {
        console.error(error);
        message.textContent =
            error.message || "Conversion failed. Please try again.";

    } finally {
        convertBtn.disabled = !selectedFile;
        removeFileBtn.disabled = false;
    }
});

// Helpers
function formatSize(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function escapeHTML(value) {
    return value.replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}
