const { Router } = require('express');

const validate = require('../../middleware/validate');
const requireAuth = require('../auth/auth.middleware');
const { requirePermission } = require('../auth/rbac.middleware');
const { requireUniversityAccess } = require('../university/university.middleware');
const controller = require('./admin-student.controller');
const { listUniversityStudentsQuerySchema } = require('./admin-student.validator');

/**
 * §35: mounted at /universities/:universityId/students in routes/index.js
 * — kept as its own self-contained router in the student module rather
 * than added to Chunk 04's university.routes.js, per the modular-
 * monolith convention (a domain's routes stay under its own module).
 * `requireUniversityAccess` is the same Chunk 04 middleware every other
 * university-scoped admin endpoint uses: SUPER_ADMIN unconditionally, or
 * a UNIVERSITY_ADMIN scoped to this exact university — never another
 * university's admin.
 */
const router = Router({ mergeParams: true });

router.get(
  '/',
  requireAuth,
  requirePermission('STUDENT_PROFILE_VIEW'),
  requireUniversityAccess('universityId'),
  validate(listUniversityStudentsQuerySchema, 'query'),
  controller.list
);

module.exports = router;
