export const BILLING_CYCLES = ["MONTHLY", "YEARLY"] as const;
export const SUBSCRIPTION_CATEGORIES = ["STREAMING", "SAAS", "PRODUCTIVITY", "OTHER"] as const;
export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED"] as const;

export type BillingCycle = (typeof BILLING_CYCLES)[number];
export type SubscriptionCategory = (typeof SUBSCRIPTION_CATEGORIES)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  cost: number;
  billingCycle: BillingCycle;
  renewalDate: string;
  category: SubscriptionCategory;
  status: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionComputed extends Subscription {
  normalizedMonthlyCost: number;
  daysUntilRenewal: number;
  isRenewingSoon: boolean;
}
