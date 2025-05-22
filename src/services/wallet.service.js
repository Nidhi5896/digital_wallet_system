const mongoose = require('mongoose');
const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const User = require('../models/user.model');
const FlaggedTransaction = require('../models/flaggedTransaction.model');
const currencyService = require('./currency.service');

// Fraud detection limits
const MAX_TRANSFERS_PER_MINUTE = 2;
const MAX_FAILED_TRANSACTIONS_PER_PERIOD = 5;
const FAILED_TRANSACTIONS_PERIOD_MINUTES = 15;

class WalletService {
  constructor() {
    // Initialize currency service
    this.initializeCurrencyService();
  }

  async initializeCurrencyService() {
    try {
      await currencyService.initializeRates();
    } catch (error) {
      console.error('Failed to initialize currency service:', error);
      throw error;
    }
  }

  // Get or create wallet for user
  async getOrCreateWallet(userId) {
    try {
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        wallet = await Wallet.create({ user: userId });
      }
      return wallet;
    } catch (error) {
      console.error('Error in getOrCreateWallet:', error);
      throw new Error('Failed to get or create wallet');
    }
  }

  // Validate transaction amount and currency
  validateTransaction(amount, currency) {
    if (!amount || amount <= 0) {
      throw new Error('Amount must be positive');
    }
    if (!currency || !currencyService.isValidCurrency(currency)) {
      throw new Error('Invalid currency');
    }
  }

  // Deposit money
  async deposit(userId, amount, currency, description = 'Deposit') {
    this.validateTransaction(amount, currency);
    
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const wallet = await this.getOrCreateWallet(userId);

      // Generate unique reference
      const reference = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Create transaction record
      const transaction = await Transaction.create([{
        type: 'deposit',
        amount,
        currency,
        toUser: userId,
        status: 'pending',
        description,
        reference
      }], { session });

      // Update wallet balance
      await wallet.addAmount(amount, currency);

      // Update transaction status
      transaction[0].status = 'completed';
      await transaction[0].save({ session });

      await session.commitTransaction();
      
      return {
        transaction: transaction[0],
        newBalance: wallet.getFormattedBalance(currency),
        allBalances: wallet.getAllBalances(),
        isFlagged: false
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Error in deposit:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Withdraw money
  async withdraw(userId, amount, currency, description = 'Withdrawal') {
    this.validateTransaction(amount, currency);
    
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const wallet = await this.getOrCreateWallet(userId);

      // Generate unique reference
      const reference = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Create transaction record
      const transaction = await Transaction.create([{
        type: 'withdrawal',
        amount,
        currency,
        fromUser: userId,
        status: 'pending',
        description,
        reference
      }], { session });

      // Update wallet balance
      await wallet.subtractAmount(amount, currency);

      // Update transaction status
      transaction[0].status = 'completed';
      await transaction[0].save({ session });

      // Check for fraud after successful withdrawal
      const isFlagged = await this.flagTransaction(transaction[0], userId);

      await session.commitTransaction();
      
      return {
        transaction: transaction[0],
        newBalance: wallet.getFormattedBalance(currency),
        allBalances: wallet.getAllBalances(),
        isFlagged
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Error in withdraw:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Transfer money
  async transfer(fromUserId, toUserId, amount, currency, description = 'Transfer') {
    this.validateTransaction(amount, currency);

    if (fromUserId.toString() === toUserId.toString()) {
      throw new Error('Cannot transfer to self');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Verify recipient exists
      const recipient = await User.findById(toUserId);
      if (!recipient) {
        throw new Error('Recipient not found');
      }

      const fromWallet = await this.getOrCreateWallet(fromUserId);
      const toWallet = await this.getOrCreateWallet(toUserId);

      // Generate unique reference
      const reference = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Create transaction record
      const transaction = await Transaction.create([{
        type: 'transfer',
        amount,
        currency,
        fromUser: fromUserId,
        toUser: toUserId,
        status: 'pending',
        description,
        reference
      }], { session });

      // Update wallet balances
      await fromWallet.subtractAmount(amount, currency);
      await toWallet.addAmount(amount, currency);

      // Update transaction status
      transaction[0].status = 'completed';
      await transaction[0].save({ session });

      // Check for fraud after successful transfer
      const isFlagged = await this.flagTransaction(transaction[0], fromUserId);

      await session.commitTransaction();
      
      return {
        transaction: transaction[0],
        fromUserNewBalance: fromWallet.getFormattedBalance(currency),
        toUserNewBalance: toWallet.getFormattedBalance(currency),
        fromUserAllBalances: fromWallet.getAllBalances(),
        toUserAllBalances: toWallet.getAllBalances(),
        isFlagged
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Error in transfer:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Get wallet balance
  async getWalletBalance(userId, currency) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      return {
        balance: wallet.getFormattedBalance(currency || wallet.preferredCurrency),
        preferredCurrency: wallet.preferredCurrency,
        allBalances: wallet.getAllBalances()
      };
    } catch (error) {
      console.error('Error in getWalletBalance:', error);
      throw error;
    }
  }

  // Get transaction history
  async getTransactionHistory(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const transactions = await Transaction.find({
        $or: [
          { fromUser: userId },
          { toUser: userId }
        ],
        isDeleted: false
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('fromUser', 'email firstName lastName')
      .populate('toUser', 'email firstName lastName');

      const total = await Transaction.countDocuments({
        $or: [
          { fromUser: userId },
          { toUser: userId }
        ],
        isDeleted: false
      });

      return {
        transactions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in getTransactionHistory:', error);
      throw error;
    }
  }

  // Flag suspicious transaction
  async flagTransaction(transaction, userId) {
    try {
      const isFlagged = await this.checkForFraud(transaction, userId);
      
      if (isFlagged) {
        await FlaggedTransaction.create({
          transaction: transaction._id,
          user: userId,
          reason: 'Suspicious activity detected'
        });
      }
      
      return isFlagged;
    } catch (error) {
      console.error('Error in flagTransaction:', error);
      throw error;
    }
  }

  // Check for fraud
  async checkForFraud(transaction, userId) {
    try {
      // Check for rapid transfers
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentTransfers = await Transaction.countDocuments({
        fromUser: userId,
        type: 'transfer',
        createdAt: { $gte: oneMinuteAgo },
        status: 'completed',
        isDeleted: false
      });

      if (recentTransfers >= MAX_TRANSFERS_PER_MINUTE) {
        return true;
      }

      // Add more fraud detection logic here
      return false;
    } catch (error) {
      console.error('Error in checkForFraud:', error);
      throw error;
    }
  }
}

module.exports = new WalletService(); 