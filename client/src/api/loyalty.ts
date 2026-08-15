import { api } from './client';

export interface TierInfo {
  name: string;
  minPoints: number;
  multiplier: number;
  color: string;
  badge: string;
  perks: string[];
}

export interface LoyaltyTransaction {
  id: string;
  points: number;
  type: 'EARNED' | 'REDEEMED' | 'BONUS' | 'ADJUSTED';
  description: string;
  createdAt: string;
}

export interface CustomerLoyalty {
  points: number;
  tier: string;
  tierDetails: TierInfo;
  monetaryValue: number;
  nextTier: {
    nextTier: string | null;
    pointsNeeded: number;
    progressPct: number;
  };
  transactions: LoyaltyTransaction[];
  allTiers: Record<string, TierInfo>;
}

export const loyaltyApi = {
  getMyLoyalty: () => api.get<CustomerLoyalty>('/loyalty/me'),

  getTiers: () =>
    api.get<{ tiers: Record<string, TierInfo>; redemptionValuePerPoint: number }>('/loyalty/tiers'),

  adjustPoints: (data: { customerId: string; points: number; reason: string }) =>
    api.post('/loyalty/adjust', data),
};
