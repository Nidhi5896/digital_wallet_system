const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const admin = require('../middleware/admin.middleware');
const adminController = require('../controllers/admin.controller');

// All admin routes are protected with authentication and admin middleware
router.use(auth);
router.use(admin);

// Admin endpoints
router.get('/flags', adminController.getAllFlags);
router.get('/top-users', adminController.getTopUsers);
router.get('/balances', adminController.getTotalBalance);
router.get('/transactions/summary', adminController.getTransactionSummary);

module.exports = router; 