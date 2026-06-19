const express = require("express");
const router = express.Router();
const {
    getNotifikasiByUser,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotifikasi,
} = require("../controllers/notifikasiController");
const { authenticate } = require("../middleware/auth");

const ensureOwnUserOrAdmin = (req, res, next) => {
    if (req.user.role === "admin" || Number(req.params.userId) === Number(req.user.id)) return next();
    return res.status(403).json({ success: false, message: "Akses ditolak untuk notifikasi pengguna lain" });
};

router.get("/user/:userId", authenticate, ensureOwnUserOrAdmin, getNotifikasiByUser);
router.get("/user/:userId/unread-count", authenticate, ensureOwnUserOrAdmin, getUnreadCount);
router.put("/:id/read", authenticate, markAsRead);
router.put("/user/:userId/read-all", authenticate, ensureOwnUserOrAdmin, markAllAsRead);
router.delete("/:id", authenticate, deleteNotifikasi);

module.exports = router;
