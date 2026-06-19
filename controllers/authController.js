const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();
const DEFAULT_JWT_SECRET = 'your-secret-key-change-this-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_JWT_SECRET) {
    throw new Error('JWT_SECRET wajib diisi dengan nilai kuat sebelum menjalankan production');
}

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username dan password wajib diisi'
            });
        }

        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                kabupaten_kota: user.kabupaten_kota,
                alamat: user.alamat,
                no_hp: user.no_hp,
                foto_profile: user.foto_profile
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login berhasil',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    kabupaten_kota: user.kabupaten_kota,
                    alamat: user.alamat,
                    no_hp: user.no_hp,
                    foto_profile: user.foto_profile
                }
            }
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat login'
        });
    }
};

exports.verifyToken = async (req, res) => {
    try {

        res.json({
            success: true,
            data: {
                user: req.user
            }
        });
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat verifikasi token'
        });
    }
};

exports.logout = async (req, res) => {
    try {

        res.json({
            success: true,
            message: 'Logout berhasil'
        });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat logout'
        });
    }
};

