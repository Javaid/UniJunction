const { DataTypes } = require('sequelize');

/**
 * Append-only institutional audit trail — see
 * docs/university-management.md, "Audit logging" and
 * `server/src/services/audit.service.js` (the only writer). Deliberately
 * narrow in scope for this chunk: university creation/update/
 * verification/status changes, university admin assignment, and
 * membership status changes — not a general-purpose audit framework.
 *
 * No `uuid`: never addressed by ID from any endpoint in this chunk (no
 * `GET /audit-logs/:id`), consistent with the project's "uuid only when
 * externally addressable" rule (docs/database-guidelines.md §4).
 * No `deleted_at`/paranoid, and no `updatedAt`: an audit entry is
 * immutable once written — there is nothing to soft-delete or update.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'AuditLog',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      actorUserId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      entityType: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entityId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      universityId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: 'audit_logs',
      paranoid: false,
      updatedAt: false,
      indexes: [
        { fields: ['entity_type', 'entity_id'] },
        { fields: ['university_id'] },
        { fields: ['actor_user_id'] },
        { fields: ['created_at'] },
      ],
    }
  );
