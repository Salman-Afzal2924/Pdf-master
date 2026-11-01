
const pdfInput = document.getElementById("pdfInput");
const uploadArea = document.getElementById("uploadArea");
const browseButton = document.getElementById("browseButton");
const fileList = document.getElementById("fileList");
const mergeButton = document.getElementById("mergeButton");
const statusMessage = document.getElementById("statusMessage");

let selectedFiles = [];

const MAX_FILES = 30;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_TOTAL_SIZE = 200 * 1024 * 1024;


// Open file picker
browseButton.addEventListener("click", (event) => {
    event.stopPropagation();
    pdfInput.click();
});

uploadArea.addEventListener("click", () => {
    pdfInput.click();
});


// Select files
pdfInput.addEventListener("change", (event) => {
    addFiles(event.target.files);
    pdfInput.value = "";
});


// Drag and drop
uploadArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadArea.classList.remove("dragover");

    addFiles(event.dataTransfer.files);
});


// Add PDF files
function addFiles(files) {

    const incoming = Array.from(files);

    for (const file of incoming) {

        if (
            file.type !== "application/pdf" &&
            !file.name.toLowerCase().endsWith(".pdf")
        ) {
            showStatus(
                `${file.name} is not a PDF file.`,
                true
            );
            continue;
        }

        if (file.size === 0 || file.size > MAX_FILE_SIZE) {
            showStatus(
                `${file.name} must be between 1 byte and 50 MB.`,
                true
            );
            continue;
        }

        if (
            selectedFiles.some(
                existing => existing.name === file.name &&
                existing.size === file.size &&
                existing.lastModified === file.lastModified
            )
        ) {
            continue;
        }

        if (selectedFiles.length >= MAX_FILES) {
            showStatus("Maximum 30 PDF files allowed.", true);
            break;
        }

        const totalSize = selectedFiles.reduce(
            (sum, item) => sum + item.size,
            0
        );

        if (totalSize + file.size > MAX_TOTAL_SIZE) {
            showStatus("Total upload size cannot exceed 200 MB.", true);
            break;
        }

        selectedFiles.push(file);
    }

    renderFiles();
}


// Display uploaded files
function renderFiles() {

    fileList.innerHTML = "";

    selectedFiles.forEach((file, index) => {

        const item = document.createElement("div");
        item.className = "file-item";

        const info = document.createElement("div");
        info.className = "file-info";

        const name = document.createElement("strong");
        name.textContent = file.name;

        const size = document.createElement("small");
        size.textContent = formatSize(file.size);

        info.appendChild(name);
        info.appendChild(size);

        const removeButton = document.createElement("button");
        removeButton.className = "remove-btn";
        removeButton.textContent = "Remove";
        removeButton.type = "button";

        removeButton.addEventListener("click", () => {
            selectedFiles.splice(index, 1);
            renderFiles();
            showStatus("File removed.");
        });

        item.appendChild(info);
        item.appendChild(removeButton);

        fileList.appendChild(item);
    });

    mergeButton.disabled = selectedFiles.length < 2;
}


// Format file size
function formatSize(bytes) {

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


// Status messages
function showStatus(message, error = false) {

    statusMessage.textContent = message;

    statusMessage.style.color = error
        ? "#e45151"
        : "#23a66d";
}


// Merge PDF files
mergeButton.addEventListener("click", async () => {

    if (selectedFiles.length < 2) {
        showStatus("Please select at least two PDF files.", true);
        return;
    }

    if (!window.PDFLib) {
        showStatus("PDF library failed to load. Check your internet connection.", true);
        return;
    }

    mergeButton.disabled = true;
    mergeButton.textContent = "Merging...";
    showStatus("Please wait. Combining your PDF files...");

    try {

        const mergedPdf = await PDFLib.PDFDocument.create();

        for (const file of selectedFiles) {

            const fileBytes = await file.arrayBuffer();

            const pdf = await PDFLib.PDFDocument.load(
                fileBytes,
                { ignoreEncryption: false }
            );

            const pages = await mergedPdf.copyPages(
                pdf,
                pdf.getPageIndices()
            );

            pages.forEach(page => {
                mergedPdf.addPage(page);
            });
        }

        const mergedBytes = await mergedPdf.save();

        const blob = new Blob(
            [mergedBytes],
            { type: "application/pdf" }
        );

        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement("a");

        downloadLink.href = url;
        downloadLink.download = "PDFMaster_Merged.pdf";

        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();

        setTimeout(() => URL.revokeObjectURL(url), 60000);

        showStatus("Success! Your merged PDF has been downloaded.");

    } catch (error) {

        console.error(error);

        showStatus(
            "Unable to merge these PDFs. Check whether they are valid and not password-protected.",
            true
        );

    } finally {

        mergeButton.disabled = selectedFiles.length < 2;
        mergeButton.textContent = "Merge PDF Files";

    }

});
