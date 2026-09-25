const { AuditLog } = require('../models');

/**
 * The single writer of `audit_logs` — see docs/university-management.md,
 * "Audit logging". Deliberately narrow: records the actor, the action,
 * what it acted on, and (when relevant) which university, plus a small
 * JSON metadata blob for context. Never pass anything sensitive
 * (passwords, tokens) as metadata.
 *
 * Call this from inside the same transaction as the change it's
 * recording wherever one exists, so the audit entry and the change it
 * describes commit or roll back together.
 */
const recordAuditLog = async (
  { actorUserId, action, entityType, entityId, universityId = null, metadata = null },
  { transaction } = {}
) =>
  AuditLog.create(
    { actorUserId, action, entityType, entityId, universityId, metadata },
    { transaction }
  );

module.exports = { recordAuditLog };
