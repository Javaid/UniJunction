const interestService = require('./interest.service');

const list = async (req, res, next) => {
  try {
    const { interests, pagination } = await interestService.listInterests(req.query);
    res.status(200).json({ success: true, data: interests, pagination });
  } catch (error) {
    next(error);
  }
};

const add = async (req, res, next) => {
  try {
    const interest = await interestService.addStudentInterest(req.user, req.body);
    res.status(201).json({ success: true, data: interest });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await interestService.removeStudentInterest(req.user, req.params.interestId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { list, add, remove };
