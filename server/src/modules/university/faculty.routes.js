const { Router } = require('express');

const validate = require('../../middleware/validate');
const requireAuth = require('../auth/auth.middleware');
const { requirePermission } = require('../auth/rbac.middleware');
const controller = require('./faculty.controller');
const { updateFacultySchema, updateStatusSchema } = require('./institution.validator');

const router = Router();

// GET is public — see university.routes.js for the reasoning. Ownership
// (§20) is checked inside the service once the faculty (and therefore
// its university) is resolved from :id — never trusted from the client.
router.get('/:id', controller.getOne);

router.put(
  '/:id',
  requireAuth,
  requirePermission('FACULTY_UPDATE'),
  validate(updateFacultySchema),
  controller.update
);

router.patch(
  '/:id/status',
  requireAuth,
  requirePermission('FACULTY_STATUS_UPDATE'),
  validate(updateStatusSchema),
  controller.updateStatus
);

module.exports = router;
