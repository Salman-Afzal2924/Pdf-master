
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const fileInfo = document.getElementById("fileInfo");
const pageRange = document.getElementById("pageRange");
const removePagesBtn = document.getElementById("removePagesBtn");
const removeFileBtn = document.getElementById("removeFileBtn");
const message = document.getElementById("message");

let selectedFile = null;
let totalPages = 0;

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
        totalPages = pdf.getPageCount();

        fileInfo.style.display = "block";
        fileInfo.innerHTML = `
            <strong>${escapeHTML(file.name)}</strong><br>
            Size: ${formatSize(file.size)}<br>
            Total Pages: ${totalPages}
        `;

        removePagesBtn.disabled = false;
        removeFileBtn.style.display = "inline-block";

        message.textContent = "PDF uploaded successfully.";

    } catch (error) {
        resetFile();
        message.textContent = "Unable to read this PDF.";
    }
}

// Remove uploaded PDF
removeFileBtn.addEventListener("click", () => {
    resetFile();
    message.textContent = "PDF removed successfully.";
});

// Reset file
function resetFile() {
    selectedFile = null;
    totalPages = 0;

    fileInput.value = "";
    pageRange.value = "";

    fileInfo.style.display = "none";
    fileInfo.innerHTML = "";

    removePagesBtn.disabled = true;
    removeFileBtn.style.display = "none";
}

// Remove selected pages
removePagesBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    const rangeText = pageRange.value.trim();

    if (!rangeText) {
        message.textContent = "Enter the pages you want to remove.";
        return;
    }

    removePagesBtn.disabled = true;
    removeFileBtn.disabled = true;

    try {
        const pagesToRemove = parsePageRanges(rangeText, totalPages);

        if (pagesToRemove.length >= totalPages) {
            throw new Error(
                "You cannot remove every page. Keep at least one page."
            );
        }

        message.textContent = "Removing selected pages...";

        const bytes = await selectedFile.arrayBuffer();

        const originalPDF = await PDFLib.PDFDocument.load(bytes);
        const newPDF = await PDFLib.PDFDocument.create();

        const pagesToKeep = [];

        for (let page = 1; page <= totalPages; page++) {
            if (!pagesToRemove.includes(page)) {
                pagesToKeep.push(page - 1);
            }
        }

        const copiedPages = await newPDF.copyPages(
            originalPDF,
            pagesToKeep
        );

        copiedPages.forEach(page => newPDF.addPage(page));

        const pdfBytes = await newPDF.save();

        const blob = new Blob([pdfBytes], {
            type: "application/pdf"
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "PDFMaster_Pages_Removed.pdf";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        message.textContent =
            `Success! Removed ${pagesToRemove.length} pages. ` +
            `${pagesToKeep.length} pages remain.`;

    } catch (error) {
        message.textContent =
            error.message || "Unable to remove pages.";

    } finally {
        removePagesBtn.disabled = !selectedFile;
        removeFileBtn.disabled = false;
    }
});

// Parse page numbers and ranges
function parsePageRanges(input, maxPages) {
    const pages = new Set();

    const parts = input.split(",");

    for (const part of parts) {
        const value = part.trim();

        if (!value) {
            throw new Error("Please enter valid page numbers.");
        }

        if (value.includes("-")) {
            const range = value.split("-");

            if (range.length !== 2) {
                throw new Error("Invalid page range: " + value);
            }

            const start = Number(range[0].trim());
            const end = Number(range[1].trim());

            if (
                !Number.isInteger(start) ||
                !Number.isInteger(end) ||
                start < 1 ||
                end > maxPages ||
                start > end
            ) {
                throw new Error("Invalid page range: " + value);
            }

            for (let page = start; page <= end; page++) {
                pages.add(page);
            }

        } else {
            const page = Number(value);

            if (
                !Number.isInteger(page) ||
                page < 1 ||
                page > maxPages
            ) {
                throw new Error("Invalid page number: " + value);
            }

            pages.add(page);
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
}

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
