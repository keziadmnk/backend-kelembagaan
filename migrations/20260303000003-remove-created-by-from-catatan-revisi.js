'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Kolom created_by mungkin sudah tidak ada (sudah dihapus atau tidak pernah ada)
    // Skip jika tidak ada
    try {
      const desc = await queryInterface.describeTable('catatan_revisi');
      if (desc.created_by) {
        await queryInterface.removeColumn('catatan_revisi', 'created_by');
      }
    } catch (e) {
      // Tabel atau kolom tidak ditemukan, skip
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('catatan_revisi', 'created_by', {
      type: Sequelize.STRING(100),
      allowNull: false,
      defaultValue: 'admin',
      comment: 'Username admin yang membuat catatan'
    });
  }
};
