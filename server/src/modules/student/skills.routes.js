const { Router } = require('express');

const validate = require('../../middleware/validate');
const controller = require('./skill.controller');
const { listSkillsQuerySchema } = require('./skill.validator');

/** §28: public catalog read, mounted at /api/skills. Student mutations live under /api/students/me/skills (student.routes.js). */
const router = Router();

router.get('/', validate(listSkillsQuerySchema, 'query'), controller.list);

module.exports = router;
