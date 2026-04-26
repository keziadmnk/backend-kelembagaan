const { LogProses, BuktiDukungProses, Proses, Pengajuan } = require('../models/relation');
const { createNotifikasi } = require('./notifikasiController');
const sequelize = require('../config/database');
const { buildObjectName, decodeOriginalName, uploadBufferToMinio } = require('../utils/minioUpload');

// Upload satu file buffer ke MinIO, return object key
const uploadBuktiToMinio = async (file) => {
    const objectName = buildObjectName({
        folder: 'bukti-proses',
        fileName: file.originalname,
        suffix: Math.round(Math.random() * 1e6)
    });
    return uploadBufferToMinio({ file, objectName });
};

const getAllProses = async (req, res) => {
    try {
        const proses = await Proses.findAll({ order: [['id_proses', 'ASC']] });
        res.json({ success: true, data: proses });
    } catch (error) {
        console.error('Error get proses:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data proses' });
    }
};

const getLogByPengajuan = async (req, res) => {
    try {
        const { id_pengajuan } = req.params;
        const logs = await LogProses.findAll({
            where: { id_pengajuan },
            include: [
                { model: Proses, as: 'proses', attributes: ['id_proses', 'nama_proses'] },
                { model: BuktiDukungProses, as: 'bukti_dukung' }
            ],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Error get log proses:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil log proses' });
    }
};

const addLogProses = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id_pengajuan } = req.params;
        const { id_proses, keterangan, is_mundur } = req.body;
        const files = req.files;

        if (!id_proses) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'id_proses wajib diisi' });
        }
        const isMundur = is_mundur === 'true' || is_mundur === true;

        const pengajuan = await Pengajuan.findByPk(id_pengajuan, { transaction: t });
        if (!pengajuan) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
        }
        if (pengajuan.status_verifikasi !== 'Disetujui') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Pengajuan belum disetujui' });
        }

        const proses = await Proses.findByPk(id_proses, { transaction: t });
        if (!proses) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Proses tidak ditemukan' });
        }

        const log = await LogProses.create({
            id_pengajuan,
            id_proses,
            keterangan: keterangan || null,
            created_at: new Date()
        }, { transaction: t });

        // Upload semua file bukti ke MinIO
        if (files && files.length > 0) {
            for (const file of files) {
                const objectName = await uploadBuktiToMinio(file);
                const originalName = decodeOriginalName(file.originalname);
                await BuktiDukungProses.create({
                    id_log: log.id_log,
                    nama_file: originalName,
                    file_path: `/minio/${objectName}`,
                    uploaded_at: new Date()
                }, { transaction: t });
            }
        }

        await t.commit();

        try {
            await createNotifikasi(
                pengajuan.id_user,
                parseInt(id_pengajuan),
                'Update Proses Pengajuan',
                `Pengajuan Anda telah memasuki tahap: ${proses.nama_proses}`,
                'perubahan_status'
            );
        } catch (notifErr) {
            console.error('Notif error:', notifErr);
        }

        const created = await LogProses.findByPk(log.id_log, {
            include: [
                { model: Proses, as: 'proses' },
                { model: BuktiDukungProses, as: 'bukti_dukung' }
            ]
        });

        res.status(201).json({ success: true, message: 'Log proses berhasil ditambahkan', data: created });
    } catch (error) {
        await t.rollback();
        console.error('Error add log proses:', error);
        res.status(500).json({ success: false, message: 'Gagal menambahkan log proses', error: error.message });
    }
};

module.exports = { getAllProses, getLogByPengajuan, addLogProses };
