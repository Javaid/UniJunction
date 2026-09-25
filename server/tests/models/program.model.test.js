const { sequelize, University, Faculty, Department, Program } = require('../../src/models');

afterAll(() => sequelize.close());

describe('Program relationships', () => {
  it('always belongs to a department', () => {
    expect(Program.rawAttributes.departmentId.allowNull).toBe(false);
    expect(Program.associations.department).toBeDefined();
  });

  it('is also reachable from university and (optionally) faculty', () => {
    expect(Program.associations.university).toBeDefined();
    expect(Program.rawAttributes.facultyId.allowNull).toBe(true);
    expect(Program.associations.faculty).toBeDefined();

    expect(University.associations.programs).toBeDefined();
    expect(Faculty.associations.programs).toBeDefined();
    expect(Department.associations.programs).toBeDefined();
  });

  it('stores degreeLevel as an open-ended value, not a fixed enum', () => {
    expect(Program.rawAttributes.degreeLevel.type.constructor.name).toBe('STRING');
  });

  it('blocks department deletion while programs still reference it', () => {
    expect(Department.associations.programs.options.onDelete).toBe('RESTRICT');
  });
});
