const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const admin = require('../middleware/admin.middleware');
const adminController = require('../controllers/admin.controller');
const { adminLimiter } = require('../middleware/rateLimiter.middleware');

// All admin routes are protected with authentication and admin middleware
router.use(auth);
router.use(admin);
router.use(adminLimiter); // Apply rate limiter to all admin routes

// Admin routes
router.get('/flagged-transactions', adminController.getAllFlags);
router.get('/top-users', adminController.getTopUsers);
router.get('/transactions/summary', adminController.getTransactionSummary);
router.delete('/users/:userId', adminController.softDeleteUser);
router.delete('/transactions/:transactionId', adminController.softDeleteTransaction);

module.exports = router; 