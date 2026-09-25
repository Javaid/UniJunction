const { sequelize, University, Faculty, Department } = require('../../src/models');

afterAll(() => sequelize.close());

describe('Department relationships', () => {
  it('always belongs to a university', () => {
    expect(Department.rawAttributes.universityId.allowNull).toBe(false);
    expect(Department.associations.university).toBeDefined();
  });

  it('optionally belongs to a faculty', () => {
    // Some institutions run departments directly under the university,
    // with no faculty layer — see server/src/models/department.model.js.
    expect(Department.rawAttributes.facultyId.allowNull).toBe(true);
    expect(Department.associations.faculty).toBeDefined();
  });

  it('is discoverable from both University and Faculty', () => {
    expect(University.associations.departments).toBeDefined();
    expect(Faculty.associations.departments).toBeDefined();
  });

  it('clears (not blocks) when its faculty is removed', () => {
    expect(Faculty.associations.departments.options.onDelete).toBe('SET NULL');
  });
});
