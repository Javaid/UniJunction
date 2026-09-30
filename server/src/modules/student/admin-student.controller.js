const adminStudentService = require('./admin-student.service');

const list = async (req, res, next) => {
  try {
    const { students, pagination } = await adminStudentService.listUniversityStudents(req.university, req.query);
    res.status(200).json({ success: true, data: students, pagination });
  } catch (error) {
    next(error);
  }
};

module.exports = { list };
