const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('../modules/auth/auth.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const universityRoutes = require('../modules/university/university.routes');
const facultyRoutes = require('../modules/university/faculty.routes');
const departmentRoutes = require('../modules/university/department.routes');
const programRoutes = require('../modules/university/program.routes');
const userUniversityRoutes = require('../modules/university/users.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/universities', universityRoutes);
router.use('/faculties', facultyRoutes);
router.use('/departments', departmentRoutes);
router.use('/programs', programRoutes);
router.use('/users', userUniversityRoutes);

/**
 * Future domain routers mount here, one line each. Each domain lives
 * under src/modules/<domain> and stays self-contained.
 */

module.exports = router;
