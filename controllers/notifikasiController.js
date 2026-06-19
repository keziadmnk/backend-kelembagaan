const Notifikasi = require("../models/Notifikasi");

const canAccessNotification = (req, notification) => {
    return req.user?.role === "admin" || Number(notification.id_user) === Number(req.user?.id);
};

const getNotifikasiByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const notifikasi = await Notifikasi.findAll({
            where: { id_user: userId },
            order: [["created_at", "DESC"]],
        });

        res.json({
            success: true,
            data: notifikasi,
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil notifikasi",
            error: error.message,
        });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const { userId } = req.params;

        const count = await Notifikasi.count({
            where: {
                id_user: userId,
                is_read: false,
            },
        });

        res.json({
            success: true,
            data: { count },
        });
    } catch (error) {
        console.error("Error fetching unread count:", error);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil jumlah notifikasi belum dibaca",
            error: error.message,
        });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notifikasi = await Notifikasi.findByPk(id);

        if (!notifikasi) {
            return res.status(404).json({ success: false, message: "Notifikasi tidak ditemukan" });
        }

        if (!canAccessNotification(req, notifikasi)) {
            return res.status(403).json({ success: false, message: "Akses ditolak untuk notifikasi ini" });
        }

        await notifikasi.update({ is_read: true });

        res.json({
            success: true,
            message: "Notifikasi ditandai sudah dibaca",
        });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({
            success: false,
            message: "Gagal menandai notifikasi",
            error: error.message,
        });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;

        await Notifikasi.update(
            { is_read: true },
            { where: { id_user: userId, is_read: false } }
        );

        res.json({
            success: true,
            message: "Semua notifikasi ditandai sudah dibaca",
        });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({
            success: false,
            message: "Gagal menandai semua notifikasi",
            error: error.message,
        });
    }
};

const createNotifikasi = async (userId, pengajuanId, judul, pesan, tipe) => {
    try {
        const notifikasi = await Notifikasi.create({
            id_user: userId,
            id_pengajuan: pengajuanId,
            judul,
            pesan,
            tipe,
            is_read: false,
        });

        return notifikasi;
    } catch (error) {
        console.error("Error creating notification:", error);
        throw error;
    }
};

const deleteNotifikasi = async (req, res) => {
    try {
        const { id } = req.params;
        const notifikasi = await Notifikasi.findByPk(id);

        if (!notifikasi) {
            return res.status(404).json({ success: false, message: "Notifikasi tidak ditemukan" });
        }

        if (!canAccessNotification(req, notifikasi)) {
            return res.status(403).json({ success: false, message: "Akses ditolak untuk notifikasi ini" });
        }

        await notifikasi.destroy();

        res.json({
            success: true,
            message: "Notifikasi berhasil dihapus",
        });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({
            success: false,
            message: "Gagal menghapus notifikasi",
            error: error.message,
        });
    }
};

module.exports = {
    getNotifikasiByUser,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createNotifikasi,
    deleteNotifikasi,
};
