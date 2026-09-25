const { sequelize, UniversityDomain } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { recordAuditLog } = require('../../services/audit.service');

const serializeDomain = (domain, universityUuid) => {
  const plain = domain.toJSON ? domain.toJSON() : domain;
  return {
    id: plain.uuid,
    university_id: universityUuid || plain.university?.uuid,
    domain: plain.domain,
    is_primary: plain.isPrimary,
    status: plain.status,
    created_at: plain.createdAt,
    updated_at: plain.updatedAt,
  };
};

const listDomains = async (university) => {
  const domains = await UniversityDomain.findAll({
    where: { universityId: university.id },
    order: [['createdAt', 'ASC']],
  });
  return domains.map((d) => serializeDomain(d, university.uuid));
};

/** §15: domain is normalized (lower-cased) and globally unique — see university-domain.model.js. */
const createDomain = async (university, payload, actorUser) => {
  const normalizedDomain = payload.domain.trim().toLowerCase();

  const existing = await UniversityDomain.findOne({ where: { domain: normalizedDomain } });
  if (existing) {
    throw new ApiError(409, 'This domain is already registered to a university.');
  }

  let domainRow;
  try {
    await sequelize.transaction(async (transaction) => {
      if (payload.is_primary) {
        await UniversityDomain.update(
          { isPrimary: false },
          { where: { universityId: university.id, isPrimary: true }, transaction }
        );
      }

      domainRow = await UniversityDomain.create(
        { universityId: university.id, domain: normalizedDomain, isPrimary: Boolean(payload.is_primary) },
        { transaction }
      );

      await recordAuditLog(
        {
          actorUserId: actorUser.internalId,
          action: 'UNIVERSITY_DOMAIN_ADDED',
          entityType: 'UniversityDomain',
          entityId: domainRow.id,
          universityId: university.id,
          metadata: { domain: normalizedDomain },
        },
        { transaction }
      );
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new ApiError(409, 'This domain is already registered to a university.');
    }
    throw error;
  }

  return serializeDomain(domainRow, university.uuid);
};

const removeDomain = async (university, domainUuid, actorUser) => {
  const domain = await UniversityDomain.findOne({ where: { uuid: domainUuid, universityId: university.id } });
  if (!domain) {
    throw new ApiError(404, 'Domain not found.');
  }

  await sequelize.transaction(async (transaction) => {
    await domain.destroy({ transaction }); // paranoid: soft delete
    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'UNIVERSITY_DOMAIN_REMOVED',
        entityType: 'UniversityDomain',
        entityId: domain.id,
        universityId: university.id,
        metadata: { domain: domain.domain },
      },
      { transaction }
    );
  });
};

module.exports = { listDomains, createDomain, removeDomain };
