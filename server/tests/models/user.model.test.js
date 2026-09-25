const { sequelize, User } = require('../../src/models');

afterAll(() => sequelize.close());

describe('User model', () => {
  it('defines the expected columns with the right constraints', () => {
    const attrs = User.rawAttributes;

    expect(attrs.email.allowNull).toBe(false);
    expect(attrs.email.unique).toBeTruthy();
    expect(attrs.passwordHash.allowNull).toBe(false);
    expect(attrs.firstName.allowNull).toBe(false);
    expect(attrs.lastName.allowNull).toBe(false);
    expect(attrs.status.defaultValue).toBe('PENDING');
    expect(attrs.uuid.unique).toBeTruthy();
  });

  it('is soft-deletable (paranoid)', () => {
    expect(User.options.paranoid).toBe(true);
  });

  it('never returns passwordHash from the default scope', () => {
    expect(User._scope.attributes.exclude).toContain('passwordHash');
  });

  it('accepts only the documented status values', () => {
    expect(User.rawAttributes.status.values).toEqual([
      'ACTIVE',
      'PENDING',
      'SUSPENDED',
      'DEACTIVATED',
    ]);
  });
});
