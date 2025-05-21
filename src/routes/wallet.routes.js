const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const walletController = require('../controllers/wallet.controller');

// All routes are protected with authentication
router.use(auth);

// Wallet operations
router.post('/deposit', walletController.deposit);
router.post('/withdraw', walletController.withdraw);
router.post('/transfer', walletController.transfer);
router.get('/history', walletController.getTransactionHistory);

// Get wallet balance
router.get('/balance', walletController.getWalletBalance);

module.exports = router; 