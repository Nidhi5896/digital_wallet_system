const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const admin = async (req, res, next) => {
  // Check if user is authenticated and is an admin
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Admin access required' });
  }
};

module.exports = admin; 