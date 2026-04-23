'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('notifikasi', {
            id_notifikasi: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            id_user: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'User yang menerima notifikasi',
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            id_pengajuan: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'ID pengajuan terkait (jika ada)',
                references: {
                    model: 'pengajuan',
                    key: 'id_pengajuan'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            judul: {
                type: Sequelize.STRING(255),
                allowNull: false,
                comment: 'Judul notifikasi'
            },
            pesan: {
                type: Sequelize.TEXT,
                allowNull: false,
                comment: 'Isi pesan notifikasi'
            },
            tipe: {
                type: Sequelize.ENUM('pengajuan_baru', 'perubahan_status', 'info'),
                allowNull: false,
                comment: 'Tipe notifikasi'
            },
            is_read: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Status sudah dibaca atau belum'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        await queryInterface.addIndex('notifikasi', ['id_user']);
        await queryInterface.addIndex('notifikasi', ['id_pengajuan']);
        await queryInterface.addIndex('notifikasi', ['is_read']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('notifikasi');
    }
};
