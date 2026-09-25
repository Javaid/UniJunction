const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Academic Connect API is running',
  });
};

module.exports = { getHealth };
