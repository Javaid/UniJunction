const { sequelize, Permission } = require('../../src/models');

afterAll(() => sequelize.close());

describe('Permission model', () => {
  it('defines a unique, required name column', () => {
    const attrs = Permission.rawAttributes;
    expect(attrs.name.allowNull).toBe(false);
    expect(attrs.name.unique).toBeTruthy();
  });

  it('is not soft-deletable (reference data)', () => {
    expect(Permission.options.paranoid).toBe(false);
  });

  it('stores permission names as free-form text, not a fixed DB enum', () => {
    expect(Permission.rawAttributes.name.type.constructor.name).toBe('STRING');
  });
});
