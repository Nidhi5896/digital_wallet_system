# Digital Wallet Backend

A secure and robust backend system for a digital wallet application built with Node.js, Express.js, and MongoDB.

## Features

- User Authentication with JWT
- Secure Password Hashing
- Wallet Management
- Transaction History
- Input Validation
- Error Handling
- MongoDB Integration
- Rate Limiting
- Fraud Detection
- Admin Dashboard

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/digital-wallet
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication

#### Register User

- **POST** `/api/auth/register`
- **Rate Limit**: 5 requests per hour
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```

#### Login

- **POST** `/api/auth/login`
- **Rate Limit**: 5 requests per hour
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

#### Get Current User Profile

- **GET** `/api/auth/me`
- **Headers:**
  ```
  Authorization: Bearer <jwt_token>
  ```

### Wallet Operations

#### Deposit Money

- **POST** `/api/wallet/deposit`
- **Rate Limit**: 20 requests per hour
- **Headers:**
  ```
  Authorization: Bearer <jwt_token>
  ```
- **Body:**
  ```json
  {
    "amount": 1000.5,
    "currency": "INR",
    "description": "Initial deposit"
  }
  ```

#### Withdraw Money

- **POST** `/api/wallet/withdraw`
- **Rate Limit**: 20 requests per hour
- **Headers:**
  ```
  Authorization: Bearer <jwt_token>
  ```
- **Body:**
  ```json
  {
    "amount": 500.25,
    "currency": "INR",
    "description": "ATM withdrawal"
  }
  ```

#### Transfer Money

- **POST** `/api/wallet/transfer`
- **Rate Limit**: 10 requests per hour
- **Headers:**
  ```
  Authorization: Bearer <jwt_token>
  ```
- **Body:**
  ```json
  {
    "amount": 200.75,
    "currency": "INR",
    "toUserId": "recipient_user_id",
    "description": "Payment for services"
  }
  ```

#### Get Transaction History

- **GET** `/api/wallet/history?page=1&limit=10`
- **Headers:**
  ```
  Authorization: Bearer <jwt_token>
  ```

### Admin Endpoints

#### Get Flagged Transactions

- **GET** `/api/admin/flagged-transactions`
- **Rate Limit**: 50 requests per hour
- **Headers:**
  ```
  Authorization: Bearer <jwt_token>
  ```

#### Get Top Users

- **GET** `/api/admin/top-users?by=balance|volume`
- **Rate Limit**: 50 requests per hour
- **Headers:**
  ```
  Authorization: Bearer <jwt_token>
  ```

#### Get Transaction Summary

- **GET** `/api/admin/transactions/summary`
- **Rate Limit**: 50 requests per hour
- **Headers:**
  ```
  Authorization: Bearer <jwt_token>
  ```

## Security Features

### Rate Limiting

- **Authentication Endpoints**: 5 requests per hour
- **Wallet Operations**: 20 requests per hour
- **Transfers**: 10 requests per hour
- **Admin API**: 50 requests per hour
- **General API**: 100 requests per 15 minutes

### Authentication & Authorization

- Password hashing using bcrypt
- JWT-based authentication
- Protected routes using middleware
- Role-based access control (Admin/User)

### Input Validation

- Request body validation using express-validator
- Currency validation
- Amount validation
- User input sanitization

### Transaction Security

- Atomic transactions for wallet operations
- Fraud detection system
- Suspicious activity monitoring
- Daily fraud scan job

### Error Handling

The API uses a consistent error response format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [] // Optional validation errors
}
```

### Success Response Format

Successful responses follow this format:

```json
{
  "success": true,
  "message": "Success message",
  "data": {
    // Response data
  }
}
```

## Rate Limit Headers

The API includes rate limit information in response headers:

- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Remaining requests in current window
- `RateLimit-Reset`: Time when the rate limit resets

## Currency Support

- Base Currency: INR (Indian Rupee)
- Supported Currencies:
  - INR (₹)
  - USD ($)
- Automatic currency conversion
- Fallback exchange rates

## Fraud Detection

The system implements sophisticated fraud detection rules to protect users and prevent fraudulent activities:

### Transaction Monitoring

- **Amount-based Rules**
  - Large transaction detection (above ₹10,000)
  - Suspicious amount patterns (e.g., 9999, 99999)
  - Daily transfer limits (₹50,000)
  - Maximum daily transaction count (20)

### Pattern Detection

- **Behavioral Analysis**
  - Rapid transfers (more than 2 per minute)
  - Unusual transaction timing patterns
  - Bot-like behavior detection
  - High transaction velocity
  - Multiple recipients in short time

### Account Security

- **Account Age Checks**
  - New account monitoring (less than 24 hours)
  - Suspicious activity for new accounts
  - High-risk country detection

### Automated Monitoring

- Daily automated fraud scan
- Real-time transaction monitoring
- Email alerts for suspicious activities
- Flagged transaction tracking
- Multiple detection criteria per transaction

### Fraud Prevention Features

- Transaction velocity monitoring
- Pattern-based detection
- Amount-based rules
- Time-based rules
- Recipient-based rules
- Account age verification

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## API Documentation

### Postman Collection

The API is documented using Postman. You can find the collection and environment files in the `postman` directory:

- `Digital_Wallet_API.postman_collection.json`: Contains all API endpoints with example requests and responses
- `Digital_Wallet_Environment.postman_environment.json`: Contains environment variables for different environments

To use the Postman collection:

1. Import both files into Postman
2. Select the "Digital Wallet Environment" environment
3. Update the `base_url` variable if needed
4. Use the collection to test the API endpoints

The collection includes:

#### Authentication

- Register User
- Login
- Get Current User Profile

#### Wallet Operations

- Deposit Money
- Withdraw Money
- Transfer Money
- Get Transaction History

#### Admin Operations

- Get Flagged Transactions
- Get Top Users
- Get Transaction Summary

Each endpoint includes:

- Request method and URL
- Required headers
- Request body schema
- Example responses
- Rate limit information
- Authentication requirements

### API Testing

You can use the Postman collection to:

1. Test all API endpoints
2. View example requests and responses
3. Understand authentication flow
4. Test error scenarios
5. Verify rate limiting
6. Test admin operations

### Environment Variables

The Postman environment includes:

- `base_url`: API base URL (default: http://localhost:3000)
- `jwt_token`: JWT token for authenticated requests
- `user_id`: Current user's ID
- `wallet_id`: User's wallet ID
