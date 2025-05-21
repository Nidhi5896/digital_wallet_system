const User = require('../models/user.model');

// Mock email sending function
const sendEmailAlert = async (userId, transactionId, amount, reason) => {
  try {
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ Email Alert Failed: User not found');
      return;
    }

    // Format the email content
    const emailContent = `
🚨 Fraud Alert: Transaction ${transactionId} by user ${user.email} flagged as suspicious.
Amount: ₹${amount}
Reason: ${reason}
Timestamp: ${new Date().toISOString()}
    `;

    // Log the email content (mock sending)
    console.log('\n=== Email Alert ===');
    console.log(emailContent);
    console.log('==================\n');

    return true;
  } catch (error) {
    console.error('Error sending email alert:', error);
    return false;
  }
};

module.exports = {
  sendEmailAlert
}; 