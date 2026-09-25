const membershipService = require('./membership.service');

const list = async (req, res, next) => {
  try {
    const { memberships, pagination } = await membershipService.listMemberships(req.university, req.query);
    res.status(200).json({ success: true, data: memberships, pagination });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const membership = await membershipService.createMembership(req.university, req.body, req.user);
    res.status(201).json({ success: true, data: membership });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const membership = await membershipService.updateMembership(
      req.university,
      req.params.membershipId,
      req.body,
      req.user
    );
    res.status(200).json({ success: true, data: membership });
  } catch (error) {
    next(error);
  }
};

const listMine = async (req, res, next) => {
  try {
    const memberships = await membershipService.listUserMemberships(req.user.id);
    res.status(200).json({ success: true, data: memberships });
  } catch (error) {
    next(error);
  }
};

/** §25: a limited, safe view of another user's affiliations — active memberships only. */
const listForUser = async (req, res, next) => {
  try {
    const memberships = await membershipService.listUserMemberships(req.params.userId, { onlyActive: true });
    res.status(200).json({ success: true, data: memberships });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, create, update, listMine, listForUser };
