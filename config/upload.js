const multer = require("multer");
const path = require("path");

const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const allowedExts = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Format file tidak didukung. Hanya PDF, DOC, DOCX, XLS, XLSX yang diperbolehkan."
            ),
            false
        );
    }
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // Max 10MB
    },
});

module.exports = upload;
