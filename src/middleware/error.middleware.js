const { MongooseError } = require('mongoose');
const { validationResult } = require('express-validator');

const errorHandler = (err, req, res, next) => {
  console.error(err);

  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors = [];

  // Handle validation errors from express-validator
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    statusCode = 400;
    message = 'Validation failed';
    errors = validationErrors.array();
  }

  // Handle Mongoose validation errors (e.g., required fields)
  if (err instanceof MongooseError) {
     // Simple check, can be expanded for specific Mongoose errors
    statusCode = 400;
    message = 'Database validation error';
    errors = Object.values(err.errors).map(error => ({
        type: error.kind,
        value: error.value,
        msg: error.message,
        path: error.path,
        location: 'body' // Assuming most Mongoose validation errors come from the body
    }));
  }

  // Handle specific known errors (e.g., from service layer)
  if (err.message === 'Insufficient balance') {
      statusCode = 400;
      message = err.message;
  }
   if (err.message === 'Recipient not found') {
      statusCode = 400;
      message = err.message;
  }
    if (err.message === 'Cannot transfer to self') {
      statusCode = 400;
      message = err.message;
  }
   if (err.message === 'User already exists') {
      statusCode = 400;
      message = err.message;
  }
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      statusCode = 401; // Unauthorized
      message = 'Invalid or expired token';
  }


  // Generic error response
  res.status(statusCode).json({
    success: false,
    message: message,
    errors: errors.length > 0 ? errors : undefined, // Only include errors array if not empty
    // In development, you might want to include the error stack
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler; 