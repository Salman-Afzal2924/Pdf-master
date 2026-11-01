
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const fileInfo = document.getElementById("fileInfo");
const rotateBtn = document.getElementById("rotateBtn");
const removeFileBtn = document.getElementById("removeFileBtn");
const rotationSelect = document.getElementById("rotation");
const message = document.getElementById("message");

let selectedFile = null;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Open file selector
uploadArea.addEventListener("click", () => {
    fileInput.click();
});

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

// Handle uploaded PDF
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

        const pdf = await PDFLib.PDFDocument.load(bytes);

        selectedFile = file;

        fileInfo.style.display = "block";
        fileInfo.innerHTML = `
            <strong>${escapeHTML(file.name)}</strong><br>
            Size: ${formatSize(file.size)}<br>
            Pages: ${pdf.getPageCount()}
        `;

        rotateBtn.disabled = false;
        removeFileBtn.style.display = "inline-block";

        message.textContent = "PDF uploaded successfully.";

    } catch (error) {
        resetFile();
        message.textContent = "Unable to read this PDF.";
    }
}

// Remove selected PDF
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

    rotateBtn.disabled = true;
    removeFileBtn.style.display = "none";
}

// Rotate PDF
rotateBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    rotateBtn.disabled = true;
    removeFileBtn.disabled = true;

    try {
        message.textContent = "Rotating PDF...";

        const bytes = await selectedFile.arrayBuffer();

        const pdf = await PDFLib.PDFDocument.load(bytes);

        const angle = Number(rotationSelect.value);

        const pages = pdf.getPages();

        pages.forEach(page => {
            const currentRotation = page.getRotation().angle;
            const newRotation = (currentRotation + angle) % 360;

            page.setRotation(
                PDFLib.degrees(newRotation)
            );
        });

        const pdfBytes = await pdf.save();

        const blob = new Blob([pdfBytes], {
            type: "application/pdf"
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "PDFMaster_Rotated.pdf";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        message.textContent =
            `Success! All ${pages.length} pages rotated by ${angle} degrees.`;

    } catch (error) {
        console.error(error);

        message.textContent =
            error.message || "Unable to rotate PDF.";

    } finally {
        rotateBtn.disabled = !selectedFile;
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
