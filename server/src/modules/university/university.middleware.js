const universityService = require('./university.service');
const { assertUniversityAccess } = require('./access.service');

/**
 * Resolves the `:id` URL param to a University row (404 if not found),
 * asserts the authenticated user may manage/view it at admin level
 * (access.service.js), and attaches the row to `req.university` so the
 * downstream controller doesn't re-fetch it. Used on every nested
 * mutating endpoint (`/universities/:id/faculties`, `/domains`,
 * `/members`, ...) and on the admin-only domain/member listing
 * endpoints — see chunk brief §31, "resolve the resource, then verify
 * access."
 *
 * Must run after `requireAuth`.
 */
const requireUniversityAccess = (paramName = 'id') => async (req, res, next) => {
  try {
    const university = await universityService.findByPublicId(req.params[paramName]);
    await assertUniversityAccess(req.user, university.id);
    req.university = university;
    next();
  } catch (error) {
    next(error);
  }
};

/** Resolves `:id` to `req.university` with no access check — for public nested reads (faculties/departments/programs). */
const loadUniversity = (paramName = 'id') => async (req, res, next) => {
  try {
    req.university = await universityService.findByPublicId(req.params[paramName]);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireUniversityAccess, loadUniversity };
