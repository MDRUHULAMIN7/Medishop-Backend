import { Response } from 'express';
import { HTTP_STATUS } from '../config/constants';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages?: number;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    message: string,
    data: T | null = null,
    statusCode: number = HTTP_STATUS.OK,
    meta?: PaginationMeta
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      ...(meta && { meta }),
    });
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorCode: string = 'INTERNAL_ERROR',
    errors: any = null
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
      errorCode,
      errors,
    });
  }
}
