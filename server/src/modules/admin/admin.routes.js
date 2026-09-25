const { Router } = require('express');

const validate = require('../../middleware/validate');
const requireAuth = require('../auth/auth.middleware');
const { requirePermission } = require('../auth/rbac.middleware');
const controller = require('./admin.controller');
const universityAdminController = require('./university-admin.controller');
const { listUsersQuerySchema, assignRoleSchema } = require('./admin.validator');
const { assignUniversityAdminSchema } = require('./university-admin.validator');

const router = Router();

router.get(
  '/users',
  requireAuth,
  requirePermission('USER_VIEW'),
  validate(listUsersQuerySchema, 'query'),
  controller.listUsers
);

router.post(
  '/users/:userId/roles',
  requireAuth,
  requirePermission('ROLE_ASSIGN'),
  validate(assignRoleSchema),
  controller.assignRole
);

router.delete(
  '/users/:userId/roles/:role',
  requireAuth,
  requirePermission('ROLE_ASSIGN'),
  controller.removeRole
);

// §23/§24: university administrator assignment. Route-level permission
// keeps this SUPER_ADMIN-only for assignment; listing additionally
// checks university-scoped access (see university-admin.controller.js)
// so a UNIVERSITY_ADMIN can see only their own university's admins.
router.post(
  '/universities/:universityId/admins',
  requireAuth,
  requirePermission('UNIVERSITY_ADMIN_ASSIGN'),
  validate(assignUniversityAdminSchema),
  universityAdminController.assign
);

router.get(
  '/universities/:universityId/admins',
  requireAuth,
  requirePermission('UNIVERSITY_ADMIN_VIEW'),
  universityAdminController.list
);

module.exports = router;
