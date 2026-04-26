const {
    Pengajuan,
    ModulLayanan,
    PersyaratanDokumen,
    Dokumen,
} = require("../models/relation");
const sequelize = require("../config/database");
const { createNotifikasi } = require("./notifikasiController");

const PROGRESS_MAP = {
    'Penjadwalan Rapat': 20,
    'Pelaksanaan Rapat Fasilitasi': 40,
    'Penyusunan Draft Rekomendasi/Hasil Fasilitasi': 60,
    'Proses Penandatanganan': 80,
};

const hitungProgress = (item) => {
    if (item.status_verifikasi === 'Selesai') return 100;
    if (item.status_verifikasi === 'Disetujui') {
        const logs = item.log_proses || [];
        if (logs.length > 0) {
            const latest = logs.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b);
            return PROGRESS_MAP[latest.proses?.nama_proses] ?? 20;
        }
        return 20;
    }
    return 0;
};


const generateNomorRegistrasi = async (id_modul) => {
    try {
        const modul = await ModulLayanan.findByPk(id_modul);
        if (!modul) {
            throw new Error("Modul tidak ditemukan");
        }


        const kodeModul = modul.nama_modul
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .substring(0, 3);


        const now = new Date();
        const tahun = now.getFullYear();
        const bulan = String(now.getMonth() + 1).padStart(2, "0");


        const count = await Pengajuan.count({
            where: {
                id_modul: id_modul,
            },
        });


        const urutan = String(count + 1).padStart(4, "0");
        const nomorRegistrasi = `${kodeModul}-${tahun}${bulan}-${urutan}`;

        return nomorRegistrasi;
    } catch (error) {
        console.error("Error generating nomor registrasi:", error);
        throw error;
    }
};


const getAllModulLayanan = async (req, res) => {
    try {
        const modulLayanan = await ModulLayanan.findAll({
            attributes: ["id_modul", "nama_modul", "deskripsi"],
            order: [["id_modul", "ASC"]],
        });

        res.status(200).json({
            success: true,
            data: modulLayanan,
        });
    } catch (error) {
        console.error("Error fetching modul layanan:", error);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil data modul layanan",
            error: error.message,
        });
    }
};


const getPersyaratanByModul = async (req, res) => {
    try {
        const { id_modul } = req.params;


        const modul = await ModulLayanan.findByPk(id_modul);
        if (!modul) {
            return res.status(404).json({
                success: false,
                message: "Modul layanan tidak ditemukan",
            });
        }


        const persyaratan = await PersyaratanDokumen.findAll({
            where: {
                id_modul: id_modul,
            },
            attributes: [
                "id_persyaratan",
                "nama_dokumen",
                "format_file",
                "is_required",
            ],
            order: [
                ["is_required", "DESC"],
                ["nama_dokumen", "ASC"],
            ],
        });

        res.status(200).json({
            success: true,
            data: {
                modul: {
                    id_modul: modul.id_modul,
                    nama_modul: modul.nama_modul,
                    deskripsi: modul.deskripsi,
                },
                persyaratan: persyaratan,
            },
        });
    } catch (error) {
        console.error("Error fetching persyaratan dokumen:", error);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil data persyaratan dokumen",
            error: error.message,
        });
    }
};


const createPengajuan = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const {
            id_user,
            id_modul,
            nama_kabupaten,
            catatan_pemohon,
            dokumen_upload,
        } = req.body;

        console.log("Creating pengajuan with data:", {
            id_user,
            id_modul,
            nama_kabupaten,
            dokumen_count: dokumen_upload?.length || 0,
        });


        if (!id_user || !id_modul) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "id_user dan id_modul harus diisi",
            });
        }

        const modul = await ModulLayanan.findByPk(id_modul);
        if (!modul) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: "Modul layanan tidak ditemukan",
            });
        }

        const persyaratanWajib = await PersyaratanDokumen.findAll({
            where: {
                id_modul: id_modul,
                is_required: true,
            },
        });

        if (dokumen_upload && dokumen_upload.length > 0) {
            const uploadedPersyaratanIds = dokumen_upload.map(
                (dok) => dok.id_persyaratan
            );

            const missingDokumen = persyaratanWajib.filter(
                (persyaratan) =>
                    !uploadedPersyaratanIds.includes(persyaratan.id_persyaratan)
            );

            if (missingDokumen.length > 0) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Semua dokumen wajib harus diupload",
                    missing_documents: missingDokumen.map((dok) => dok.nama_dokumen),
                });
            }
        } else if (persyaratanWajib.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Tidak ada dokumen yang diupload. Harap upload dokumen wajib.",
            });
        }


        const nomorRegistrasi = await generateNomorRegistrasi(id_modul);
        console.log("Generated nomor registrasi:", nomorRegistrasi);


        const pengajuan = await Pengajuan.create(
            {
                nomor_registrasi: nomorRegistrasi,
                id_user: id_user,
                id_modul: id_modul,
                tanggal_pengajuan: new Date(),
                status_verifikasi: "Menunggu Verifikasi",
                catatan_pemohon: catatan_pemohon || null,
                created_at: new Date(),
            },
            { transaction: t }
        );

        console.log("Pengajuan created with ID:", pengajuan.id_pengajuan);


        const dokumenSaved = [];
        if (dokumen_upload && dokumen_upload.length > 0) {
            for (const dok of dokumen_upload) {
                const dokumenBaru = await Dokumen.create(
                    {
                        id_pengajuan: pengajuan.id_pengajuan,
                        id_persyaratan: dok.id_persyaratan,
                        nama_file: dok.nama_file,
                        path_file: dok.path_file,
                        jenis_dokumen: dok.jenis_dokumen || null,
                        created_at: new Date(),
                    },
                    { transaction: t }
                );
                dokumenSaved.push(dokumenBaru);
            }
            console.log(`Saved ${dokumenSaved.length} dokumen`);
        }


        await t.commit();

        const pengajuanLengkap = await Pengajuan.findByPk(
            pengajuan.id_pengajuan,
            {
                include: [
                    {
                        model: ModulLayanan,
                        as: "modul",
                        attributes: ["id_modul", "nama_modul", "deskripsi"],
                    },
                    {
                        model: Dokumen,
                        as: "dokumen",
                        include: [
                            {
                                model: PersyaratanDokumen,
                                as: "persyaratan",
                                attributes: ["nama_dokumen", "format_file"],
                            },
                        ],
                    },
                ],
            }
        );


        try {
            const User = require("../models/User");
            const admins = await User.findAll({
                where: { role: 'admin' }
            });

            for (const admin of admins) {
                await createNotifikasi(
                    admin.id,
                    pengajuan.id_pengajuan,
                    'Pengajuan Baru',
                    `Pengajuan baru dari ${nama_kabupaten} untuk layanan ${modul.nama_modul}`,
                    'pengajuan_baru'
                );
            }
            console.log(`Created notifications for ${admins.length} admins`);
        } catch (notifError) {
            console.error("Error creating notifications:", notifError);

        }

        res.status(201).json({
            success: true,
            message: "Pengajuan berhasil dibuat",
            data: pengajuanLengkap,
        });
    } catch (error) {
        await t.rollback();
        console.error("Error creating pengajuan:", error);
        res.status(500).json({
            success: false,
            message: "Gagal membuat pengajuan",
            error: error.message,
        });
    }
};

const getPengajuanByUser = async (req, res) => {
    try {
        const { id_user } = req.params;
        const { LogProses, Proses } = require('../models/relation');

        const pengajuanList = await Pengajuan.findAll({
            where: { id_user },
            include: [
                { model: ModulLayanan, as: 'modul', attributes: ['nama_modul'] },
                {
                    model: LogProses,
                    as: 'log_proses',
                    include: [{ model: Proses, as: 'proses', attributes: ['nama_proses'] }],
                    required: false
                }
            ],
            order: [['created_at', 'DESC']]
        });

        const convertToUrlPath = (p) => {
            if (!p) return null;
            return p.startsWith('/') ? p : '/' + p.replace(/\\/g, '/');
        };

        const getStatusTampil = (item) => {
            if (item.status_verifikasi === 'Disetujui') {
                const logs = item.log_proses || [];
                if (logs.length > 0) {
                    const latest = logs.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b);
                    return latest.proses?.nama_proses || item.status_verifikasi;
                }
            }
            return item.status_verifikasi === 'Diajukan' ? 'Menunggu Verifikasi' : item.status_verifikasi;
        };

        const data = pengajuanList.map((item, index) => ({
            no: index + 1,
            id_pengajuan: item.id_pengajuan,
            id_modul: item.id_modul,
            nomor_registrasi: item.nomor_registrasi,
            nama_layanan: item.modul?.nama_modul || 'Tidak diketahui',
            tanggal: item.tanggal_pengajuan,
            status_verifikasi: item.status_verifikasi,
            status: getStatusTampil(item),
            progress: hitungProgress(item),
            catatan_pemohon: item.catatan_pemohon,
            file_surat_rekomendasi: convertToUrlPath(item.file_surat_rekomendasi),
            tanggal_selesai: item.tanggal_selesai
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getPengajuanByUser:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil riwayat pengajuan', error: error.message });
    }
};


const getAllPengajuan = async (req, res) => {
    try {
        const User = require('../models/User');
        const { LogProses, Proses } = require('../models/relation');

        const pengajuanList = await Pengajuan.findAll({
            include: [
                { model: ModulLayanan, as: 'modul', attributes: ['nama_modul'] },
                { model: User, as: 'user', attributes: ['kabupaten_kota'] },
                {
                    model: LogProses,
                    as: 'log_proses',
                    include: [{ model: Proses, as: 'proses', attributes: ['nama_proses'] }],
                    required: false
                }
            ],
            order: [['created_at', 'DESC']]
        });

        const convertToUrlPath = (p) => {
            if (!p) return null;
            return p.startsWith('/') ? p : '/' + p.replace(/\\/g, '/');
        };

        const getStatusTampil = (item) => {
            if (item.status_verifikasi === 'Disetujui') {
                const logs = item.log_proses || [];
                if (logs.length > 0) {
                    const latest = logs.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b);
                    return latest.proses?.nama_proses || item.status_verifikasi;
                }
            }
            return item.status_verifikasi;
        };

        const data = pengajuanList.map((item, index) => ({
            no: index + 1,
            id_pengajuan: item.id_pengajuan,
            id_modul: item.id_modul,
            nomor_registrasi: item.nomor_registrasi,
            pemohon: item.user?.kabupaten_kota || 'Tidak diketahui',
            nama_layanan: item.modul?.nama_modul || 'Tidak diketahui',
            tanggal: item.tanggal_pengajuan,
            status_verifikasi: item.status_verifikasi,
            status: getStatusTampil(item),
            progress: hitungProgress(item),
            catatan_pemohon: item.catatan_pemohon,
            file_surat_rekomendasi: convertToUrlPath(item.file_surat_rekomendasi),
            tanggal_selesai: item.tanggal_selesai
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getAllPengajuan:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data pengajuan', error: error.message });
    }
};

const getPengajuanByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const User = require("../models/User");
        const { LogProses, Proses } = require('../models/relation');

        const pengajuan = await Pengajuan.findAll({
            where: { status_verifikasi: status },
            include: [
                { model: ModulLayanan, as: "modul", attributes: ["nama_modul"] },
                { model: User, as: "user", attributes: ["kabupaten_kota"] },
                {
                    model: LogProses,
                    as: 'log_proses',
                    include: [{ model: Proses, as: 'proses', attributes: ['nama_proses'] }],
                    required: false
                }
            ],
            order: [["created_at", "DESC"]]
        });

        const convertToUrlPath = (filePath) => {
            if (!filePath) return null;
            if (filePath.startsWith('/')) return filePath;
            return '/' + filePath.replace(/\\/g, '/');
        };

        const dataFormatted = pengajuan.map((item, index) => ({
            no: index + 1,
            id_pengajuan: item.id_pengajuan,
            id_modul: item.id_modul,
            nomor_registrasi: item.nomor_registrasi,
            pemohon: item.user ? item.user.kabupaten_kota : 'Tidak diketahui',
            nama_layanan: item.modul ? item.modul.nama_modul : 'Tidak diketahui',
            tanggal: item.tanggal_pengajuan,
            status_verifikasi: item.status_verifikasi,
            status: item.status_verifikasi,
            progress: hitungProgress(item),
            catatan_pemohon: item.catatan_pemohon,
            file_surat_rekomendasi: convertToUrlPath(item.file_surat_rekomendasi),
            tanggal_selesai: item.tanggal_selesai
        }));

        res.status(200).json({
            success: true,
            data: dataFormatted
        });
    } catch (error) {
        console.error("Error fetching pengajuan by status:", error);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil data pengajuan",
            error: error.message
        });
    }
};

const updatePengajuanStatus = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id_pengajuan } = req.params;
        const {
            status_verifikasi,
            catatan_revisi
        } = req.body;

        const { Pengajuan, CatatanRevisi, LogProses, Proses } = require('../models/relation');
        const pengajuan = await Pengajuan.findByPk(id_pengajuan, { transaction: t });

        if (!pengajuan) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan' });
        }

        const updateData = {
            status_verifikasi: status_verifikasi || pengajuan.status_verifikasi,
        };

        if (status_verifikasi === 'Disetujui') {
            updateData.verified_at = new Date();
        }

        await pengajuan.update(updateData, { transaction: t });
        if (status_verifikasi === 'Disetujui') {
            const prosesAwal = await Proses.findOne({
                where: { nama_proses: 'Penjadwalan Rapat' },
                transaction: t
            });
            if (prosesAwal) {
                await LogProses.create({
                    id_pengajuan: parseInt(id_pengajuan),
                    id_proses: prosesAwal.id_proses,
                    keterangan: 'Pengajuan diterima, menunggu penjadwalan rapat',
                    created_at: new Date()
                }, { transaction: t });
            }
        }

        if (catatan_revisi && status_verifikasi === 'Perlu Perbaikan') {
            await CatatanRevisi.create({
                id_pengajuan: parseInt(id_pengajuan),
                catatan: catatan_revisi,
                created_at: new Date()
            }, { transaction: t });
        }

        await t.commit();

        try {
            const pesanMap = {
                'Disetujui': `Pengajuan ${pengajuan.nomor_registrasi} telah disetujui dan masuk ke tahap Penjadwalan Rapat`,
                'Perlu Perbaikan': `Pengajuan ${pengajuan.nomor_registrasi} dikembalikan untuk perbaikan dokumen`,
            };
            await createNotifikasi(
                pengajuan.id_user,
                parseInt(id_pengajuan),
                'Perubahan Status Pengajuan',
                pesanMap[status_verifikasi] || `Status pengajuan diubah menjadi "${status_verifikasi}"`,
                'perubahan_status'
            );
        } catch (notifError) {
            console.error('Notif error:', notifError);
        }

        res.status(200).json({ success: true, message: 'Status pengajuan berhasil diupdate', data: pengajuan });
    } catch (error) {
        await t.rollback();
        console.error('Error updating pengajuan:', error);
        res.status(500).json({ success: false, message: 'Gagal mengupdate status pengajuan', error: error.message });
    }
};

const getDokumenByPengajuan = async (req, res) => {
    try {
        const { id_pengajuan } = req.params;
        const { Dokumen, PersyaratanDokumen } = require("../models/relation");

        const dokumen = await Dokumen.findAll({
            where: { id_pengajuan: id_pengajuan },
            include: [
                {
                    model: PersyaratanDokumen,
                    as: "persyaratan",
                    attributes: ["nama_dokumen", "format_file"]
                }
            ],
            order: [["created_at", "ASC"]]
        });

        res.status(200).json({
            success: true,
            data: dokumen
        });
    } catch (error) {
        console.error("Error fetching dokumen:", error);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil data dokumen",
            error: error.message
        });
    }
};

const getCatatanRevisi = async (req, res) => {
    try {
        const { id_pengajuan } = req.params;
        const { CatatanRevisi } = require("../models/relation");

        const catatanList = await CatatanRevisi.findAll({
            where: { id_pengajuan: id_pengajuan },
            order: [["created_at", "DESC"]]
        });

        res.status(200).json({
            success: true,
            data: catatanList
        });
    } catch (error) {
        console.error("Error fetching catatan revisi:", error);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil catatan revisi",
            error: error.message
        });
    }
};

const selesaikanPengajuan = async (req, res) => {
    try {
        const { id } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "File surat rekomendasi wajib diupload"
            });
        }

        // req.minioKey diset oleh middleware handleRekomendasiUpload di route
        if (!req.minioKey) {
            return res.status(500).json({
                success: false,
                message: "Gagal memproses file upload ke MinIO"
            });
        }

        const pengajuan = await Pengajuan.findByPk(id);
        if (!pengajuan) {
            return res.status(404).json({
                success: false,
                message: "Pengajuan tidak ditemukan"
            });
        }
        if (pengajuan.status_verifikasi !== 'Disetujui') {
            return res.status(400).json({
                success: false,
                message: "Pengajuan harus sudah disetujui dan dalam proses sebelum bisa diselesaikan"
            });
        }

        const filePath = `/minio/${req.minioKey}`;

        await pengajuan.update({
            status_verifikasi: 'Selesai',
            file_surat_rekomendasi: filePath,
            tanggal_selesai: new Date(),
        });

        res.status(200).json({
            success: true,
            message: "Pengajuan berhasil diselesaikan",
            data: {
                id_pengajuan: pengajuan.id_pengajuan,
                status_verifikasi: 'Selesai',
                file_surat_rekomendasi: pengajuan.file_surat_rekomendasi,
                tanggal_selesai: pengajuan.tanggal_selesai
            }
        });
    } catch (error) {
        console.error("Error selesaikan pengajuan:", error);
        res.status(500).json({
            success: false,
            message: "Gagal menyelesaikan pengajuan",
            error: error.message
        });
    }
};

const getPengajuanById = async (req, res) => {
    try {
        const { id } = req.params;

        const pengajuan = await Pengajuan.findByPk(id, {
            include: [
                {
                    model: ModulLayanan,
                    as: "modul",
                    attributes: ["id_modul", "nama_modul", "deskripsi"]
                }
            ]
        });

        if (!pengajuan) {
            return res.status(404).json({
                success: false,
                message: "Pengajuan tidak ditemukan"
            });
        }

        res.status(200).json({
            success: true,
            data: pengajuan
        });
    } catch (error) {
        console.error("Error fetching pengajuan by ID:", error);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil data pengajuan",
            error: error.message
        });
    }
};

const submitRevisi = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { catatan_pemohon, dokumen_upload } = req.body;

        console.log("📝 Submitting revisi for pengajuan:", id);

        const pengajuan = await Pengajuan.findByPk(id);
        if (!pengajuan) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: "Pengajuan tidak ditemukan"
            });
        }

        if (pengajuan.status_verifikasi !== "Perlu Perbaikan") {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Hanya pengajuan dengan status 'Perlu Perbaikan' yang dapat direvisi"
            });
        }

        if (catatan_pemohon !== undefined) {
            await pengajuan.update({
                catatan_pemohon: catatan_pemohon
            }, { transaction: t });
        }
        if (dokumen_upload && dokumen_upload.length > 0) {
            for (const dok of dokumen_upload) {
                await Dokumen.destroy({
                    where: {
                        id_pengajuan: id,
                        id_persyaratan: dok.id_persyaratan
                    },
                    transaction: t
                });
                await Dokumen.create({
                    id_pengajuan: id,
                    id_persyaratan: dok.id_persyaratan,
                    nama_file: dok.nama_file,
                    path_file: dok.path_file,
                    jenis_dokumen: dok.jenis_dokumen || null,
                    created_at: new Date()
                }, { transaction: t });
            }

            console.log(`Updated ${dokumen_upload.length} dokumen`);
        }

        await pengajuan.update({
            status_verifikasi: "Menunggu Verifikasi",
            tanggal_pengajuan: new Date(),
        }, { transaction: t });

        await t.commit();

        console.log("Revisi berhasil disubmit");

        res.status(200).json({
            success: true,
            message: "Revisi berhasil dikirim",
            data: {
                id_pengajuan: pengajuan.id_pengajuan,
                nomor_registrasi: pengajuan.nomor_registrasi,
                status_verifikasi: "Menunggu Verifikasi"
            }
        });
    } catch (error) {
        await t.rollback();
        console.error("Error submitting revisi:", error);
        res.status(500).json({
            success: false,
            message: "Gagal mengirim revisi",
            error: error.message
        });
    }
};

module.exports = {
    getAllModulLayanan,
    getPersyaratanByModul,
    createPengajuan,
    getPengajuanByUser,
    getAllPengajuan,
    getPengajuanByStatus,
    updatePengajuanStatus,
    getDokumenByPengajuan,
    getCatatanRevisi,
    selesaikanPengajuan,
    getPengajuanById,
    submitRevisi
};
