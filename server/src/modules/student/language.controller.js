const languageService = require('./language.service');

const list = async (req, res, next) => {
  try {
    const languages = await languageService.listLanguages(req.query);
    res.status(200).json({ success: true, data: languages });
  } catch (error) {
    next(error);
  }
};

const add = async (req, res, next) => {
  try {
    const language = await languageService.addStudentLanguage(req.user, req.body);
    res.status(201).json({ success: true, data: language });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const language = await languageService.updateStudentLanguage(req.user, req.params.id, req.body);
    res.status(200).json({ success: true, data: language });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await languageService.removeStudentLanguage(req.user, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { list, add, update, remove };
