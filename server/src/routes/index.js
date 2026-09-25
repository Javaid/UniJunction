const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('../modules/auth/auth.routes');
const adminRoutes = require('../modules/admin/admin.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

/**
 * Future domain routers mount here, one line each, e.g.:
 *   router.use('/users', userRoutes);
 *   router.use('/universities', universityRoutes);
 * Each domain lives under src/modules/<domain> and stays self-contained.
 */

module.exports = router;
