import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { errorResponse } from '../utils/response';
import { config } from '../config';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Operational errors (validation, auth, not-found) are expected control flow
  // and are already reported to the caller; logging them adds noise without
  // adding signal. Unexpected errors are always logged.
  const isOperational = error instanceof AppError && error.isOperational;
  if (!isOperational && config.nodeEnv !== 'test') {
    console.error('Error:', error);
  }

  if (error instanceof AppError) {
    errorResponse(res, error.message, error.statusCode, error.errors);
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = error.meta?.target as string[] | undefined;
      const field = target?.[0] || 'field';
      errorResponse(res, `${field} already exists`, 409);
      return;
    }
    if (error.code === 'P2025') {
      errorResponse(res, 'Record not found', 404);
      return;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    errorResponse(res, 'Invalid data provided', 400);
    return;
  }

  const message = config.nodeEnv === 'production' ? 'Internal server error' : error.message;
  errorResponse(res, message, 500);
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  errorResponse(res, 'Route not found', 404);
};