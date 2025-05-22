const FlaggedTransaction = require('../models/flaggedTransaction.model');
const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const User = require('../models/user.model');

// Get all flagged transactions
const getAllFlags = async (req, res) => {
  try {
    const flags = await FlaggedTransaction.find()
      .populate('userId', 'email firstName lastName')
      .populate('transactionId')
      .sort({ timestamp: -1 });
    
    res.json({
      success: true,
      data: flags.map(flag => ({
        transactionId: flag.transactionId,
        userId: flag.userId,
        reason: flag.reason,
        timestamp: flag.timestamp
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching flagged transactions',
      error: error.message
    });
  }
};

// Get top users (by balance or transaction volume)
const getTopUsers = async (req, res) => {
  try {
    const { by = 'balance' } = req.query;
    let topUsers;

    if (by === 'balance') {
      topUsers = await Wallet.find()
        .sort({ balance: -1 })
        .limit(5)
        .populate('user', 'email firstName lastName')
        .lean();

      // Filter out wallets where user population failed and map the results
      topUsers = topUsers
        .filter(wallet => wallet.user)
        .map(wallet => ({
          name: `${wallet.user.firstName} ${wallet.user.lastName}`,
          email: wallet.user.email,
          balance: wallet.balance
        }));
    } else if (by === 'volume') {
      topUsers = await Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { 
          _id: '$fromUser', 
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }},
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }},
        // Use $unwind with preserveUnmatched: true to keep documents even if no user is found
        { $unwind: { path: '$user', preserveUnmatched: true } },
        { $project: {
          _id: 0,
          // Use $ifNull to handle cases where user is null after lookup/unwind
          name: { $ifNull: [{ $concat: ['$user.firstName', ' ', '$user.lastName'] }, 'Unknown User'] },
          email: { $ifNull: ['$user.email', 'N/A'] },
          transactionCount: '$count',
          totalAmount: '$totalAmount'
        }}
      ]);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid filter parameter. Use "balance" or "volume"'
      });
    }

    res.json({
      success: true,
      data: topUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching top users',
      error: error.message
    });
  }
};

// Get total system balance
const getTotalBalance = async (req, res) => {
  try {
    const result = await Wallet.aggregate([
      { $group: { _id: null, totalBalance: { $sum: '$balance' } } },
      { $project: { _id: 0, totalBalance: 1 } }
    ]);

    const totalBalance = result.length > 0 ? result[0].totalBalance : 0;

    res.json({
      success: true,
      data: { totalBalance }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error aggregating total balance',
      error: error.message
    });
  }
};

// Get transaction summary
const getTransactionSummary = async (req, res) => {
  try {
    const summary = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }},
      { $project: {
        _id: 0,
        type: '$_id',
        count: 1,
        totalAmount: 1
      }}
    ]);

    // Get daily transaction count
    const dailyStats = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 7 }, // Last 7 days
      { $project: {
        _id: 0,
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        count: 1
      }}
    ]);

    res.json({
      success: true,
      data: {
        summary,
        dailyStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction summary',
      error: error.message
    });
  }
};

// Soft delete user
const softDeleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(userId, { isDeleted: true, isActive: false }, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User soft deleted successfully', data: { userId: user._id } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error soft deleting user', error: error.message });
  }
};

// Soft delete transaction
const softDeleteTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const transaction = await Transaction.findByIdAndUpdate(transactionId, { isDeleted: true }, { new: true });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, message: 'Transaction soft deleted successfully', data: { transactionId: transaction._id } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error soft deleting transaction', error: error.message });
  }
};

module.exports = {
  getAllFlags,
  getTopUsers,
  getTotalBalance,
  getTransactionSummary,
  softDeleteUser,
  softDeleteTransaction
}; 