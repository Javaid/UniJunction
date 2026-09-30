/**
 * Shared fixtures for the Chunk 05 student-profile integration tests.
 * Mirrors institutionFixtures.js's pattern (Chunk 04) — a small, self-
 * sufficient catalog and a "student with an active membership" builder,
 * so these tests never depend on database/seed_catalog.sql having been
 * run separately against the test database.
 */
const { Skill, Interest, ResearchArea, Language, UniversityMembership } = require('../../src/models');
const { MEMBERSHIP_TYPE, MEMBERSHIP_STATUS } = require('../../src/utils/enums');
const { createUserWithRole, loginToken, uniqueEmail } = require('./institutionFixtures');

let counter = 0;

/** A minimal but representative catalog — enough to exercise every relationship, including one research-area hierarchy. */
const seedCatalogSample = async () => {
  const suffix = `${Date.now()}${counter++}`;

  const [python] = await Skill.findOrCreate({
    where: { slug: `python-${suffix}` },
    defaults: { name: `Python ${suffix}`, category: 'PROGRAMMING' },
  });
  const [react] = await Skill.findOrCreate({
    where: { slug: `react-${suffix}` },
    defaults: { name: `React ${suffix}`, category: 'WEB' },
  });

  const [ai] = await Interest.findOrCreate({
    where: { slug: `artificial-intelligence-${suffix}` },
    defaults: { name: `Artificial Intelligence ${suffix}`, category: 'TECHNOLOGY' },
  });
  const [healthcare] = await Interest.findOrCreate({
    where: { slug: `healthcare-${suffix}` },
    defaults: { name: `Healthcare ${suffix}`, category: 'HEALTH' },
  });

  const [aiArea] = await ResearchArea.findOrCreate({
    where: { slug: `ra-ai-${suffix}` },
    defaults: { name: `Artificial Intelligence ${suffix}` },
  });
  const [mlArea] = await ResearchArea.findOrCreate({
    where: { slug: `ra-ml-${suffix}` },
    defaults: { name: `Machine Learning ${suffix}`, parentId: aiArea.id },
  });

  // `languages.code` is VARCHAR(10) — a short counter-only suffix keeps
  // this comfortably under that limit (unlike the Date.now()-based
  // `suffix` used above, which alone would overflow it).
  const shortSuffix = counter;
  const [english] = await Language.findOrCreate({
    where: { code: `en${shortSuffix}` },
    defaults: { name: `English ${suffix}` },
  });
  const [spanish] = await Language.findOrCreate({
    where: { code: `es${shortSuffix}` },
    defaults: { name: `Spanish ${suffix}` },
  });

  return { python, react, ai, healthcare, aiArea, mlArea, english, spanish };
};

/** A STUDENT-role user with an ACTIVE STUDENT membership at `university` — the combination student-access.service.js requires. */
const createStudentMember = async (university, overrides = {}) => {
  const user = await createUserWithRole('STUDENT', { email: overrides.email || uniqueEmail('student') });
  await UniversityMembership.create({
    userId: user.id,
    universityId: university.id,
    membershipType: MEMBERSHIP_TYPE.STUDENT,
    status: overrides.membershipStatus || MEMBERSHIP_STATUS.ACTIVE,
  });
  const token = await loginToken(user.email);
  return { user, token };
};

module.exports = { seedCatalogSample, createStudentMember };
