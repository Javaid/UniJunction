const { Op } = require('sequelize');
const { sequelize, Faculty } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { recordAuditLog } = require('../../services/audit.service');
const { assertUniversityAccess } = require('./access.service');

const serializeFaculty = (faculty, universityUuid) => {
  const plain = faculty.toJSON ? faculty.toJSON() : faculty;
  return {
    id: plain.uuid,
    university_id: universityUuid || plain.university?.uuid,
    name: plain.name,
    short_name: plain.shortName,
    description: plain.description,
    status: plain.status,
    created_at: plain.createdAt,
    updated_at: plain.updatedAt,
  };
};

const findByPublicId = async (facultyUuid) => {
  const faculty = await Faculty.findOne({
    where: { uuid: facultyUuid },
    include: [{ association: 'university' }],
  });
  if (!faculty) {
    throw new ApiError(404, 'Faculty not found.');
  }
  return faculty;
};

const listFaculties = async (university, { page, pageSize, search, status }) => {
  const where = { universityId: university.id };
  if (status) where.status = status;
  if (search) where.name = { [Op.like]: `%${search}%` };

  const { rows, count } = await Faculty.findAndCountAll({
    where,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [['name', 'ASC']],
  });

  return {
    faculties: rows.map((f) => serializeFaculty(f, university.uuid)),
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 0 },
  };
};

const getFaculty = async (facultyUuid) => serializeFaculty(await findByPublicId(facultyUuid));

/** Caller's write access to `university` must already be verified (see university.middleware.js). */
const createFaculty = async (university, payload, actorUser) => {
  let faculty;
  await sequelize.transaction(async (transaction) => {
    faculty = await Faculty.create(
      {
        universityId: university.id,
        name: payload.name,
        shortName: payload.short_name || null,
        description: payload.description || null,
      },
      { transaction }
    );

    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'FACULTY_CREATED',
        entityType: 'Faculty',
        entityId: faculty.id,
        universityId: university.id,
        metadata: { name: faculty.name },
      },
      { transaction }
    );
  });

  return serializeFaculty(faculty, university.uuid);
};

/** §18: university_id is never accepted here — the Joi schema doesn't even define the field. */
const updateFaculty = async (facultyUuid, payload, actorUser) => {
  const faculty = await findByPublicId(facultyUuid);
  await assertUniversityAccess(actorUser, faculty.universityId);

  const changes = {};
  if (payload.name !== undefined) changes.name = payload.name;
  if (payload.short_name !== undefined) changes.shortName = payload.short_name || null;
  if (payload.description !== undefined) changes.description = payload.description || null;

  await sequelize.transaction(async (transaction) => {
    await faculty.update(changes, { transaction });
    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'FACULTY_UPDATED',
        entityType: 'Faculty',
        entityId: faculty.id,
        universityId: faculty.universityId,
        metadata: { changed: Object.keys(changes) },
      },
      { transaction }
    );
  });

  return serializeFaculty(faculty);
};

const updateFacultyStatus = async (facultyUuid, status, actorUser) => {
  const faculty = await findByPublicId(facultyUuid);
  await assertUniversityAccess(actorUser, faculty.universityId);
  const previousStatus = faculty.status;

  await sequelize.transaction(async (transaction) => {
    await faculty.update({ status }, { transaction });
    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'FACULTY_STATUS_CHANGED',
        entityType: 'Faculty',
        entityId: faculty.id,
        universityId: faculty.universityId,
        metadata: { from: previousStatus, to: status },
      },
      { transaction }
    );
  });

  return serializeFaculty(faculty);
};

module.exports = {
  findByPublicId,
  listFaculties,
  getFaculty,
  createFaculty,
  updateFaculty,
  updateFacultyStatus,
};
