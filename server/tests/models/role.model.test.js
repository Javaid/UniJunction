const { sequelize, Role } = require('../../src/models');

afterAll(() => sequelize.close());

describe('Role model', () => {
  it('defines a unique, required name column', () => {
    const attrs = Role.rawAttributes;

    expect(attrs.name.allowNull).toBe(false);
    expect(attrs.name.unique).toBeTruthy();
  });

  it('is not soft-deletable (reference data)', () => {
    expect(Role.options.paranoid).toBe(false);
  });

  it('stores role names as free-form text, not a fixed DB enum', () => {
    // Extensibility requirement: new roles must not require a migration.
    expect(Role.rawAttributes.name.type.constructor.name).toBe('STRING');
  });
});
