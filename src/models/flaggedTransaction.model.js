const mongoose = require('mongoose');

const flaggedTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const FlaggedTransaction = mongoose.model('FlaggedTransaction', flaggedTransactionSchema);

module.exports = FlaggedTransaction; 