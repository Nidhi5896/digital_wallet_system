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
router.get('/balances', adminController.getTotalBalance);
router.get('/transactions/summary', adminController.getTransactionSummary);
router.get('/users/top', adminController.getTopUsers);

module.exports = router; 