const mongoose = require('mongoose');
const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const User = require('../models/user.model');
const FlaggedTransaction = require('../models/flaggedTransaction.model');

// Fraud detection limits (can be moved to config)
const MAX_TRANSFERS_PER_MINUTE = 2;
const LARGE_WITHDRAWAL_THRESHOLD = 10000; // in your currency

class WalletService {
  // Get or create wallet for user
  async getOrCreateWallet(userId) {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user: userId });
    }
    return wallet;
  }

  // Flag suspicious transaction
  async flagTransaction(transaction, userId) {
    let reason = null;

    if (transaction.type === 'transfer') {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentTransfers = await Transaction.countDocuments({
        fromUser: userId,
        type: 'transfer',
        createdAt: { $gte: oneMinuteAgo },
        status: 'completed'
      });

      if (recentTransfers >= MAX_TRANSFERS_PER_MINUTE) {
        reason = 'Rapid Transfer';
      }
    }

    if (transaction.type === 'withdrawal') {
      if (transaction.amount > LARGE_WITHDRAWAL_THRESHOLD) {
        reason = 'Sudden Large Withdrawal';
      }
    }

    // Optional: Check for multiple failed transactions (implement later)

    if (reason) {
      await FlaggedTransaction.create({
        userId: userId,
        transactionId: transaction._id,
        reason: reason,
        timestamp: new Date()
      });
      return true; // Flagged
    }
    return false; // Not flagged
  }

  // Deposit money
  async deposit(userId, amount, description = 'Deposit') {
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
        toUser: userId,
        status: 'pending',
        description,
        reference
      }], { session });

      // Update wallet balance
      wallet.balance += amount;
      await wallet.save({ session });

      // Update transaction status
      transaction[0].status = 'completed';
      await transaction[0].save({ session });

      await session.commitTransaction();
      
      return {
        transaction: transaction[0],
        newBalance: wallet.balance,
        isFlagged: false // Deposit is not currently checked for fraud
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Withdraw money
  async withdraw(userId, amount, description = 'Withdrawal') {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const wallet = await this.getOrCreateWallet(userId);
      
      if (wallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Generate unique reference
      const reference = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Create transaction record
      const transaction = await Transaction.create([{
        type: 'withdrawal',
        amount,
        fromUser: userId,
        status: 'pending',
        description,
        reference
      }], { session });

      // Update wallet balance
      wallet.balance -= amount;
      await wallet.save({ session });

      // Update transaction status
      transaction[0].status = 'completed';
      await transaction[0].save({ session });

      // Check for fraud after successful withdrawal
      const isFlagged = await this.flagTransaction(transaction[0], userId);

      await session.commitTransaction();
      
      return {
        transaction: transaction[0],
        newBalance: wallet.balance,
        isFlagged
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Transfer money
  async transfer(fromUserId, toUserId, amount, description = 'Transfer') {
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

      if (fromWallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Generate unique reference
      const reference = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Create transaction record
      const transaction = await Transaction.create([{
        type: 'transfer',
        amount,
        fromUser: fromUserId,
        toUser: toUserId,
        status: 'pending',
        description,
        reference
      }], { session });

      // Update wallet balances
      fromWallet.balance -= amount;
      toWallet.balance += amount;

      await fromWallet.save({ session });
      await toWallet.save({ session });

      // Update transaction status
      transaction[0].status = 'completed';
      await transaction[0].save({ session });

      // Check for fraud after successful transfer (from user)
      const isFlagged = await this.flagTransaction(transaction[0], fromUserId);

      await session.commitTransaction();
      
      return {
        transaction: transaction[0],
        newBalance: fromWallet.balance,
        isFlagged
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Get transaction history
  async getTransactionHistory(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({
      $or: [
        { fromUser: userId },
        { toUser: userId }
      ]
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
      ]
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
  }
}

module.exports = new WalletService(); 