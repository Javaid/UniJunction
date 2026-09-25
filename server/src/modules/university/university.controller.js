const universityService = require('./university.service');

const list = async (req, res, next) => {
  try {
    const { universities, pagination } = await universityService.listUniversities(req.query, req.user);
    res.status(200).json({ success: true, data: universities, pagination });
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const university = await universityService.getUniversity(req.params.id, req.user);
    res.status(200).json({ success: true, data: university });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const university = await universityService.createUniversity(req.body, req.user);
    res.status(201).json({ success: true, data: university });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const university = await universityService.updateUniversity(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: university });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const university = await universityService.updateUniversityStatus(req.params.id, req.body.status, req.user);
    res.status(200).json({ success: true, data: university });
  } catch (error) {
    next(error);
  }
};

const updateVerification = async (req, res, next) => {
  try {
    const university = await universityService.updateUniversityVerification(
      req.params.id,
      req.body.status,
      req.user
    );
    res.status(200).json({ success: true, data: university });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, getOne, create, update, updateStatus, updateVerification };
