import jwt from 'jsonwebtoken';
import { config } from '../config';
import { userRepository } from '../repositories/user';
import { hashPassword, verifyPassword } from '../utils/helpers';
import { AuthenticationError, ConflictError } from '../utils/errors';
import { createAuditLog, getAuditDataFromRequest } from '../utils/audit';
import { AuthenticatedRequest } from '../types';
import prisma from '../config/prisma';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private generateTokens(userId: string, email: string, role: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, email, role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn as any }
    );

    return { accessToken, refreshToken };
  }

  async register(data: { email: string; password: string; firstName: string; lastName: string; phone?: string }): Promise<{ user: any; tokens: TokenPair }> {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: 'CUSTOMER',
        },
      });

      const customer = await tx.customer.create({
        data: {
          userId: newUser.id,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          loyaltyPoints: 50,
          loyaltyTier: 'BRONZE',
        },
      });

      await tx.loyaltyTransaction.create({
        data: {
          customerId: customer.id,
          points: 50,
          type: 'BONUS',
          description: 'Regalo de bienvenida Club Café Origin (+50 pts)',
        },
      });

      return tx.user.findUnique({
        where: { id: newUser.id },
        include: { customer: true },
      });
    });

    if (!user) throw new Error('Failed to create user');

    const tokens = this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    await createAuditLog({
      userId: user.id,
      action: 'REGISTER',
      entity: 'User',
      entityId: user.id,
      newData: { email: user.email, role: user.role },
      ...getAuditDataFromRequest({ user } as AuthenticatedRequest),
    });

    return { user, tokens };
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async login(email: string, password: string): Promise<{ user: any; tokens: TokenPair }> {
    const user = await userRepository.findByEmailWithRelations(email);
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    await userRepository.updateLastLogin(user.id);

    const tokens = this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ...getAuditDataFromRequest({ user } as AuthenticatedRequest),
    });

    return { user, tokens };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as { userId: string; type: string };
      
      if (decoded.type !== 'refresh') {
        throw new AuthenticationError('Invalid token type');
      }

      // Check if refresh token exists in DB and has not been revoked or expired
      const storedToken = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: decoded.userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!storedToken) {
        throw new AuthenticationError('Invalid or revoked refresh token');
      }

      const user = await userRepository.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new AuthenticationError('User not found or inactive');
      }

      // Token Rotation: Revoke previous refresh token
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      // Generate new token pair
      const tokens = this.generateTokens(user.id, user.email, user.role);
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const isValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(newPassword);
    await userRepository.update(userId, { passwordHash: newPasswordHash });

    // Revoke all existing refresh tokens on password change
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await createAuditLog({
      userId,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: userId,
      ...getAuditDataFromRequest({ user } as AuthenticatedRequest),
    });
  }

  async logout(req: AuthenticatedRequest, refreshToken?: string): Promise<void> {
    if (req.user) {
      if (refreshToken) {
        await prisma.refreshToken.updateMany({
          where: { token: refreshToken },
          data: { revokedAt: new Date() },
        });
      } else {
        await prisma.refreshToken.updateMany({
          where: { userId: req.user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      await createAuditLog({
        userId: req.user.id,
        action: 'LOGOUT',
        entity: 'User',
        entityId: req.user.id,
        ...getAuditDataFromRequest(req),
      });
    }
  }
}

export const authService = new AuthService();