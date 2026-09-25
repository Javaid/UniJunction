const { sequelize, University } = require('../../src/models');

afterAll(() => sequelize.close());

describe('University model', () => {
  it('defines a unique slug and unique uuid', () => {
    const attrs = University.rawAttributes;

    expect(attrs.slug.allowNull).toBe(false);
    expect(attrs.slug.unique).toBeTruthy();
    expect(attrs.uuid.unique).toBeTruthy();
  });

  it('defaults new universities to PENDING status', () => {
    expect(University.rawAttributes.status.defaultValue).toBe('PENDING');
  });

  it('is soft-deletable (major institutional entity)', () => {
    expect(University.options.paranoid).toBe(true);
  });
});
