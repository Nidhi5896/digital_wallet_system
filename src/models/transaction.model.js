const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'withdrawal' || this.type === 'transfer';
    }
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'deposit' || this.type === 'transfer';
    }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ fromUser: 1, createdAt: -1 });
transactionSchema.index({ toUser: 1, createdAt: -1 });
transactionSchema.index({ reference: 1 }, { unique: true });

// Generate unique reference number
transactionSchema.pre('save', async function(next) {
  if (!this.reference) {
    this.reference = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

// Ensure isDeleted: false is default for finds
transactionSchema.pre(['find', 'findOne'], function() {
  if (!Object.prototype.hasOwnProperty.call(this.getQuery(), 'isDeleted')) {
    this.where({ isDeleted: false });
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 