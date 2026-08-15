import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';
import { JwtPayload, AuthenticatedRequest } from '../types';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import prisma from '../config/prisma';

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AuthenticationError('Access token required');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        customer: true,
        employee: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid or expired token'));
    } else {
      next(error);
    }
  }
};

// Typed to the Prisma Role enum so an invalid role name fails at compile time
// rather than silently denying every request at runtime.
export const authorize = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError(`Role ${req.user.role} is not authorized`);
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          customer: true,
          employee: true,
        },
      });

      if (user && user.isActive) {
        req.user = user;
      }
    }
    next();
  } catch {
    next();
  }
};