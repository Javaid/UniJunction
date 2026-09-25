const { sequelize, University, UniversityDomain } = require('../../src/models');

afterAll(() => sequelize.close());

describe('UniversityDomain model', () => {
  it('requires universityId and a unique domain', () => {
    const attrs = UniversityDomain.rawAttributes;
    expect(attrs.universityId.allowNull).toBe(false);
    expect(attrs.domain.allowNull).toBe(false);
    expect(attrs.domain.unique).toBeTruthy();
  });

  it('defaults isPrimary to false and status to ACTIVE', () => {
    expect(UniversityDomain.rawAttributes.isPrimary.defaultValue).toBe(false);
    expect(UniversityDomain.rawAttributes.status.defaultValue).toBe('ACTIVE');
  });

  it('is soft-deletable (paranoid) — domains are addressed by their own uuid', () => {
    expect(UniversityDomain.options.paranoid).toBe(true);
    expect(UniversityDomain.rawAttributes.uuid.unique).toBeTruthy();
  });

  it('belongs to a university and does not cascade-delete on hard delete', () => {
    expect(UniversityDomain.associations.university).toBeDefined();
    expect(University.associations.domains.options.onDelete).toBe('RESTRICT');
  });
});
