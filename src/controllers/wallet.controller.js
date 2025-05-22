const { body, validationResult } = require('express-validator');
const walletService = require('../services/wallet.service');

// Validation middleware
const validateAmount = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .isString()
    .notEmpty()
    .withMessage('Currency is required')
];

const validateTransfer = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .isString()
    .notEmpty()
    .withMessage('Currency is required'),
  body('toUserId')
    .isMongoId()
    .withMessage('Invalid recipient ID')
];

// Deposit money
const deposit = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, currency, description } = req.body;
    const result = await walletService.deposit(req.user._id, amount, currency, description);

    res.json({
      success: true,
      message: 'Deposit successful',
      data: {
        transaction: result.transaction,
        newBalances: result.newBalances
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing deposit',
      error: error.message
    });
  }
};

// Withdraw money
const withdraw = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, currency, description } = req.body;
    const result = await walletService.withdraw(req.user._id, amount, currency, description);

    res.json({
      success: true,
      message: 'Withdrawal successful',
      data: {
        transaction: result.transaction,
        newBalances: result.newBalances
      }
    });
  } catch (error) {
    if (error.message.startsWith('Insufficient balance')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error processing withdrawal',
      error: error.message
    });
  }
};

// Transfer money
const transfer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, currency, toUserId, description } = req.body;
    const result = await walletService.transfer(req.user._id, toUserId, amount, currency, description);

    res.json({
      success: true,
      message: 'Transfer successful',
      data: {
        transaction: result.transaction,
        fromUserNewBalances: result.fromUserNewBalances,
        toUserNewBalances: result.toUserNewBalances
      }
    });
  } catch (error) {
    if (error.message.startsWith('Insufficient balance') || 
        error.message === 'Recipient not found' ||
        error.message === 'Cannot transfer to self') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error processing transfer',
      error: error.message
    });
  }
};

// Get transaction history
const getTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await walletService.getTransactionHistory(
      req.user._id,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction history',
      error: error.message
    });
  }
};

// Get wallet balance(s)
const getWalletBalance = async (req, res) => {
  try {
    const balances = await walletService.getWalletBalance(req.user._id);
    res.json({
      success: true,
      data: {
        balances: balances
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching wallet balance',
      error: error.message
    });
  }
};

module.exports = {
  deposit: [validateAmount, deposit],
  withdraw: [validateAmount, withdraw],
  transfer: [validateTransfer, transfer],
  getTransactionHistory,
  getWalletBalance
}; 