const { Router } = require('express');

const validate = require('../../middleware/validate');
const { profileMutationRateLimiter } = require('../../middleware/rateLimiter');
const requireAuth = require('../auth/auth.middleware');
const { optionalAuth } = requireAuth;

const profileController = require('./student-profile.controller');
const { createProfileSchema, updateProfileSchema, updateStatusSchema } = require('./student-profile.validator');

const skillController = require('./skill.controller');
const { addStudentSkillSchema, updateStudentSkillSchema } = require('./skill.validator');

const interestController = require('./interest.controller');
const { addStudentInterestSchema } = require('./interest.validator');

const researchAreaController = require('./research-area.controller');
const { addStudentResearchInterestSchema } = require('./research-area.validator');

const languageController = require('./language.controller');
const { addStudentLanguageSchema, updateStudentLanguageSchema } = require('./language.validator');

const certificationController = require('./certification.controller');
const { createCertificationSchema, updateCertificationSchema } = require('./certification.validator');

const achievementController = require('./achievement.controller');
const { createAchievementSchema, updateAchievementSchema } = require('./achievement.validator');

const goalController = require('./goal.controller');
const { createGoalSchema, updateGoalSchema } = require('./goal.validator');

const router = Router();

// "me" routes must be registered before ":id/profile" — otherwise
// Express would treat "me" as a value for the ":id" param (same
// precedent as university/users.routes.js).

// ---- Profile (§27) ----------------------------------------------------------
router.get('/me/profile', requireAuth, profileController.getMine);
router.post(
  '/me/profile',
  requireAuth,
  profileMutationRateLimiter,
  validate(createProfileSchema),
  profileController.create
);
router.put(
  '/me/profile',
  requireAuth,
  profileMutationRateLimiter,
  validate(updateProfileSchema),
  profileController.update
);
router.patch(
  '/me/profile/status',
  requireAuth,
  profileMutationRateLimiter,
  validate(updateStatusSchema),
  profileController.updateStatus
);

// ---- Skills (§28) -------------------------------------------------------------
router.post(
  '/me/skills',
  requireAuth,
  profileMutationRateLimiter,
  validate(addStudentSkillSchema),
  skillController.add
);
router.put(
  '/me/skills/:skillId',
  requireAuth,
  profileMutationRateLimiter,
  validate(updateStudentSkillSchema),
  skillController.update
);
router.delete('/me/skills/:skillId', requireAuth, profileMutationRateLimiter, skillController.remove);

// ---- Interests (§29) -----------------------------------------------------------
router.post(
  '/me/interests',
  requireAuth,
  profileMutationRateLimiter,
  validate(addStudentInterestSchema),
  interestController.add
);
router.delete('/me/interests/:interestId', requireAuth, profileMutationRateLimiter, interestController.remove);

// ---- Research interests (§30) ---------------------------------------------------
router.post(
  '/me/research-interests',
  requireAuth,
  profileMutationRateLimiter,
  validate(addStudentResearchInterestSchema),
  researchAreaController.add
);
router.delete('/me/research-interests/:id', requireAuth, profileMutationRateLimiter, researchAreaController.remove);

// ---- Languages (§31) --------------------------------------------------------------
router.post(
  '/me/languages',
  requireAuth,
  profileMutationRateLimiter,
  validate(addStudentLanguageSchema),
  languageController.add
);
router.put(
  '/me/languages/:id',
  requireAuth,
  profileMutationRateLimiter,
  validate(updateStudentLanguageSchema),
  languageController.update
);
router.delete('/me/languages/:id', requireAuth, profileMutationRateLimiter, languageController.remove);

// ---- Certifications (§32) -----------------------------------------------------------
router.get('/me/certifications', requireAuth, certificationController.list);
router.post(
  '/me/certifications',
  requireAuth,
  profileMutationRateLimiter,
  validate(createCertificationSchema),
  certificationController.create
);
router.put(
  '/me/certifications/:id',
  requireAuth,
  profileMutationRateLimiter,
  validate(updateCertificationSchema),
  certificationController.update
);
router.delete('/me/certifications/:id', requireAuth, profileMutationRateLimiter, certificationController.remove);

// ---- Achievements (§33) ---------------------------------------------------------------
router.get('/me/achievements', requireAuth, achievementController.list);
router.post(
  '/me/achievements',
  requireAuth,
  profileMutationRateLimiter,
  validate(createAchievementSchema),
  achievementController.create
);
router.put(
  '/me/achievements/:id',
  requireAuth,
  profileMutationRateLimiter,
  validate(updateAchievementSchema),
  achievementController.update
);
router.delete('/me/achievements/:id', requireAuth, profileMutationRateLimiter, achievementController.remove);

// ---- Goals (§34) ------------------------------------------------------------------------
router.get('/me/goals', requireAuth, goalController.list);
router.post('/me/goals', requireAuth, profileMutationRateLimiter, validate(createGoalSchema), goalController.create);
router.put(
  '/me/goals/:id',
  requireAuth,
  profileMutationRateLimiter,
  validate(updateGoalSchema),
  goalController.update
);
router.delete('/me/goals/:id', requireAuth, profileMutationRateLimiter, goalController.remove);

// ---- Public/discovery read (§25/§26/§27) -------------------------------------------------
// optionalAuth: visibility rules (student-profile.serializer.js) decide
// what an anonymous vs. authenticated vs. owner/admin viewer may see —
// the route itself never gates on authentication.
router.get('/:id/profile', optionalAuth, profileController.getPublic);

module.exports = router;
