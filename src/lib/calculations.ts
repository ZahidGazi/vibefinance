import type { Subscription, SubscriptionCategory, SubscriptionComputed } from "@/types/subscription";

const DAY_MS = 24 * 60 * 60 * 1000;

const toStartOfDayUtc = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export function normalizeMonthlyCost(subscription: Pick<Subscription, "cost" | "billingCycle">): number {
  if (subscription.billingCycle === "YEARLY") {
    return Number((subscription.cost / 12).toFixed(2));
  }
  return Number(subscription.cost.toFixed(2));
}

export function getDaysUntilRenewal(
  renewalDate: string,
  currentDate: Date = new Date()
): number {
  const todayUtc = toStartOfDayUtc(currentDate);
  const renewal = new Date(renewalDate);
  const renewalUtc = toStartOfDayUtc(renewal);
  return Math.ceil((renewalUtc.getTime() - todayUtc.getTime()) / DAY_MS);
}

export function isRenewingSoon(
  renewalDate: string,
  thresholdDays = 7,
  currentDate: Date = new Date()
): boolean {
  const days = getDaysUntilRenewal(renewalDate, currentDate);
  return days >= 0 && days <= thresholdDays;
}

export function calculateTotalMonthlyBurn(subscriptions: Subscription[]): number {
  const total = subscriptions
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => sum + normalizeMonthlyCost(s), 0);

  return Number(total.toFixed(2));
}

export function calculateUpcomingRenewalsCount(
  subscriptions: Subscription[],
  days = 7,
  currentDate: Date = new Date()
): number {
  return subscriptions.filter((s) => isRenewingSoon(s.renewalDate, days, currentDate)).length;
}

export function calculateBurnByCategory(
  subscriptions: Subscription[]
): Record<SubscriptionCategory, number> {
  const base: Record<SubscriptionCategory, number> = {
    STREAMING: 0,
    SAAS: 0,
    PRODUCTIVITY: 0,
    OTHER: 0,
  };

  for (const s of subscriptions) {
    if (s.status !== "ACTIVE") continue;
    base[s.category] += normalizeMonthlyCost(s);
  }

  return {
    STREAMING: Number(base.STREAMING.toFixed(2)),
    SAAS: Number(base.SAAS.toFixed(2)),
    PRODUCTIVITY: Number(base.PRODUCTIVITY.toFixed(2)),
    OTHER: Number(base.OTHER.toFixed(2)),
  };
}

export function withComputedFields(
  subscriptions: Subscription[],
  currentDate: Date = new Date()
): SubscriptionComputed[] {
  return subscriptions.map((s) => ({
    ...s,
    normalizedMonthlyCost: normalizeMonthlyCost(s),
    daysUntilRenewal: getDaysUntilRenewal(s.renewalDate, currentDate),
    isRenewingSoon: isRenewingSoon(s.renewalDate, 7, currentDate),
  }));
}
