
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const fileInfo = document.getElementById("fileInfo");
const addNumbersBtn = document.getElementById("addNumbersBtn");
const removeFileBtn = document.getElementById("removeFileBtn");
const message = document.getElementById("message");

const positionSelect = document.getElementById("position");
const startNumberInput = document.getElementById("startNumber");
const fontSizeSelect = document.getElementById("fontSize");

let selectedFile = null;

const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Escape filename before displaying it in HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// Display messages
function showMessage(text, color = "black") {
    message.textContent = text;
    message.style.color = color;
}

// Select PDF
fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
        handleFile(this.files[0]);
    }
});

// Upload area click
uploadArea.addEventListener("click", function () {
    fileInput.click();
});

// Drag and drop
uploadArea.addEventListener("dragover", function (event) {
    event.preventDefault();
    uploadArea.style.background = "#eee5ff";
});

uploadArea.addEventListener("dragleave", function () {
    uploadArea.style.background = "#faf8ff";
});

uploadArea.addEventListener("drop", function (event) {
    event.preventDefault();
    uploadArea.style.background = "#faf8ff";

    const file = event.dataTransfer.files[0];

    if (file) {
        handleFile(file);
    }
});

// Handle selected PDF
function handleFile(file) {
    if (file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")) {
        showMessage("Please select a valid PDF file.", "red");
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showMessage("File size must not exceed 50 MB.", "red");
        return;
    }

    selectedFile = file;

    fileInfo.innerHTML = `
        <strong>Selected PDF:</strong>
        ${escapeHTML(file.name)}
        <br>
        <strong>Size:</strong>
        ${(file.size / (1024 * 1024)).toFixed(2)} MB
    `;

    fileInfo.style.display = "block";
    addNumbersBtn.disabled = false;
    removeFileBtn.style.display = "inline-block";

    showMessage("PDF uploaded successfully.", "green");
}

// Remove PDF
removeFileBtn.addEventListener("click", function () {
    selectedFile = null;
    fileInput.value = "";

    fileInfo.innerHTML = "";
    fileInfo.style.display = "none";

    addNumbersBtn.disabled = true;
    removeFileBtn.style.display = "none";

    showMessage("PDF removed.");
});

// Add page numbers
addNumbersBtn.addEventListener("click", async function () {
    if (!selectedFile) {
        showMessage("Please upload a PDF first.", "red");
        return;
    }

    const startNumber = Number(startNumberInput.value);
    const fontSize = Number(fontSizeSelect.value);
    const position = positionSelect.value;

    if (!Number.isInteger(startNumber) || startNumber < 1) {
        showMessage("Starting number must be a positive whole number.", "red");
        return;
    }

    addNumbersBtn.disabled = true;
    showMessage("Adding page numbers. Please wait...", "#6d28d9");

    try {
        const { PDFDocument, StandardFonts, rgb } = PDFLib;

        const bytes = await selectedFile.arrayBuffer();

        const pdfDoc = await PDFDocument.load(bytes);

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const pages = pdfDoc.getPages();

        pages.forEach((page, index) => {
            const { width, height } = page.getSize();

            const pageNumber = String(startNumber + index);

            const textWidth = font.widthOfTextAtSize(
                pageNumber,
                fontSize
            );

            const margin = 30;

            let x;
            let y;

            // Horizontal alignment
            if (position.includes("left")) {
                x = margin;
            } else if (position.includes("right")) {
                x = width - margin - textWidth;
            } else {
                x = (width - textWidth) / 2;
            }

            // Vertical position
            if (position.startsWith("top")) {
                y = height - margin - fontSize;
            } else {
                y = margin;
            }

            // Keep text inside the page
            x = Math.max(5, Math.min(x, width - textWidth - 5));
            y = Math.max(5, Math.min(y, height - fontSize - 5));

            page.drawText(pageNumber, {
                x,
                y,
                size: fontSize,
                font,
                color: rgb(0, 0, 0)
            });
        });

        const pdfBytes = await pdfDoc.save();

        const blob = new Blob([pdfBytes], {
            type: "application/pdf"
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = "PDFMaster_Page_Numbers.pdf";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        showMessage(
            `Success! Page numbers added to ${pages.length} pages.`,
            "green"
        );

    } catch (error) {
        console.error(error);

        showMessage(
            "Could not process this PDF. Please try another PDF.",
            "red"
        );

    } finally {
        addNumbersBtn.disabled = !selectedFile;
    }
});
