const { Router } = require('express');

const validate = require('../../middleware/validate');
const requireAuth = require('../auth/auth.middleware');
const { requirePermission } = require('../auth/rbac.middleware');
const controller = require('./admin.controller');
const { listUsersQuerySchema, assignRoleSchema } = require('./admin.validator');

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

module.exports = router;
