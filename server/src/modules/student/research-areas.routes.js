const { Router } = require('express');

const validate = require('../../middleware/validate');
const controller = require('./research-area.controller');
const { listResearchAreasQuerySchema } = require('./research-area.validator');

/** §30: public, hierarchy-aware catalog read, mounted at /api/research-areas. */
const router = Router();

router.get('/', validate(listResearchAreasQuerySchema, 'query'), controller.list);

module.exports = router;
