const User = require('../models/User');
const bcrypt = require('bcrypt');
const { buildObjectName, uploadBufferToMinio } = require('../utils/minioUpload');

const uploadProfileToMinio = async (file, userId) => {
    const objectName = buildObjectName({
        folder: 'profiles',
        fileName: file.originalname,
        suffix: `user_${userId}`
    });

    return uploadBufferToMinio({ file, objectName });
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, alamat, no_hp } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Pengguna tidak ditemukan'
            });
        }

        if (username && username !== user.username) {
            const usernameExists = await User.findOne({
                where: {
                    username,
                    id: { [require('sequelize').Op.ne]: userId }
                }
            });

            if (usernameExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Username sudah digunakan oleh pengguna lain'
                });
            }
        }

        const updateData = {};
        if (username !== undefined && username.trim() !== '') {
            updateData.username = username;
        }
        if (alamat !== undefined) {
            updateData.alamat = alamat;
        }
        if (no_hp !== undefined) {
            updateData.no_hp = no_hp;
        }

        if (req.file) {
            const objectName = await uploadProfileToMinio(req.file, userId);
            updateData.foto_profile = `/minio/${objectName}`;
        }

        await user.update(updateData);
        const updatedUser = await User.findByPk(userId, {
            attributes: ['id', 'username', 'kabupaten_kota', 'alamat', 'no_hp', 'role', 'foto_profile']
        });

        res.json({
            success: true,
            message: 'Profile berhasil diperbarui',
            data: updatedUser
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui profile',
            error: error.message
        });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password lama dan password baru wajib diisi'
            });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Pengguna tidak ditemukan'
            });
        }
        const isPasswordValid = await user.comparePassword(oldPassword);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Password lama tidak sesuai'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password baru minimal 6 karakter'
            });
        }

        await user.update({ password: newPassword });

        res.json({
            success: true,
            message: 'Password berhasil diperbarui'
        });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui password'
        });
    }
};
