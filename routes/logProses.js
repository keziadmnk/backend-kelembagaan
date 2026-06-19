const express = require('express');
const router = express.Router();
const multer = require('multer');
const minioClient = require('../config/minio');
const path = require('path');
const { getAllProses, getLogByPengajuan, addLogProses } = require('../controllers/logProsesController');
const { authenticate, isAdmin } = require('../middleware/auth');
const { Pengajuan } = require('../models/relation');

const BUCKET = process.env.MINIO_BUCKET || 'layanan-kelembagaan-files';

const uploadBukti = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // Max 20MB
});

const ensurePengajuanAccess = async (req, res, next) => {
    try {
        const pengajuan = await Pengajuan.findByPk(req.params.id_pengajuan);
        if (!pengajuan) return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
        if (req.user.role === 'admin' || Number(pengajuan.id_user) === Number(req.user.id)) return next();
        return res.status(403).json({ success: false, message: 'Akses ditolak untuk pengajuan ini' });
    } catch (error) {
        console.error('Error checking proses access:', error);
        return res.status(500).json({ success: false, message: 'Gagal memeriksa akses pengajuan' });
    }
};

router.get('/proses', authenticate, getAllProses);
router.get('/log/:id_pengajuan', authenticate, ensurePengajuanAccess, getLogByPengajuan);
router.post('/log/:id_pengajuan', authenticate, isAdmin, uploadBukti.array('bukti'), addLogProses);

router.get('/download', authenticate, async (req, res) => {
    const objectName = req.query.path;
    if (!objectName) {
        return res.status(400).json({ success: false, message: 'Parameter path wajib diisi' });
    }
    const cleanObject = objectName.replace(/^\/minio\//, '');
    console.log(`[MinIO Download] bucket=${BUCKET} object=${cleanObject}`);
    try {
        const ext = path.extname(cleanObject).toLowerCase();
        const contentTypeMap = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        };
        const contentType = contentTypeMap[ext] || 'application/octet-stream';
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(cleanObject)}"`);
        res.setHeader('Content-Type', contentType);
        const stream = await minioClient.getObject(BUCKET, cleanObject);
        stream.on('error', (err) => {
            console.error('[MinIO Download] stream error:', err.message);
            if (!res.headersSent) res.status(404).json({ success: false, message: 'File tidak ditemukan' });
        });
        stream.pipe(res);
    } catch (err) {
        console.error('[MinIO Download] getObject error:', err.message);
        res.status(404).json({ success: false, message: 'File tidak ditemukan' });
    }
});

module.exports = router;
