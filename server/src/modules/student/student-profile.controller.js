const studentProfileService = require('./student-profile.service');

const getMine = async (req, res, next) => {
  try {
    const profile = await studentProfileService.getMyProfile(req.user);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const profile = await studentProfileService.createProfile(req.body, req.user);
    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const profile = await studentProfileService.updateMyProfile(req.body, req.user);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const profile = await studentProfileService.updateMyProfileStatus(req.body.status, req.user);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

const getPublic = async (req, res, next) => {
  try {
    const profile = await studentProfileService.getProfileForViewer(req.params.id, req.user);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMine, create, update, updateStatus, getPublic };
