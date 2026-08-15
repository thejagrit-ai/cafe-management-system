import { Response } from 'express';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

export function successResponse<T>(res: Response, data: T, message: string = 'Operation successful', statusCode: number = 200): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  } as ApiResponse<T>);
}

export function errorResponse(res: Response, message: string, statusCode: number = 500, errors?: Record<string, string[]>): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  } as ApiResponse);
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  pagination: PaginationParams & { total: number },
  message: string = 'Data retrieved successfully'
): Response {
  const { page = 1, limit = 10, total } = pagination;
  const totalPages = Math.ceil(total / limit);

  return res.status(200).json({
    success: true,
    data,
    message,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  } as PaginatedResponse<T>);
}

export function createdResponse<T>(res: Response, data: T, message: string = 'Resource created successfully'): Response {
  return successResponse(res, data, message, 201);
}

export function noContentResponse(res: Response): Response {
  return res.status(204).send();
}