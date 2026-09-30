const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('../modules/auth/auth.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const universityRoutes = require('../modules/university/university.routes');
const facultyRoutes = require('../modules/university/faculty.routes');
const departmentRoutes = require('../modules/university/department.routes');
const programRoutes = require('../modules/university/program.routes');
const userUniversityRoutes = require('../modules/university/users.routes');
const studentRoutes = require('../modules/student/student.routes');
const skillsRoutes = require('../modules/student/skills.routes');
const interestsRoutes = require('../modules/student/interests.routes');
const researchAreasRoutes = require('../modules/student/research-areas.routes');
const languagesRoutes = require('../modules/student/languages.routes');
const adminStudentRoutes = require('../modules/student/admin-student.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/universities/:universityId/students', adminStudentRoutes);
router.use('/universities', universityRoutes);
router.use('/faculties', facultyRoutes);
router.use('/departments', departmentRoutes);
router.use('/programs', programRoutes);
router.use('/users', userUniversityRoutes);
router.use('/students', studentRoutes);
router.use('/skills', skillsRoutes);
router.use('/interests', interestsRoutes);
router.use('/research-areas', researchAreasRoutes);
router.use('/languages', languagesRoutes);

/**
 * Future domain routers mount here, one line each. Each domain lives
 * under src/modules/<domain> and stays self-contained.
 */

module.exports = router;
