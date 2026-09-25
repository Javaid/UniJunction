const { findByPublicId } = require('../university/university.service');
const { assertUniversityAccess } = require('../university/access.service');
const { assignUniversityAdmin, listUniversityAdmins } = require('../university/admin-assignment.service');

/** §23: only SUPER_ADMIN reaches here in practice (route-level requirePermission('UNIVERSITY_ADMIN_ASSIGN')). */
const assign = async (req, res, next) => {
  try {
    const university = await findByPublicId(req.params.universityId);
    await assertUniversityAccess(req.user, university.id);
    const user = await assignUniversityAdmin(university, req.body.userId, req.user);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/** §24: SUPER_ADMIN sees any university's admins; a UNIVERSITY_ADMIN only their own (assertUniversityAccess). */
const list = async (req, res, next) => {
  try {
    const university = await findByPublicId(req.params.universityId);
    await assertUniversityAccess(req.user, university.id);
    const admins = await listUniversityAdmins(university);
    res.status(200).json({ success: true, data: admins });
  } catch (error) {
    next(error);
  }
};

module.exports = { assign, list };
