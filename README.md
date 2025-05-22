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

- Monitors for suspicious patterns:
  - Multiple transfers in short period
  - Large transactions
  - Unusual activity patterns
- Daily automated fraud scan
- Email alerts for suspicious activities
- Flagged transaction tracking

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
