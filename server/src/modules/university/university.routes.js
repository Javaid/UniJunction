const { Router } = require('express');

const validate = require('../../middleware/validate');
const requireAuth = require('../auth/auth.middleware');
const { optionalAuth } = requireAuth;
const { requirePermission } = require('../auth/rbac.middleware');
const { requireUniversityAccess, loadUniversity } = require('./university.middleware');

const universityController = require('./university.controller');
const facultyController = require('./faculty.controller');
const departmentController = require('./department.controller');
const programController = require('./program.controller');
const domainController = require('./domain.controller');
const membershipController = require('./membership.controller');

const {
  createUniversitySchema,
  updateUniversitySchema,
  updateStatusSchema,
  updateVerificationSchema,
  listUniversitiesQuerySchema,
} = require('./university.validator');
const {
  createFacultySchema,
  listFacultiesQuerySchema,
  createDepartmentSchema,
  listDepartmentsQuerySchema,
  createProgramSchema,
  listProgramsQuerySchema,
} = require('./institution.validator');
const { createDomainSchema } = require('./domain.validator');
const { createMembershipSchema, updateMembershipSchema, listMembershipsQuerySchema } = require('./membership.validator');

const router = Router();

// ---- University CRUD (§7–§14) ----------------------------------------------
// Reads are public (cross-university discoverability — see
// docs/database-guidelines.md §9); optionalAuth lets the serializer
// return the richer admin view when the caller is authorized for it
// (docs/university-management.md, "Public vs. admin data").
router.get('/', optionalAuth, validate(listUniversitiesQuerySchema, 'query'), universityController.list);
router.get('/:id', optionalAuth, universityController.getOne);

router.post(
  '/',
  requireAuth,
  requirePermission('UNIVERSITY_CREATE'),
  validate(createUniversitySchema),
  universityController.create
);

router.put(
  '/:id',
  requireAuth,
  requirePermission('UNIVERSITY_UPDATE'),
  requireUniversityAccess('id'),
  validate(updateUniversitySchema),
  universityController.update
);

router.patch(
  '/:id/status',
  requireAuth,
  requirePermission('UNIVERSITY_STATUS_UPDATE'),
  requireUniversityAccess('id'),
  validate(updateStatusSchema),
  universityController.updateStatus
);

router.patch(
  '/:id/verification',
  requireAuth,
  requirePermission('UNIVERSITY_VERIFY'),
  requireUniversityAccess('id'),
  validate(updateVerificationSchema),
  universityController.updateVerification
);

// ---- Domains (§15–§16) — not public; SUPER_ADMIN or own UNIVERSITY_ADMIN --
router.get(
  '/:id/domains',
  requireAuth,
  requirePermission('UNIVERSITY_DOMAIN_VIEW'),
  requireUniversityAccess('id'),
  domainController.list
);

router.post(
  '/:id/domains',
  requireAuth,
  requirePermission('UNIVERSITY_DOMAIN_MANAGE'),
  requireUniversityAccess('id'),
  validate(createDomainSchema),
  domainController.create
);

router.delete(
  '/:id/domains/:domainId',
  requireAuth,
  requirePermission('UNIVERSITY_DOMAIN_MANAGE'),
  requireUniversityAccess('id'),
  domainController.remove
);

// ---- Faculties (§17–§18) — reads public, writes scoped ---------------------
router.get(
  '/:id/faculties',
  loadUniversity('id'),
  validate(listFacultiesQuerySchema, 'query'),
  facultyController.list
);

router.post(
  '/:id/faculties',
  requireAuth,
  requirePermission('FACULTY_CREATE'),
  requireUniversityAccess('id'),
  validate(createFacultySchema),
  facultyController.create
);

// ---- Departments (§19–§20) --------------------------------------------------
router.get(
  '/:id/departments',
  loadUniversity('id'),
  validate(listDepartmentsQuerySchema, 'query'),
  departmentController.list
);

router.post(
  '/:id/departments',
  requireAuth,
  requirePermission('DEPARTMENT_CREATE'),
  requireUniversityAccess('id'),
  validate(createDepartmentSchema),
  departmentController.create
);

// ---- Programs (§21–§22) ------------------------------------------------------
router.get('/:id/programs', loadUniversity('id'), validate(listProgramsQuerySchema, 'query'), programController.list);

router.post(
  '/:id/programs',
  requireAuth,
  requirePermission('PROGRAM_CREATE'),
  requireUniversityAccess('id'),
  validate(createProgramSchema),
  programController.create
);

// ---- Memberships (§25–§27) — admin-level, not public ------------------------
router.get(
  '/:id/members',
  requireAuth,
  requirePermission('UNIVERSITY_MEMBER_VIEW'),
  requireUniversityAccess('id'),
  validate(listMembershipsQuerySchema, 'query'),
  membershipController.list
);

router.post(
  '/:id/members',
  requireAuth,
  requirePermission('UNIVERSITY_MEMBER_CREATE'),
  requireUniversityAccess('id'),
  validate(createMembershipSchema),
  membershipController.create
);

router.patch(
  '/:id/members/:membershipId',
  requireAuth,
  requirePermission('UNIVERSITY_MEMBER_UPDATE'),
  requireUniversityAccess('id'),
  validate(updateMembershipSchema),
  membershipController.update
);

// Flat GET/PUT/status-update routes for faculty/department/program are
// declared in their own *.routes.js files (mounted at /api/faculties
// etc.), since they're addressed by their own id, not nested under a
// university.
module.exports = router;
