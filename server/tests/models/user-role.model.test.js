const { sequelize, User, Role, UserRole } = require('../../src/models');

afterAll(() => sequelize.close());

describe('User <-> Role relationship', () => {
  it('exposes a many-to-many association through UserRole', () => {
    expect(User.associations.roles).toBeDefined();
    expect(User.associations.roles.associationType).toBe('BelongsToMany');
    expect(User.associations.roles.through.model).toBe(UserRole);

    expect(Role.associations.users).toBeDefined();
    expect(Role.associations.users.associationType).toBe('BelongsToMany');
  });

  it('links UserRole back to both User and Role', () => {
    expect(UserRole.associations.User).toBeDefined();
    expect(UserRole.associations.Role).toBeDefined();
  });

  it('enforces one role assignment per (user, role) pair', () => {
    const uniqueIndex = UserRole.options.indexes.find((index) => index.unique);
    expect(uniqueIndex.fields).toEqual(['user_id', 'role_id']);
  });
});
