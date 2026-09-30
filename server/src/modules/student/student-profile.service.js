const { sequelize, StudentProfile } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { recordAuditLog } = require('../../services/audit.service');
const { USER_STATUS } = require('../../utils/enums');
const {
  assertActiveStudentMembership,
  assertUniversityIsActive,
  resolveActiveProgramForUniversity,
} = require('./student-access.service');
const { resolveStudentProfileAccess, serializeStudentProfile } = require('./student-profile.serializer');

const FULL_INCLUDE = [
  { association: 'user' },
  { association: 'university' },
  { association: 'program' },
  { association: 'studentSkills', include: [{ association: 'skill' }] },
  { association: 'studentInterests', include: [{ association: 'interest' }] },
  { association: 'studentResearchInterests', include: [{ association: 'researchArea' }] },
  { association: 'studentLanguages', include: [{ association: 'language' }] },
  { association: 'certifications' },
  { association: 'achievements' },
  { association: 'goals' },
];

const findFullProfileByPublicId = async (profileUuid) => {
  const profile = await StudentProfile.findOne({ where: { uuid: profileUuid }, include: FULL_INCLUDE });
  if (!profile) {
    throw new ApiError(404, 'Student profile not found.');
  }
  return profile;
};

const findFullProfileByUserId = async (userId) =>
  StudentProfile.findOne({ where: { userId }, include: FULL_INCLUDE });

const requireOwnProfile = async (userId) => {
  const profile = await findFullProfileByUserId(userId);
  if (!profile) {
    throw new ApiError(404, 'You do not have a student profile yet.');
  }
  return profile;
};

/** §39: the full creation-transaction validation sequence, in order, exactly as specified. */
const createProfile = async (payload, actorUser) => {
  // 1/2: user existence is guaranteed by requireAuth; re-check status
  // explicitly (requireAuth also accepts PENDING accounts for endpoints
  // that don't need to gate on it — profile creation does).
  if (actorUser.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(403, 'Your account must be active to create a student profile.');
  }

  // 8: at most one student profile per user (§4) — checked up front for
  // a clear error message; the DB's own unique constraint is the actual
  // guarantee against a race.
  const existing = await StudentProfile.findOne({ where: { userId: actorUser.internalId } });
  if (existing) {
    throw new ApiError(409, 'You already have a student profile.');
  }

  // 5: university must exist and be operationally active.
  const university = await assertUniversityIsActive(payload.university_id);

  // 3/4: STUDENT role + an active STUDENT membership at this university.
  await assertActiveStudentMembership(actorUser, university.id);

  // 6/7: program, if supplied, must exist, be active, and belong to
  // this same university — never a cross-institution reference (§6).
  const program = await resolveActiveProgramForUniversity(payload.program_id, university.id);

  let profile;
  try {
    await sequelize.transaction(async (transaction) => {
      profile = await StudentProfile.create(
        {
          userId: actorUser.internalId,
          universityId: university.id,
          programId: program ? program.id : null,
          studentIdentifier: payload.student_identifier || null,
          admissionYear: payload.admission_year ?? null,
          expectedGraduationYear: payload.expected_graduation_year ?? null,
          currentSemester: payload.current_semester ?? null,
          bio: payload.bio || null,
          headline: payload.headline || null,
          profileVisibility: payload.profile_visibility,
          availabilityStatus: payload.availability_status,
        },
        { transaction }
      );

      await recordAuditLog(
        {
          actorUserId: actorUser.internalId,
          action: 'STUDENT_PROFILE_CREATED',
          entityType: 'StudentProfile',
          entityId: profile.id,
          universityId: university.id,
          metadata: { programId: program ? program.id : null },
        },
        { transaction }
      );
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new ApiError(409, 'You already have a student profile.');
    }
    throw error;
  }

  return serializeStudentProfile(await findFullProfileByPublicId(profile.uuid), 'owner');
};

const getMyProfile = async (actorUser) => serializeStudentProfile(await requireOwnProfile(actorUser.internalId), 'owner');

/** §40: program_id is re-validated exactly like at creation (must belong to the profile's own university). */
const updateMyProfile = async (payload, actorUser) => {
  const profile = await requireOwnProfile(actorUser.internalId);

  const changes = {};
  if (payload.program_id !== undefined) {
    const program = await resolveActiveProgramForUniversity(payload.program_id, profile.universityId);
    changes.programId = program ? program.id : null;
  }
  if (payload.admission_year !== undefined) changes.admissionYear = payload.admission_year;
  if (payload.expected_graduation_year !== undefined) changes.expectedGraduationYear = payload.expected_graduation_year;
  if (payload.current_semester !== undefined) changes.currentSemester = payload.current_semester;
  if (payload.bio !== undefined) changes.bio = payload.bio || null;
  if (payload.headline !== undefined) changes.headline = payload.headline || null;
  if (payload.profile_visibility !== undefined) changes.profileVisibility = payload.profile_visibility;
  if (payload.availability_status !== undefined) changes.availabilityStatus = payload.availability_status;

  await profile.update(changes);

  return serializeStudentProfile(await findFullProfileByPublicId(profile.uuid), 'owner');
};

/** §7/§27: academic_status changes via its own endpoint, audited every time — mirrors the university status pattern. */
const updateMyProfileStatus = async (status, actorUser) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const previousStatus = profile.academicStatus;

  await sequelize.transaction(async (transaction) => {
    await profile.update({ academicStatus: status }, { transaction });
    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'STUDENT_PROFILE_STATUS_CHANGED',
        entityType: 'StudentProfile',
        entityId: profile.id,
        universityId: profile.universityId,
        metadata: { from: previousStatus, to: status },
      },
      { transaction }
    );
  });

  return serializeStudentProfile(await findFullProfileByPublicId(profile.uuid), 'owner');
};

/** §26/§27: the public/discovery read — visibility-enforced, 404 (not 403) when denied (see serializer). */
const getProfileForViewer = async (profileUuid, viewer) => {
  const profile = await findFullProfileByPublicId(profileUuid);
  const access = await resolveStudentProfileAccess(profile, viewer);
  if (!access) {
    throw new ApiError(404, 'Student profile not found.');
  }
  return serializeStudentProfile(profile, access.tier);
};

module.exports = {
  FULL_INCLUDE,
  findFullProfileByPublicId,
  findFullProfileByUserId,
  requireOwnProfile,
  createProfile,
  getMyProfile,
  updateMyProfile,
  updateMyProfileStatus,
  getProfileForViewer,
};
