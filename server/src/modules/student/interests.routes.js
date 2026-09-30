const { Router } = require('express');

const validate = require('../../middleware/validate');
const controller = require('./interest.controller');
const { listInterestsQuerySchema } = require('./interest.validator');

/** §29: public catalog read, mounted at /api/interests. */
const router = Router();

router.get('/', validate(listInterestsQuerySchema, 'query'), controller.list);

module.exports = router;
