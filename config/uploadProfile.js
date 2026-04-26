const multer = require("multer");

const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp"
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Format file tidak didukung. Hanya JPG, PNG, GIF, dan WEBP yang diperbolehkan."
            ),
            false
        );
    }
};

const uploadProfile = multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // Max 2MB
    },
});

module.exports = uploadProfile;
