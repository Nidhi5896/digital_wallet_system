const cron = require('node-cron');
const Transaction = require('../models/transaction.model');
const FlaggedTransaction = require('../models/flaggedTransaction.model');
const Wallet = require('../models/wallet.model');
const { sendEmailAlert } = require('../utils/emailAlert');

// Constants for fraud detection
const LARGE_TRANSACTION_THRESHOLD = 10000;
const MAX_TRANSFERS_PER_MINUTE = 2;
const MAX_DAILY_TRANSFER_AMOUNT = 50000;
const MAX_DAILY_TRANSACTION_COUNT = 20;
const SUSPICIOUS_AMOUNT_PATTERNS = [9999, 99999, 999999]; // Common fraud patterns
const HIGH_RISK_COUNTRIES = ['XX', 'YY', 'ZZ']; // Add high-risk country codes
const MIN_ACCOUNT_AGE_HOURS = 24;

// Function to check for rapid transfers
const checkRapidTransfers = async (transaction) => {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recentTransfers = await Transaction.countDocuments({
    fromUser: transaction.fromUser,
    type: 'transfer',
    createdAt: { $gte: oneMinuteAgo },
    status: 'completed',
    isDeleted: false
  });

  return recentTransfers >= MAX_TRANSFERS_PER_MINUTE;
};

// Function to check for large transactions
const checkLargeTransaction = (transaction) => {
  return transaction.amount > LARGE_TRANSACTION_THRESHOLD;
};

// Function to check for suspicious amount patterns
const checkSuspiciousAmountPatterns = (transaction) => {
  return SUSPICIOUS_AMOUNT_PATTERNS.includes(transaction.amount);
};

// Function to check daily transfer limits
const checkDailyTransferLimits = async (transaction) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const dailyStats = await Transaction.aggregate([
    {
      $match: {
        fromUser: transaction.fromUser,
        type: 'transfer',
        createdAt: { $gte: startOfDay },
        status: 'completed',
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  if (dailyStats.length === 0) return false;

  return dailyStats[0].totalAmount > MAX_DAILY_TRANSFER_AMOUNT ||
         dailyStats[0].count > MAX_DAILY_TRANSACTION_COUNT;
};

// Function to check for unusual transaction patterns
const checkUnusualPatterns = async (transaction) => {
  // Get user's transaction history
  const userTransactions = await Transaction.find({
    fromUser: transaction.fromUser,
    status: 'completed',
    isDeleted: false
  }).sort({ createdAt: -1 }).limit(10);

  if (userTransactions.length < 3) return false;

  // Check for unusual transaction timing
  const recentTransactions = userTransactions.slice(0, 3);
  const timeDifferences = recentTransactions.map((t, i) => {
    if (i === 0) return 0;
    return t.createdAt - recentTransactions[i - 1].createdAt;
  });

  // Flag if transactions are too regular (possible bot)
  const isTooRegular = timeDifferences.every(diff => 
    Math.abs(diff - timeDifferences[0]) < 1000
  );

  // Check for unusual amount patterns
  const amountPattern = recentTransactions.map(t => t.amount);
  const isUnusualAmountPattern = amountPattern.every(amount => 
    amount === amountPattern[0]
  );

  return isTooRegular || isUnusualAmountPattern;
};

// Function to check account age
const checkAccountAge = async (transaction) => {
  const user = await User.findById(transaction.fromUser);
  if (!user) return false;

  const accountAge = Date.now() - user.createdAt;
  return accountAge < (MIN_ACCOUNT_AGE_HOURS * 60 * 60 * 1000);
};

// Function to check for velocity of transactions
const checkTransactionVelocity = async (transaction) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentTransactions = await Transaction.find({
    fromUser: transaction.fromUser,
    createdAt: { $gte: oneHourAgo },
    status: 'completed',
    isDeleted: false
  });

  if (recentTransactions.length < 3) return false;

  // Calculate average time between transactions
  const timeDiffs = recentTransactions.map((t, i) => {
    if (i === 0) return 0;
    return t.createdAt - recentTransactions[i - 1].createdAt;
  }).slice(1);

  const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
  
  // Flag if transactions are happening too quickly
  return avgTimeDiff < 60000; // Less than 1 minute between transactions
};

// Function to check for multiple recipients
const checkMultipleRecipients = async (transaction) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentTransfers = await Transaction.find({
    fromUser: transaction.fromUser,
    type: 'transfer',
    createdAt: { $gte: oneHourAgo },
    status: 'completed',
    isDeleted: false
  });

  const uniqueRecipients = new Set(recentTransfers.map(t => t.toUser.toString()));
  return uniqueRecipients.size > 3; // Flag if more than 3 different recipients in an hour
};

// Main fraud scan function
const runFraudScan = async () => {
  console.log('\n🔄 Starting daily fraud scan...');
  const scanStartTime = new Date();

  try {
    // Get transactions from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTransactions = await Transaction.find({
      createdAt: { $gte: oneDayAgo },
      status: 'completed',
      isDeleted: false
    });

    console.log(`📊 Scanning ${recentTransactions.length} recent transactions...`);

    for (const transaction of recentTransactions) {
      let reasons = [];

      // Check for rapid transfers
      if (transaction.type === 'transfer') {
        const isRapidTransfer = await checkRapidTransfers(transaction);
        if (isRapidTransfer) reasons.push('Rapid Transfer');
      }

      // Check for large transactions
      if (transaction.type === 'withdrawal' || transaction.type === 'transfer') {
        if (checkLargeTransaction(transaction)) reasons.push('Large Transaction');
        if (checkSuspiciousAmountPatterns(transaction)) reasons.push('Suspicious Amount Pattern');
      }

      // Check daily limits
      if (transaction.type === 'transfer') {
        const exceedsDailyLimits = await checkDailyTransferLimits(transaction);
        if (exceedsDailyLimits) reasons.push('Exceeds Daily Limits');
      }

      // Check for unusual patterns
      const hasUnusualPatterns = await checkUnusualPatterns(transaction);
      if (hasUnusualPatterns) reasons.push('Unusual Transaction Pattern');

      // Check account age
      const isNewAccount = await checkAccountAge(transaction);
      if (isNewAccount) reasons.push('New Account');

      // Check transaction velocity
      const hasHighVelocity = await checkTransactionVelocity(transaction);
      if (hasHighVelocity) reasons.push('High Transaction Velocity');

      // Check for multiple recipients
      if (transaction.type === 'transfer') {
        const hasMultipleRecipients = await checkMultipleRecipients(transaction);
        if (hasMultipleRecipients) reasons.push('Multiple Recipients');
      }

      // If suspicious, create flag and send alert
      if (reasons.length > 0) {
        // Check if already flagged
        const existingFlag = await FlaggedTransaction.findOne({
          transactionId: transaction._id
        });

        if (!existingFlag) {
          // Create new flag
          await FlaggedTransaction.create({
            userId: transaction.fromUser,
            transactionId: transaction._id,
            reason: reasons.join(', '),
            timestamp: new Date()
          });

          // Send email alert
          await sendEmailAlert(
            transaction.fromUser,
            transaction._id,
            transaction.amount,
            reasons.join(', ')
          );

          console.log(`🚩 Flagged transaction ${transaction._id} for: ${reasons.join(', ')}`);
        }
      }
    }

    const scanDuration = new Date() - scanStartTime;
    console.log(`✅ Fraud scan completed in ${scanDuration}ms\n`);
  } catch (error) {
    console.error('❌ Error during fraud scan:', error);
  }
};

// Schedule the job to run at midnight every day
const scheduleFraudScan = () => {
  cron.schedule('0 0 * * *', () => {
    runFraudScan();
  });
  console.log('📅 Scheduled daily fraud scan for midnight');
};

module.exports = {
  scheduleFraudScan,
  runFraudScan // Exported for testing purposes
}; 