const { sequelize, University, Faculty } = require('../../src/models');

afterAll(() => sequelize.close());

describe('University <-> Faculty relationship', () => {
  it('a faculty belongs to exactly one university', () => {
    expect(Faculty.rawAttributes.universityId.allowNull).toBe(false);
    expect(Faculty.associations.university).toBeDefined();
    expect(Faculty.associations.university.associationType).toBe('BelongsTo');
  });

  it('a university has many faculties', () => {
    expect(University.associations.faculties).toBeDefined();
    expect(University.associations.faculties.associationType).toBe('HasMany');
  });

  it('does not cascade-delete faculties when a university is removed', () => {
    expect(University.associations.faculties.options.onDelete).toBe('RESTRICT');
  });
});
