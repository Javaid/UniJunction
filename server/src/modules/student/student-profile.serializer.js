const { UniversityMembership } = require('../../models');
const { PROFILE_VISIBILITY, MEMBERSHIP_STATUS } = require('../../utils/enums');
const { toPublicUniversity } = require('../university/university.serializer');
const { assertUniversityAccess } = require('../university/access.service');

/**
 * §24: profile completeness is calculated from real data, never trusted
 * from the client (no endpoint accepts a `profile_completion` field at
 * all — see the validators). Weights are one reasonable choice among
 * many, documented here and in docs/student-profiles.md, "Profile
 * completeness" rather than treated as a fixed law:
 *
 *   Basic academic identity (program selected)   20%
 *   Headline                                     10%
 *   Bio                                           10%
 *   Skills (at least one)                         15%
 *   Interests (at least one)                      10%
 *   Research interests (at least one)             15%
 *   Goals (at least one)                          10%
 *   Achievements or certifications (at least one) 10%
 *                                                 ----
 *                                                 100%
 *
 * Each signal is all-or-nothing (present or not) rather than partial
 * credit within a signal — simple, predictable, and easy to explain back
 * to the student in the "complete your profile" UI.
 */
const COMPLETENESS_SIGNALS = [
  { key: 'basic_identity', label: 'Select your program', weight: 20, check: (p) => Boolean(p.programId) },
  { key: 'headline', label: 'Add a headline', weight: 10, check: (p) => Boolean(p.headline) },
  { key: 'bio', label: 'Write a short bio', weight: 10, check: (p) => Boolean(p.bio) },
  { key: 'skills', label: 'Add a skill', weight: 15, check: (p) => p.studentSkills.length > 0 },
  { key: 'interests', label: 'Add an academic interest', weight: 10, check: (p) => p.studentInterests.length > 0 },
  {
    key: 'research_interests',
    label: 'Add a research interest',
    weight: 15,
    check: (p) => p.studentResearchInterests.length > 0,
  },
  { key: 'goals', label: 'Add an academic goal', weight: 10, check: (p) => p.goals.length > 0 },
  {
    key: 'achievements_or_certifications',
    label: 'Add a certification or achievement',
    weight: 10,
    check: (p) => p.achievements.length > 0 || p.certifications.length > 0,
  },
];

const calculateProfileCompleteness = (profile) => {
  const missing = [];
  let score = 0;

  for (const signal of COMPLETENESS_SIGNALS) {
    if (signal.check(profile)) {
      score += signal.weight;
    } else {
      missing.push({ label: signal.label, points: signal.weight });
    }
  }

  return { score, missing };
};

const resolveRoleContext = (viewer) => {
  if (viewer.roles.includes('FACULTY')) return 'FACULTY';
  if (viewer.roles.includes('RESEARCHER')) return 'RESEARCHER';
  if (viewer.roles.includes('STUDENT')) return 'STUDENT';
  return 'AUTHENTICATED';
};

/**
 * §26: the single, centralized visibility decision — never duplicated
 * across controllers. Returns `{ tier: 'owner' | 'admin' | 'public',
 * context }` describing what the viewer may see, or `null` if access is
 * denied entirely. See docs/student-profiles.md, "Visibility
 * enforcement" for the full decision table, including why
 * CONNECTIONS_ONLY is conservatively treated as PRIVATE until the
 * Connections domain exists.
 */
const resolveStudentProfileAccess = async (profile, viewer) => {
  const visibility = profile.profileVisibility;

  if (!viewer) {
    return visibility === PROFILE_VISIBILITY.PUBLIC ? { tier: 'public', context: 'ANONYMOUS' } : null;
  }

  if (Number(viewer.internalId) === Number(profile.userId)) {
    return { tier: 'owner', context: 'OWNER' };
  }

  // Institutional oversight always wins over the owner's visibility
  // choice (§9/§41) — SUPER_ADMIN unconditionally, or a UNIVERSITY_ADMIN
  // scoped to this exact university (access.service.js does both
  // checks). A failure here just means "not an institutional admin for
  // this university," not a hard denial — fall through to visibility.
  try {
    await assertUniversityAccess(viewer, profile.universityId);
    return { tier: 'admin', context: viewer.roles.includes('SUPER_ADMIN') ? 'SUPER_ADMIN' : 'UNIVERSITY_ADMIN' };
  } catch (error) {
    // not an institutional admin for this university — continue below
  }

  const context = resolveRoleContext(viewer);

  if (visibility === PROFILE_VISIBILITY.PUBLIC || visibility === PROFILE_VISIBILITY.ACADEMIC_NETWORK) {
    return { tier: 'public', context };
  }

  if (visibility === PROFILE_VISIBILITY.UNIVERSITY_ONLY) {
    const membership = await UniversityMembership.findOne({
      where: { userId: viewer.internalId, universityId: profile.universityId, status: MEMBERSHIP_STATUS.ACTIVE },
    });
    return membership ? { tier: 'public', context } : null;
  }

  // CONNECTIONS_ONLY: no Connections domain exists yet (explicitly out of
  // scope — see docs/student-profiles.md), so this is conservatively
  // enforced as equivalent to PRIVATE rather than accidentally public.
  // PRIVATE: owner/admin only, both already handled above.
  return null;
};

const minimalUser = (user) => ({
  first_name: user.firstName,
  last_name: user.lastName,
  display_name: user.displayName,
});

const serializeSkill = (studentSkill) => {
  const plain = studentSkill.toJSON ? studentSkill.toJSON() : studentSkill;
  return {
    id: plain.skill.uuid,
    name: plain.skill.name,
    category: plain.skill.category,
    proficiency_level: plain.proficiencyLevel,
    years_experience: plain.yearsExperience,
  };
};

const serializeInterest = (studentInterest) => {
  const plain = studentInterest.toJSON ? studentInterest.toJSON() : studentInterest;
  return { id: plain.interest.uuid, name: plain.interest.name, category: plain.interest.category };
};

const serializeResearchInterest = (studentResearchInterest) => {
  const plain = studentResearchInterest.toJSON ? studentResearchInterest.toJSON() : studentResearchInterest;
  return {
    id: plain.researchArea.uuid,
    name: plain.researchArea.name,
    parent_id: plain.researchArea.parentId ?? null,
    interest_level: plain.interestLevel,
  };
};

const serializeLanguage = (studentLanguage) => {
  const plain = studentLanguage.toJSON ? studentLanguage.toJSON() : studentLanguage;
  return {
    id: plain.language.uuid,
    name: plain.language.name,
    code: plain.language.code,
    proficiency_level: plain.proficiencyLevel,
  };
};

const serializeCertification = (certification) => {
  const plain = certification.toJSON ? certification.toJSON() : certification;
  return {
    id: plain.uuid,
    name: plain.name,
    issuing_organization: plain.issuingOrganization,
    issue_date: plain.issueDate,
    expiry_date: plain.expiryDate,
    credential_id: plain.credentialId,
    credential_url: plain.credentialUrl,
    description: plain.description,
    created_at: plain.createdAt,
    updated_at: plain.updatedAt,
  };
};

const serializeAchievement = (achievement) => {
  const plain = achievement.toJSON ? achievement.toJSON() : achievement;
  return {
    id: plain.uuid,
    title: plain.title,
    description: plain.description,
    organization: plain.organization,
    achievement_date: plain.achievementDate,
    url: plain.url,
    created_at: plain.createdAt,
    updated_at: plain.updatedAt,
  };
};

const serializeGoal = (goal) => {
  const plain = goal.toJSON ? goal.toJSON() : goal;
  return {
    id: plain.uuid,
    goal_type: plain.goalType,
    title: plain.title,
    description: plain.description,
    target_date: plain.targetDate,
    status: plain.status,
    created_at: plain.createdAt,
    updated_at: plain.updatedAt,
  };
};

/**
 * §25/§55: the safe, shared shape every authorized viewer (public,
 * owner, or admin tier) sees. Never includes email, phone, student
 * identifier, internal numeric ids, or any other field §25/§43 call out
 * as unsafe to expose by default.
 */
const buildProfileContent = (profile) => ({
  id: profile.uuid,
  user: minimalUser(profile.user),
  university: toPublicUniversity(profile.university),
  program: profile.program
    ? { id: profile.program.uuid, name: profile.program.name, degree_level: profile.program.degreeLevel }
    : null,
  headline: profile.headline,
  bio: profile.bio,
  availability_status: profile.availabilityStatus,
  skills: profile.studentSkills.map(serializeSkill),
  interests: profile.studentInterests.map(serializeInterest),
  research_interests: profile.studentResearchInterests.map(serializeResearchInterest),
  languages: profile.studentLanguages.map(serializeLanguage),
  certifications: profile.certifications.map(serializeCertification),
  achievements: profile.achievements.map(serializeAchievement),
  goals: profile.goals.map(serializeGoal),
});

/** §3/§25: student_identifier and other institutional/administrative fields — owner or admin tier only. */
const toOwnerOrAdminStudentProfile = (profile) => ({
  ...buildProfileContent(profile),
  student_identifier: profile.studentIdentifier,
  admission_year: profile.admissionYear,
  expected_graduation_year: profile.expectedGraduationYear,
  current_semester: profile.currentSemester,
  academic_status: profile.academicStatus,
  profile_visibility: profile.profileVisibility,
  created_at: profile.createdAt,
  updated_at: profile.updatedAt,
  profile_completeness: calculateProfileCompleteness(profile),
});

const toPublicStudentProfile = (profile) => buildProfileContent(profile);

/** §55: dispatches to the safe serializer for the given access tier. Never returns a raw Sequelize instance. */
const serializeStudentProfile = (profile, tier) =>
  tier === 'owner' || tier === 'admin' ? toOwnerOrAdminStudentProfile(profile) : toPublicStudentProfile(profile);

module.exports = {
  calculateProfileCompleteness,
  resolveStudentProfileAccess,
  serializeStudentProfile,
  toPublicStudentProfile,
  toOwnerOrAdminStudentProfile,
  // Individual sub-resource serializers, reused by the skill/interest/
  // research-interest/language/certification/achievement/goal services
  // so a single association's shape is defined in exactly one place.
  serializeSkill,
  serializeInterest,
  serializeResearchInterest,
  serializeLanguage,
  serializeCertification,
  serializeAchievement,
  serializeGoal,
};
