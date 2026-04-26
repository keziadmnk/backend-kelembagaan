const express = require("express");
const router = express.Router();
const pengajuanController = require("../controllers/pengajuanController");
const multer = require("multer");
const { buildObjectName, uploadBufferToMinio } = require("../utils/minioUpload");

const uploadRekomendasi = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB
    fileFilter: (req, file, cb) => {
        const allowed = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("File harus berformat PDF atau Word (.doc, .docx)"), false);
        }
    },
});

const uploadRekomendasiToMinio = async (file) => {
    const objectName = buildObjectName({
        folder: "rekomendasi",
        fileName: file.originalname,
        suffix: Math.round(Math.random() * 1e9),
    });

    return uploadBufferToMinio({ file, objectName });
};

// Middleware: upload ke MinIO lalu taruh key di req.minioKey
const handleRekomendasiUpload = async (req, res, next) => {
    try {
        if (!req.file) return next();
        const objectName = await uploadRekomendasiToMinio(req.file);
        req.minioKey = objectName;
        next();
    } catch (err) {
        console.error("MinIO upload error:", err);
        res.status(500).json({ success: false, message: "Gagal mengupload file ke MinIO", error: err.message });
    }
};

router.get("/modul-layanan", pengajuanController.getAllModulLayanan);
router.get("/persyaratan/:id_modul", pengajuanController.getPersyaratanByModul);

router.get("/user/:id_user", pengajuanController.getPengajuanByUser);

router.post("/create", pengajuanController.createPengajuan);

router.get("/all", pengajuanController.getAllPengajuan);
router.get("/status/:status", pengajuanController.getPengajuanByStatus);
router.put("/update/:id_pengajuan", pengajuanController.updatePengajuanStatus);

router.get("/dokumen/:id_pengajuan", pengajuanController.getDokumenByPengajuan);

router.get("/catatan-revisi/:id_pengajuan", pengajuanController.getCatatanRevisi);

router.get("/:id", pengajuanController.getPengajuanById);

router.put("/revisi/:id", pengajuanController.submitRevisi);

router.post(
    "/selesaikan/:id",
    uploadRekomendasi.single("file_rekomendasi"),
    handleRekomendasiUpload,
    pengajuanController.selesaikanPengajuan
);

module.exports = router;
