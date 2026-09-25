const { Op } = require('sequelize');
const { sequelize, Program, Department, Faculty } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { recordAuditLog } = require('../../services/audit.service');
const { assertUniversityAccess, assertResourceBelongsToUniversity } = require('./access.service');

const serializeProgram = (program, universityUuid, departmentUuid, facultyUuid) => {
  const plain = program.toJSON ? program.toJSON() : program;
  return {
    id: plain.uuid,
    university_id: universityUuid || plain.university?.uuid,
    department_id: departmentUuid !== undefined ? departmentUuid : plain.department?.uuid,
    faculty_id: facultyUuid !== undefined ? facultyUuid : (plain.faculty?.uuid ?? null),
    name: plain.name,
    short_name: plain.shortName,
    degree_level: plain.degreeLevel,
    description: plain.description,
    duration_years: plain.durationYears,
    status: plain.status,
    created_at: plain.createdAt,
    updated_at: plain.updatedAt,
  };
};

const findByPublicId = async (programUuid) => {
  const program = await Program.findOne({
    where: { uuid: programUuid },
    include: [{ association: 'university' }, { association: 'department' }, { association: 'faculty' }],
  });
  if (!program) {
    throw new ApiError(404, 'Program not found.');
  }
  return program;
};

const resolveDepartmentForUniversity = async (departmentUuid, universityId, { transaction } = {}) => {
  const department = await Department.findOne({ where: { uuid: departmentUuid }, transaction });
  if (!department) {
    throw new ApiError(404, 'Department not found.');
  }
  assertResourceBelongsToUniversity(department, universityId, 'Department');
  return department;
};

const resolveFacultyForUniversity = async (facultyUuid, universityId, { transaction } = {}) => {
  if (!facultyUuid) return null;
  const faculty = await Faculty.findOne({ where: { uuid: facultyUuid }, transaction });
  if (!faculty) {
    throw new ApiError(404, 'Faculty not found.');
  }
  assertResourceBelongsToUniversity(faculty, universityId, 'Faculty');
  return faculty;
};

const listPrograms = async (
  university,
  { page, pageSize, search, status, department_id: departmentUuid, degree_level: degreeLevel }
) => {
  const where = { universityId: university.id };
  if (status) where.status = status;
  if (degreeLevel) where.degreeLevel = degreeLevel;
  if (search) where.name = { [Op.like]: `%${search}%` };
  if (departmentUuid) {
    const department = await resolveDepartmentForUniversity(departmentUuid, university.id);
    where.departmentId = department.id;
  }

  const { rows, count } = await Program.findAndCountAll({
    where,
    include: [{ association: 'department' }, { association: 'faculty' }],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [['name', 'ASC']],
  });

  return {
    programs: rows.map((p) => serializeProgram(p, university.uuid)),
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 0 },
  };
};

const getProgram = async (programUuid) => serializeProgram(await findByPublicId(programUuid));

const createProgram = async (university, payload, actorUser) => {
  let program;
  await sequelize.transaction(async (transaction) => {
    const department = await resolveDepartmentForUniversity(payload.department_id, university.id, { transaction });
    const faculty = await resolveFacultyForUniversity(payload.faculty_id, university.id, { transaction });

    program = await Program.create(
      {
        universityId: university.id,
        departmentId: department.id,
        facultyId: faculty ? faculty.id : null,
        name: payload.name,
        shortName: payload.short_name || null,
        description: payload.description || null,
        degreeLevel: payload.degree_level,
        durationYears: payload.duration_years ?? null,
      },
      { transaction }
    );

    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'PROGRAM_CREATED',
        entityType: 'Program',
        entityId: program.id,
        universityId: university.id,
        metadata: { name: program.name, degreeLevel: program.degreeLevel },
      },
      { transaction }
    );
  });

  return serializeProgram(program, university.uuid, payload.department_id, payload.faculty_id || null);
};

/** §21/§22: department_id/faculty_id are not reassignable through ordinary update — see institution.validator.js. */
const updateProgram = async (programUuid, payload, actorUser) => {
  const program = await findByPublicId(programUuid);
  await assertUniversityAccess(actorUser, program.universityId);

  const changes = {};
  if (payload.name !== undefined) changes.name = payload.name;
  if (payload.short_name !== undefined) changes.shortName = payload.short_name || null;
  if (payload.description !== undefined) changes.description = payload.description || null;
  if (payload.degree_level !== undefined) changes.degreeLevel = payload.degree_level;
  if (payload.duration_years !== undefined) changes.durationYears = payload.duration_years;

  await sequelize.transaction(async (transaction) => {
    await program.update(changes, { transaction });
    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'PROGRAM_UPDATED',
        entityType: 'Program',
        entityId: program.id,
        universityId: program.universityId,
        metadata: { changed: Object.keys(changes) },
      },
      { transaction }
    );
  });

  return serializeProgram(await findByPublicId(programUuid));
};

const updateProgramStatus = async (programUuid, status, actorUser) => {
  const program = await findByPublicId(programUuid);
  await assertUniversityAccess(actorUser, program.universityId);
  const previousStatus = program.status;

  await sequelize.transaction(async (transaction) => {
    await program.update({ status }, { transaction });
    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'PROGRAM_STATUS_CHANGED',
        entityType: 'Program',
        entityId: program.id,
        universityId: program.universityId,
        metadata: { from: previousStatus, to: status },
      },
      { transaction }
    );
  });

  return serializeProgram(program);
};

module.exports = {
  findByPublicId,
  listPrograms,
  getProgram,
  createProgram,
  updateProgram,
  updateProgramStatus,
};
