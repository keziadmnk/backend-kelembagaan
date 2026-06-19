const express = require("express");
const router = express.Router();
const pengajuanController = require("../controllers/pengajuanController");
const multer = require("multer");
const { buildObjectName, uploadBufferToMinio } = require("../utils/minioUpload");
const { authenticate, isAdmin, isPemohon } = require("../middleware/auth");
const { Pengajuan } = require("../models/relation");

const uploadRekomendasi = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
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

const ensureOwnUserOrAdmin = (paramName = "id_user") => (req, res, next) => {
    if (req.user.role === "admin" || Number(req.params[paramName]) === Number(req.user.id)) return next();
    return res.status(403).json({ success: false, message: "Akses ditolak untuk data pengguna lain" });
};

const ensurePengajuanAccess = (paramName = "id") => async (req, res, next) => {
    try {
        const pengajuan = await Pengajuan.findByPk(req.params[paramName]);
        if (!pengajuan) return res.status(404).json({ success: false, message: "Pengajuan tidak ditemukan" });
        if (req.user.role === "admin" || Number(pengajuan.id_user) === Number(req.user.id)) {
            req.pengajuan = pengajuan;
            return next();
        }
        return res.status(403).json({ success: false, message: "Akses ditolak untuk pengajuan ini" });
    } catch (error) {
        console.error("Error checking pengajuan access:", error);
        return res.status(500).json({ success: false, message: "Gagal memeriksa akses pengajuan" });
    }
};

router.get("/modul-layanan", pengajuanController.getAllModulLayanan);
router.get("/persyaratan/:id_modul", pengajuanController.getPersyaratanByModul);

router.get("/user/:id_user", authenticate, ensureOwnUserOrAdmin("id_user"), pengajuanController.getPengajuanByUser);
router.post("/create", authenticate, isPemohon, pengajuanController.createPengajuan);

router.get("/all", authenticate, isAdmin, pengajuanController.getAllPengajuan);
router.get("/status/:status", authenticate, isAdmin, pengajuanController.getPengajuanByStatus);
router.put("/update/:id_pengajuan", authenticate, isAdmin, pengajuanController.updatePengajuanStatus);

router.get("/dokumen/:id_pengajuan", authenticate, ensurePengajuanAccess("id_pengajuan"), pengajuanController.getDokumenByPengajuan);
router.get("/catatan-revisi/:id_pengajuan", authenticate, ensurePengajuanAccess("id_pengajuan"), pengajuanController.getCatatanRevisi);
router.get("/:id", authenticate, ensurePengajuanAccess("id"), pengajuanController.getPengajuanById);
router.put("/revisi/:id", authenticate, isPemohon, ensurePengajuanAccess("id"), pengajuanController.submitRevisi);

router.post(
    "/selesaikan/:id",
    authenticate,
    isAdmin,
    uploadRekomendasi.single("file_rekomendasi"),
    handleRekomendasiUpload,
    pengajuanController.selesaikanPengajuan
);

module.exports = router;
