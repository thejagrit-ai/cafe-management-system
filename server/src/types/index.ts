import { Request } from 'express';
import { User, Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User & {
    customer?: { id: string } | null;
    employee?: { id: string } | null;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export type { User, Role } from '@prisma/client';
