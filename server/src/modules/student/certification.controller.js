const certificationService = require('./certification.service');

const list = async (req, res, next) => {
  try {
    const certifications = await certificationService.listMyCertifications(req.user);
    res.status(200).json({ success: true, data: certifications });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const certification = await certificationService.createCertification(req.user, req.body);
    res.status(201).json({ success: true, data: certification });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const certification = await certificationService.updateCertification(req.user, req.params.id, req.body);
    res.status(200).json({ success: true, data: certification });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await certificationService.deleteCertification(req.user, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { list, create, update, remove };
