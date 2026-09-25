const { sequelize, Role, Permission, RolePermission } = require('../../src/models');

afterAll(() => sequelize.close());

describe('Role <-> Permission relationship', () => {
  it('exposes a many-to-many association through RolePermission', () => {
    expect(Role.associations.permissions).toBeDefined();
    expect(Role.associations.permissions.associationType).toBe('BelongsToMany');
    expect(Role.associations.permissions.through.model).toBe(RolePermission);

    expect(Permission.associations.roles).toBeDefined();
    expect(Permission.associations.roles.associationType).toBe('BelongsToMany');
  });

  it('enforces one mapping per (role, permission) pair', () => {
    const uniqueIndex = RolePermission.options.indexes.find((index) => index.unique);
    expect(uniqueIndex.fields).toEqual(['role_id', 'permission_id']);
  });

  it('is not soft-deletable (pure join table)', () => {
    expect(RolePermission.options.paranoid).toBe(false);
  });
});
