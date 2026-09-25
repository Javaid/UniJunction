const { Op } = require('sequelize');
const { sequelize, Department, Faculty } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { recordAuditLog } = require('../../services/audit.service');
const { assertUniversityAccess, assertResourceBelongsToUniversity } = require('./access.service');

const serializeDepartment = (department, universityUuid, facultyUuid) => {
  const plain = department.toJSON ? department.toJSON() : department;
  return {
    id: plain.uuid,
    university_id: universityUuid || plain.university?.uuid,
    faculty_id: facultyUuid !== undefined ? facultyUuid : (plain.faculty?.uuid ?? null),
    name: plain.name,
    short_name: plain.shortName,
    description: plain.description,
    status: plain.status,
    created_at: plain.createdAt,
    updated_at: plain.updatedAt,
  };
};

const findByPublicId = async (departmentUuid) => {
  const department = await Department.findOne({
    where: { uuid: departmentUuid },
    include: [{ association: 'university' }, { association: 'faculty' }],
  });
  if (!department) {
    throw new ApiError(404, 'Department not found.');
  }
  return department;
};

/** §20: never trusts a client-supplied faculty_id without resolving it and checking institutional ownership. */
const resolveFacultyForUniversity = async (facultyUuid, universityId, { transaction } = {}) => {
  if (!facultyUuid) return null;
  const faculty = await Faculty.findOne({ where: { uuid: facultyUuid }, transaction });
  if (!faculty) {
    throw new ApiError(404, 'Faculty not found.');
  }
  assertResourceBelongsToUniversity(faculty, universityId, 'Faculty');
  return faculty;
};

const listDepartments = async (university, { page, pageSize, search, status, faculty_id: facultyUuid }) => {
  const where = { universityId: university.id };
  if (status) where.status = status;
  if (search) where.name = { [Op.like]: `%${search}%` };
  if (facultyUuid) {
    const faculty = await resolveFacultyForUniversity(facultyUuid, university.id);
    where.facultyId = faculty.id;
  }

  const { rows, count } = await Department.findAndCountAll({
    where,
    include: [{ association: 'faculty' }],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [['name', 'ASC']],
  });

  return {
    departments: rows.map((d) => serializeDepartment(d, university.uuid)),
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 0 },
  };
};

const getDepartment = async (departmentUuid) => serializeDepartment(await findByPublicId(departmentUuid));

const createDepartment = async (university, payload, actorUser) => {
  let department;
  await sequelize.transaction(async (transaction) => {
    const faculty = await resolveFacultyForUniversity(payload.faculty_id, university.id, { transaction });

    department = await Department.create(
      {
        universityId: university.id,
        facultyId: faculty ? faculty.id : null,
        name: payload.name,
        shortName: payload.short_name || null,
        description: payload.description || null,
      },
      { transaction }
    );

    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'DEPARTMENT_CREATED',
        entityType: 'Department',
        entityId: department.id,
        universityId: university.id,
        metadata: { name: department.name },
      },
      { transaction }
    );
  });

  return serializeDepartment(department, university.uuid, payload.faculty_id || null);
};

/** §18/§20: university_id is never accepted; faculty_id (if provided) is re-validated against this department's own university. */
const updateDepartment = async (departmentUuid, payload, actorUser) => {
  const department = await findByPublicId(departmentUuid);
  await assertUniversityAccess(actorUser, department.universityId);

  const changes = {};
  if (payload.name !== undefined) changes.name = payload.name;
  if (payload.short_name !== undefined) changes.shortName = payload.short_name || null;
  if (payload.description !== undefined) changes.description = payload.description || null;

  await sequelize.transaction(async (transaction) => {
    if (Object.prototype.hasOwnProperty.call(payload, 'faculty_id')) {
      const faculty = await resolveFacultyForUniversity(payload.faculty_id, department.universityId, {
        transaction,
      });
      changes.facultyId = faculty ? faculty.id : null;
    }
    await department.update(changes, { transaction });
    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'DEPARTMENT_UPDATED',
        entityType: 'Department',
        entityId: department.id,
        universityId: department.universityId,
        metadata: { changed: Object.keys(changes) },
      },
      { transaction }
    );
  });

  return serializeDepartment(await findByPublicId(departmentUuid));
};

const updateDepartmentStatus = async (departmentUuid, status, actorUser) => {
  const department = await findByPublicId(departmentUuid);
  await assertUniversityAccess(actorUser, department.universityId);
  const previousStatus = department.status;

  await sequelize.transaction(async (transaction) => {
    await department.update({ status }, { transaction });
    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'DEPARTMENT_STATUS_CHANGED',
        entityType: 'Department',
        entityId: department.id,
        universityId: department.universityId,
        metadata: { from: previousStatus, to: status },
      },
      { transaction }
    );
  });

  return serializeDepartment(department);
};

module.exports = {
  findByPublicId,
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  updateDepartmentStatus,
  resolveFacultyForUniversity,
};
