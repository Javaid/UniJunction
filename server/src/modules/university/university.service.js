const { Op } = require('sequelize');
const { sequelize, University } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { recordAuditLog } = require('../../services/audit.service');
const { VERIFICATION_STATUS } = require('../../utils/enums');
const { toAdminUniversity, serializeUniversity } = require('./university.serializer');

const findByPublicId = async (universityUuid) => {
  const university = await University.findOne({ where: { uuid: universityUuid } });
  if (!university) {
    throw new ApiError(404, 'University not found.');
  }
  return university;
};

/** §9: pagination, search (name/short_name/city/state/country), status/verification_status/country/city filters, whitelisted sort. */
const listUniversities = async (
  { page, pageSize, search, status, verification_status: verificationStatus, country, city, sortBy, sortDir },
  user
) => {
  const where = {};
  if (status) where.status = status;
  if (verificationStatus) where.verificationStatus = verificationStatus;
  if (country) where.country = country;
  if (city) where.city = city;
  if (search) {
    const like = `%${search}%`;
    where[Op.or] = [
      { name: { [Op.like]: like } },
      { shortName: { [Op.like]: like } },
      { city: { [Op.like]: like } },
      { stateProvince: { [Op.like]: like } },
      { country: { [Op.like]: like } },
    ];
  }

  const { rows, count } = await University.findAndCountAll({
    where,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [[sortBy, sortDir]],
  });

  return {
    universities: rows.map((u) => serializeUniversity(u, user)),
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 0 },
  };
};

const getUniversity = async (universityUuid, user) => serializeUniversity(await findByPublicId(universityUuid), user);

const CREATE_FIELD_MAP = {
  name: 'name',
  short_name: 'shortName',
  slug: 'slug',
  description: 'description',
  website_url: 'websiteUrl',
  logo_url: 'logoUrl',
  email_domain: 'emailDomain',
  country: 'country',
  state_province: 'stateProvince',
  city: 'city',
  address: 'address',
  postal_code: 'postalCode',
};

const mapPayload = (payload, fieldMap) => {
  const attrs = {};
  for (const [apiKey, modelKey] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(payload, apiKey)) {
      attrs[modelKey] = payload[apiKey] === '' ? null : payload[apiKey];
    }
  }
  return attrs;
};

/** §11: SUPER_ADMIN only (enforced by the route's requirePermission), Joi-validated. */
const createUniversity = async (payload, actorUser) => {
  const existingSlug = await University.findOne({ where: { slug: payload.slug } });
  if (existingSlug) {
    throw new ApiError(409, 'A university with this slug already exists.');
  }

  let university;
  try {
    university = await sequelize.transaction(async (transaction) => {
      const created = await University.create(mapPayload(payload, CREATE_FIELD_MAP), { transaction });

      await recordAuditLog(
        {
          actorUserId: actorUser.internalId,
          action: 'UNIVERSITY_CREATED',
          entityType: 'University',
          entityId: created.id,
          universityId: created.id,
          metadata: { name: created.name, slug: created.slug },
        },
        { transaction }
      );

      return created;
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new ApiError(409, 'A university with this slug already exists.');
    }
    throw error;
  }

  return toAdminUniversity(university);
};

const UPDATE_FIELD_MAP = { ...CREATE_FIELD_MAP };
delete UPDATE_FIELD_MAP.slug; // stable identifier — not changed by ordinary update, see §11/validator

/** §7: caller's write access to `university` must already be verified (access.service.js) before calling this. */
const updateUniversity = async (universityUuid, payload, actorUser) => {
  const university = await findByPublicId(universityUuid);
  const changes = mapPayload(payload, UPDATE_FIELD_MAP);

  await sequelize.transaction(async (transaction) => {
    await university.update(changes, { transaction });
    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'UNIVERSITY_UPDATED',
        entityType: 'University',
        entityId: university.id,
        universityId: university.id,
        metadata: { changed: Object.keys(changes) },
      },
      { transaction }
    );
  });

  return toAdminUniversity(university);
};

/** §12: status is a SUPER_ADMIN-only operation (route-level permission) — see docs/university-management.md. */
const updateUniversityStatus = async (universityUuid, status, actorUser) => {
  const university = await findByPublicId(universityUuid);
  const previousStatus = university.status;

  await sequelize.transaction(async (transaction) => {
    await university.update({ status }, { transaction });
    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'UNIVERSITY_STATUS_CHANGED',
        entityType: 'University',
        entityId: university.id,
        universityId: university.id,
        metadata: { from: previousStatus, to: status },
      },
      { transaction }
    );
  });

  return toAdminUniversity(university);
};

/** §13/§14: SUPER_ADMIN only. Sets verified_at on VERIFIED, clears it otherwise (revocation). */
const updateUniversityVerification = async (universityUuid, status, actorUser) => {
  const university = await findByPublicId(universityUuid);
  const previousStatus = university.verificationStatus;
  const changes = {
    verificationStatus: status,
    verifiedAt: status === VERIFICATION_STATUS.VERIFIED ? new Date() : null,
  };

  await sequelize.transaction(async (transaction) => {
    await university.update(changes, { transaction });
    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'UNIVERSITY_VERIFICATION_CHANGED',
        entityType: 'University',
        entityId: university.id,
        universityId: university.id,
        metadata: { from: previousStatus, to: status },
      },
      { transaction }
    );
  });

  return toAdminUniversity(university);
};

module.exports = {
  findByPublicId,
  listUniversities,
  getUniversity,
  createUniversity,
  updateUniversity,
  updateUniversityStatus,
  updateUniversityVerification,
};
