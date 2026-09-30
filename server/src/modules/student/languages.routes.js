const { Router } = require('express');

const validate = require('../../middleware/validate');
const controller = require('./language.controller');
const { listLanguagesQuerySchema } = require('./language.validator');

/** §31: public catalog read, mounted at /api/languages. */
const router = Router();

router.get('/', validate(listLanguagesQuerySchema, 'query'), controller.list);

module.exports = router;
