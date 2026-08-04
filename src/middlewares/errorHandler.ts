import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/ApiResponse';
import { HTTP_STATUS } from '../config/constants';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode: number = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message: string = err.message || 'Internal Server Error';
  let errorCode: string = err.errorCode || 'INTERNAL_ERROR';
  let errors: any = err.errors || null;

  // Handle Zod Validation Error
  if (err instanceof ZodError) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // Handle Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = `Invalid value for ${err.path}: ${err.value}`;
    errorCode = 'INVALID_ID';
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}`;
    errorCode = 'DUPLICATE_ENTRY';
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Invalid authentication token';
    errorCode = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Authentication token expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  // Log non-operational / 500 errors in development
  if (statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    console.error('💥 Unhandled Error:', err);
  }

  return ApiResponse.error(res, message, statusCode, errorCode, errors);
};
