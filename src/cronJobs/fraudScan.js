const cron = require('node-cron');
const Transaction = require('../models/transaction.model');
const FlaggedTransaction = require('../models/flaggedTransaction.model');
const { sendEmailAlert } = require('../utils/emailAlert');

// Constants for fraud detection
const LARGE_TRANSACTION_THRESHOLD = 10000;
const MAX_TRANSFERS_PER_MINUTE = 2;

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
      let reason = null;

      // Check for rapid transfers
      if (transaction.type === 'transfer') {
        const isRapidTransfer = await checkRapidTransfers(transaction);
        if (isRapidTransfer) {
          reason = 'Rapid Transfer';
        }
      }

      // Check for large transactions
      if (transaction.type === 'withdrawal' || transaction.type === 'transfer') {
        if (checkLargeTransaction(transaction)) {
          reason = 'Large Transaction';
        }
      }

      // If suspicious, create flag and send alert
      if (reason) {
        // Check if already flagged
        const existingFlag = await FlaggedTransaction.findOne({
          transactionId: transaction._id
        });

        if (!existingFlag) {
          // Create new flag
          await FlaggedTransaction.create({
            userId: transaction.fromUser,
            transactionId: transaction._id,
            reason,
            timestamp: new Date()
          });

          // Send email alert
          await sendEmailAlert(
            transaction.fromUser,
            transaction._id,
            transaction.amount,
            reason
          );

          console.log(`🚩 Flagged transaction ${transaction._id} for ${reason}`);
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