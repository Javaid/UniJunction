const { sequelize, User, University, UniversityMembership } = require('../../src/models');

afterAll(() => sequelize.close());

describe('UniversityMembership model', () => {
  it('requires userId, universityId, and membershipType', () => {
    const attrs = UniversityMembership.rawAttributes;
    expect(attrs.userId.allowNull).toBe(false);
    expect(attrs.universityId.allowNull).toBe(false);
    expect(attrs.membershipType.allowNull).toBe(false);
  });

  it('accepts the documented membership types and statuses', () => {
    expect(UniversityMembership.rawAttributes.membershipType.values).toEqual([
      'STUDENT',
      'FACULTY',
      'RESEARCHER',
      'STAFF',
      'ADMIN',
    ]);
    expect(UniversityMembership.rawAttributes.status.values).toEqual([
      'PENDING',
      'ACTIVE',
      'SUSPENDED',
      'ENDED',
    ]);
  });

  it('defaults status to PENDING and isPrimary to false', () => {
    expect(UniversityMembership.rawAttributes.status.defaultValue).toBe('PENDING');
    expect(UniversityMembership.rawAttributes.isPrimary.defaultValue).toBe(false);
  });

  it('enforces one row per (user, university, membership_type)', () => {
    const uniqueIndex = UniversityMembership.options.indexes.find((index) => index.unique);
    expect(uniqueIndex.fields).toEqual(['user_id', 'university_id', 'membership_type']);
  });

  it('is soft-deletable and cascades with its user but not its university', () => {
    expect(UniversityMembership.options.paranoid).toBe(true);
    expect(User.associations.universityMemberships.options.onDelete).toBe('CASCADE');
    expect(University.associations.memberships.options.onDelete).toBe('RESTRICT');
  });
});
