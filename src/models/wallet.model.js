const mongoose = require('mongoose');
const currencyService = require('../services/currency.service');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    required: true,
    min: 0
  },
  preferredCurrency: {
    type: String,
    default: 'INR',
    validate: {
      validator: function(currency) {
        return currencyService.isValidCurrency(currency);
      },
      message: props => `${props.value} is not a supported currency`
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTransactionAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
walletSchema.index({ user: 1 });

// Virtual for getting balance in preferred currency
walletSchema.virtual('displayBalance').get(function() {
  return currencyService.convertAmount(this.balance, 'INR', this.preferredCurrency);
});

// Method to get balance in specific currency
walletSchema.methods.getBalanceInCurrency = function(currency) {
  if (!currencyService.isValidCurrency(currency)) {
    throw new Error(`Invalid currency: ${currency}`);
  }
  return currencyService.convertAmount(this.balance, 'INR', currency);
};

// Method to add amount in any currency
walletSchema.methods.addAmount = async function(amount, currency) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (!currencyService.isValidCurrency(currency)) {
    throw new Error(`Invalid currency: ${currency}`);
  }

  const amountInBaseCurrency = currencyService.convertAmount(amount, currency, 'INR');
  this.balance += amountInBaseCurrency;
  this.lastTransactionAt = new Date();
  return this.save();
};

// Method to subtract amount in any currency
walletSchema.methods.subtractAmount = async function(amount, currency) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (!currencyService.isValidCurrency(currency)) {
    throw new Error(`Invalid currency: ${currency}`);
  }

  const amountInBaseCurrency = currencyService.convertAmount(amount, currency, 'INR');
  if (this.balance < amountInBaseCurrency) {
    throw new Error('Insufficient balance');
  }
  this.balance -= amountInBaseCurrency;
  this.lastTransactionAt = new Date();
  return this.save();
};

// Method to format balance with currency symbol
walletSchema.methods.getFormattedBalance = function(currency = this.preferredCurrency) {
  if (!currencyService.isValidCurrency(currency)) {
    throw new Error(`Invalid currency: ${currency}`);
  }
  const amount = this.getBalanceInCurrency(currency);
  return currencyService.formatAmount(amount, currency);
};

// Method to get all balances in different currencies
walletSchema.methods.getAllBalances = function() {
  const balances = {};
  const supportedCurrencies = currencyService.getSupportedCurrencies();
  
  supportedCurrencies.forEach(currency => {
    balances[currency] = {
      amount: this.getBalanceInCurrency(currency),
      formatted: this.getFormattedBalance(currency)
    };
  });

  return balances;
};

// Pre-save middleware to ensure balance is never negative
walletSchema.pre('save', function(next) {
  if (this.balance < 0) {
    next(new Error('Balance cannot be negative'));
  }
  next();
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet; 