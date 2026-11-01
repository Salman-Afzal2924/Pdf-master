
let selectedFile = null;

const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const fileInfo = document.getElementById("fileInfo");
const pageRange = document.getElementById("pageRange");
const extractBtn = document.getElementById("extractBtn");
const removeFileBtn = document.getElementById("removeFileBtn");
const message = document.getElementById("message");

let totalPages = 0;

// Open file selector
uploadArea.addEventListener("click", () => {
    fileInput.click();
});

// Select PDF
fileInput.addEventListener("change", (event) => {
    handleFile(event.target.files[0]);
});

// Drag and drop
uploadArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadArea.style.background = "#eee5ff";
});

uploadArea.addEventListener("dragleave", () => {
    uploadArea.style.background = "#faf8ff";
});

uploadArea.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadArea.style.background = "#faf8ff";

    const file = event.dataTransfer.files[0];
    handleFile(file);
});

// Handle selected file
async function handleFile(file) {
    message.textContent = "";

    if (!file) return;

    if (file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")) {
        message.textContent = "Please select a valid PDF file.";
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        message.textContent = "File size must be below 50 MB.";
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
            Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB<br>
            Total Pages: ${totalPages}
        `;

        removeFileBtn.style.display = "inline-block";
        extractBtn.disabled = false;

        message.textContent = "PDF uploaded successfully.";

    } catch (error) {
        resetFile();
        message.textContent = "Unable to read this PDF. Please try another file.";
    }
}

// Remove selected PDF
removeFileBtn.addEventListener("click", () => {
    resetFile();
    message.textContent = "PDF removed successfully.";
});

// Reset file information
function resetFile() {
    selectedFile = null;
    totalPages = 0;

    fileInput.value = "";
    pageRange.value = "";

    fileInfo.style.display = "none";
    fileInfo.innerHTML = "";

    removeFileBtn.style.display = "none";
    extractBtn.disabled = true;
}

// Extract selected pages
extractBtn.addEventListener("click", async () => {
    if (!selectedFile) {
        message.textContent = "Please upload a PDF first.";
        return;
    }

    const rangeText = pageRange.value.trim();

    if (!rangeText) {
        message.textContent = "Please enter the page numbers.";
        return;
    }

    try {
        const selectedPages = parsePageRanges(rangeText, totalPages);

        if (selectedPages.length === 0) {
            message.textContent = "No valid pages selected.";
            return;
        }

        extractBtn.disabled = true;
        message.textContent = "Extracting pages... Please wait.";

        const bytes = await selectedFile.arrayBuffer();

        const originalPDF = await PDFLib.PDFDocument.load(bytes);
        const newPDF = await PDFLib.PDFDocument.create();

        const zeroBasedPages = selectedPages.map(page => page - 1);

        const copiedPages = await newPDF.copyPages(
            originalPDF,
            zeroBasedPages
        );

        copiedPages.forEach(page => newPDF.addPage(page));

        const pdfBytes = await newPDF.save();

        const blob = new Blob([pdfBytes], {
            type: "application/pdf"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "PDFMaster_Extracted.pdf";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        message.textContent =
            `Success! ${selectedPages.length} pages extracted.`;

    } catch (error) {
        message.textContent = error.message ||
            "Something went wrong while extracting pages.";
    } finally {
        extractBtn.disabled = !selectedFile;
    }
});

// Convert page ranges into page numbers
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

// Prevent HTML injection through filenames
function escapeHTML(text) {
    return text.replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}
