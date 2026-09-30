const { StudentCertification } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { requireOwnProfile } = require('./student-profile.service');
const { serializeCertification } = require('./student-profile.serializer');

const findOwnCertification = async (studentProfileId, certificationUuid) => {
  const certification = await StudentCertification.findOne({
    where: { uuid: certificationUuid, studentProfileId },
  });
  if (!certification) {
    throw new ApiError(404, 'Certification not found.');
  }
  return certification;
};

const listMyCertifications = async (actorUser) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const certifications = await StudentCertification.findAll({
    where: { studentProfileId: profile.id },
    order: [['issueDate', 'DESC']],
  });
  return certifications.map(serializeCertification);
};

const createCertification = async (actorUser, payload) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const certification = await StudentCertification.create({
    studentProfileId: profile.id,
    name: payload.name,
    issuingOrganization: payload.issuing_organization || null,
    issueDate: payload.issue_date || null,
    expiryDate: payload.expiry_date || null,
    credentialId: payload.credential_id || null,
    credentialUrl: payload.credential_url || null,
    description: payload.description || null,
  });
  return serializeCertification(certification);
};

/** §42: re-checks the issue/expiry relationship against the row's persisted values, not just this request's payload (see certification.validator.js). */
const updateCertification = async (actorUser, certificationUuid, payload) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const certification = await findOwnCertification(profile.id, certificationUuid);

  const changes = {};
  if (payload.name !== undefined) changes.name = payload.name;
  if (payload.issuing_organization !== undefined) changes.issuingOrganization = payload.issuing_organization || null;
  if (payload.issue_date !== undefined) changes.issueDate = payload.issue_date || null;
  if (payload.expiry_date !== undefined) changes.expiryDate = payload.expiry_date || null;
  if (payload.credential_id !== undefined) changes.credentialId = payload.credential_id || null;
  if (payload.credential_url !== undefined) changes.credentialUrl = payload.credential_url || null;
  if (payload.description !== undefined) changes.description = payload.description || null;

  const nextIssueDate = changes.issueDate !== undefined ? changes.issueDate : certification.issueDate;
  const nextExpiryDate = changes.expiryDate !== undefined ? changes.expiryDate : certification.expiryDate;
  if (nextIssueDate && nextExpiryDate && new Date(nextExpiryDate) < new Date(nextIssueDate)) {
    throw new ApiError(422, 'Expiry date cannot be earlier than the issue date.');
  }

  await certification.update(changes);
  return serializeCertification(certification);
};

const deleteCertification = async (actorUser, certificationUuid) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const certification = await findOwnCertification(profile.id, certificationUuid);
  await certification.destroy();
};

module.exports = { listMyCertifications, createCertification, updateCertification, deleteCertification };
