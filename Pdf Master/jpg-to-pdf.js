
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const fileList = document.getElementById("fileList");
const convertBtn = document.getElementById("convertBtn");
const clearBtn = document.getElementById("clearBtn");
const message = document.getElementById("message");

let selectedImages = [];

const MAX_FILES = 50;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;

// Open file selector
uploadArea.addEventListener("click", () => {
    fileInput.click();
});

// File selection
fileInput.addEventListener("change", event => {
    addImages(Array.from(event.target.files));
    fileInput.value = "";
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

    addImages(Array.from(event.dataTransfer.files));
});

// Add images
function addImages(files) {
    message.textContent = "";

    for (const file of files) {
        const validType = [
            "image/jpeg",
            "image/png"
        ].includes(file.type);

        if (!validType) {
            message.textContent =
                `${file.name}: Only JPG and PNG images are supported.`;
            continue;
        }

        if (file.size > MAX_FILE_SIZE) {
            message.textContent =
                `${file.name}: Maximum image size is 15 MB.`;
            continue;
        }

        if (selectedImages.length >= MAX_FILES) {
            message.textContent =
                `Maximum ${MAX_FILES} images allowed.`;
            break;
        }

        const currentTotal = selectedImages.reduce(
            (sum, item) => sum + item.size,
            0
        );

        if (currentTotal + file.size > MAX_TOTAL_SIZE) {
            message.textContent =
                "Total image size cannot exceed 100 MB.";
            break;
        }

        selectedImages.push(file);
    }

    renderFileList();
}

// Display selected images
function renderFileList() {
    fileList.innerHTML = "";

    selectedImages.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "file-item";

        const name = document.createElement("span");
        name.textContent =
            `${index + 1}. ${file.name} (${formatSize(file.size)})`;

        const removeButton = document.createElement("button");
        removeButton.className = "remove-image";
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", () => {
            selectedImages.splice(index, 1);
            renderFileList();
            message.textContent = "Image removed.";
        });

        item.appendChild(name);
        item.appendChild(removeButton);

        fileList.appendChild(item);
    });

    convertBtn.disabled = selectedImages.length === 0;
}

// Clear all images
clearBtn.addEventListener("click", () => {
    selectedImages = [];
    renderFileList();
    message.textContent = "All images cleared.";
});

// Convert images to PDF
convertBtn.addEventListener("click", async () => {
    if (selectedImages.length === 0) {
        message.textContent = "Please select images first.";
        return;
    }

    convertBtn.disabled = true;
    clearBtn.disabled = true;

    try {
        const pdf = await PDFLib.PDFDocument.create();

        for (let i = 0; i < selectedImages.length; i++) {
            const file = selectedImages[i];

            message.textContent =
                `Adding image ${i + 1} of ${selectedImages.length}...`;

            const imageBytes = await file.arrayBuffer();

            let image;

            if (file.type === "image/jpeg") {
                image = await pdf.embedJpg(imageBytes);
            } else {
                image = await pdf.embedPng(imageBytes);
            }

            const page = pdf.addPage([
                image.width,
                image.height
            ]);

            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height
            });
        }

        message.textContent = "Creating PDF...";

        const pdfBytes = await pdf.save();

        const blob = new Blob([pdfBytes], {
            type: "application/pdf"
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "PDFMaster_Images.pdf";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        message.textContent =
            `Success! PDF created with ${selectedImages.length} pages.`;

    } catch (error) {
        console.error(error);

        message.textContent =
            error.message || "Unable to create PDF.";

    } finally {
        convertBtn.disabled = selectedImages.length === 0;
        clearBtn.disabled = false;
    }
});

// Format file size
function formatSize(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
