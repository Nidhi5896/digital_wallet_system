const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const walletController = require('../controllers/wallet.controller');
const { 
  walletOperationLimiter, 
  transferLimiter 
} = require('../middleware/rateLimiter.middleware');

// All routes are protected with authentication
router.use(auth);

// Apply rate limiters to specific routes
router.post('/deposit', walletOperationLimiter, walletController.deposit);
router.post('/withdraw', walletOperationLimiter, walletController.withdraw);
router.post('/transfer', transferLimiter, walletController.transfer);
router.get('/balance', walletController.getWalletBalance);
router.get('/history', walletController.getTransactionHistory);

module.exports = router; 