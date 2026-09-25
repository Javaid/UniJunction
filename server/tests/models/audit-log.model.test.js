const { sequelize, User, University, AuditLog } = require('../../src/models');

afterAll(() => sequelize.close());

describe('AuditLog model', () => {
  it('requires action, entityType, and entityId; actor and university are optional', () => {
    const attrs = AuditLog.rawAttributes;
    expect(attrs.action.allowNull).toBe(false);
    expect(attrs.entityType.allowNull).toBe(false);
    expect(attrs.entityId.allowNull).toBe(false);
    expect(attrs.actorUserId.allowNull).toBe(true);
    expect(attrs.universityId.allowNull).toBe(true);
  });

  it('has no uuid — never addressed by ID from any endpoint in this chunk', () => {
    expect(AuditLog.rawAttributes.uuid).toBeUndefined();
  });

  it('is append-only: not paranoid, and has no updatedAt', () => {
    expect(AuditLog.options.paranoid).toBe(false);
    expect(AuditLog.options.timestamps).not.toBe(false); // createdAt still exists
    expect(AuditLog.rawAttributes.updatedAt).toBeUndefined();
    expect(AuditLog.rawAttributes.createdAt).toBeDefined();
  });

  it('survives its actor or university being removed (SET NULL, not cascade)', () => {
    expect(User.associations.auditLogs.options.onDelete).toBe('SET NULL');
    expect(University.associations.auditLogs.options.onDelete).toBe('SET NULL');
  });
});
