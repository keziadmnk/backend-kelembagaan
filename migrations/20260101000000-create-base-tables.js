'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. users
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      kabupaten_kota: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('admin', 'kab/kota'),
        allowNull: false,
        defaultValue: 'kab/kota',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // 2. modul_layanan
    await queryInterface.createTable('modul_layanan', {
      id_modul: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nama_modul: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      deskripsi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // 3. persyaratan_dokumen
    await queryInterface.createTable('persyaratan_dokumen', {
      id_persyaratan: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      id_modul: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'modul_layanan', key: 'id_modul' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      nama_dokumen: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      format_file: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      is_multiple: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // 4. pengajuan
    await queryInterface.createTable('pengajuan', {
      id_pengajuan: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      id_user: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      id_modul: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'modul_layanan', key: 'id_modul' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tanggal_pengajuan: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status_verifikasi: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      catatan_pemohon: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      file_surat_rekomendasi: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      tanggal_selesai: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // 5. dokumen
    await queryInterface.createTable('dokumen', {
      id_dokumen: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      id_pengajuan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'pengajuan', key: 'id_pengajuan' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      id_persyaratan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'persyaratan_dokumen', key: 'id_persyaratan' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      nama_file: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      path_file: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      jenis_dokumen: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // 6. proses
    await queryInterface.createTable('proses', {
      id_proses: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nama_proses: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('dokumen');
    await queryInterface.dropTable('pengajuan');
    await queryInterface.dropTable('persyaratan_dokumen');
    await queryInterface.dropTable('modul_layanan');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('proses');
  },
};
