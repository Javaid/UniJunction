const { Router } = require('express');

const requireAuth = require('../auth/auth.middleware');
const controller = require('./membership.controller');

const router = Router();

// §25: membership API foundation — not a full public profile system yet.
// "me" must come before ":userId" or Express would treat "me" as a userId.
router.get('/me/universities', requireAuth, controller.listMine);
router.get('/:userId/universities', requireAuth, controller.listForUser);

module.exports = router;
