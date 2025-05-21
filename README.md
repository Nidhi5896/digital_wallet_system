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
- **Headers:**
  ```
  Authorization: Bearer <jwt_token>
  ```
- **Body:**
  ```json
  {
    "amount": 1000.5,
    "description": "Initial deposit"
  }
  ```

#### Withdraw Money

- **POST** `/api/wallet/withdraw`
- **Headers:**
  ```
  Authorization: Bearer <jwt_token>
  ```
- **Body:**
  ```json
  {
    "amount": 500.25,
    "description": "ATM withdrawal"
  }
  ```

#### Transfer Money

- **POST** `/api/wallet/transfer`
- **Headers:**
  ```
  Authorization: Bearer <jwt_token>
  ```
- **Body:**
  ```json
  {
    "amount": 200.75,
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

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- Input validation using express-validator
- Protected routes using middleware
- CORS enabled
- Error handling middleware
- Atomic transactions for wallet operations

## Error Handling

The API uses a consistent error response format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [] // Optional validation errors
}
```

## Success Response Format

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
