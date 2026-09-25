const domainService = require('./domain.service');

const list = async (req, res, next) => {
  try {
    const domains = await domainService.listDomains(req.university);
    res.status(200).json({ success: true, data: domains });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const domain = await domainService.createDomain(req.university, req.body, req.user);
    res.status(201).json({ success: true, data: domain });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await domainService.removeDomain(req.university, req.params.domainId, req.user);
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, create, remove };
