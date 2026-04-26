const express = require("express");
const router = express.Router();
const upload = require("../config/upload");
const { buildObjectName, decodeOriginalName, uploadBufferToMinio } = require("../utils/minioUpload");

router.post("/single", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Tidak ada file yang diupload",
            });
        }

        const objectName = await uploadBufferToMinio({
            file: req.file,
            objectName: buildObjectName({
                folder: "documents",
                fileName: req.file.originalname,
            }),
        });
        const fileUrl = `/minio/${objectName}`;

        res.status(200).json({
            success: true,
            message: "File berhasil diupload",
            data: {
                id_persyaratan: req.body.id_persyaratan,
                nama_file: decodeOriginalName(req.file.originalname),
                path_file: fileUrl,
                size: req.file.size,
                mimetype: req.file.mimetype,
            },
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({
            success: false,
            message: "Gagal mengupload file",
            error: error.message,
        });
    }
});

router.post("/multiple", upload.array("files", 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Tidak ada file yang diupload",
            });
        }

        const uploadedFiles = await Promise.all(
            req.files.map(async (file) => {
                const objectName = await uploadBufferToMinio({
                    file,
                    objectName: buildObjectName({
                        folder: "documents",
                        fileName: file.originalname,
                    }),
                });
                return {
                    nama_file: decodeOriginalName(file.originalname),
                    path_file: `/minio/${objectName}`,
                    size: file.size,
                    mimetype: file.mimetype,
                };
            })
        );

        res.status(200).json({
            success: true,
            message: `${req.files.length} file berhasil diupload`,
            data: uploadedFiles,
        });
    } catch (error) {
        console.error("Error uploading files:", error);
        res.status(500).json({
            success: false,
            message: "Gagal mengupload files",
            error: error.message,
        });
    }
});

module.exports = router;
