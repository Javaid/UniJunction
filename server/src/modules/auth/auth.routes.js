const { Router } = require('express');

const validate = require('../../middleware/validate');
const { authRateLimiter } = require('../../middleware/rateLimiter');
const requireAuth = require('./auth.middleware');
const controller = require('./auth.controller');
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  refreshSchema,
  logoutSchema,
} = require('./auth.validator');

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), controller.register);
router.post('/login', authRateLimiter, validate(loginSchema), controller.login);
router.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail);
router.post(
  '/resend-verification',
  authRateLimiter,
  validate(resendVerificationSchema),
  controller.resendVerification
);
router.post('/refresh', authRateLimiter, validate(refreshSchema), controller.refresh);
router.post('/logout', validate(logoutSchema), controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
