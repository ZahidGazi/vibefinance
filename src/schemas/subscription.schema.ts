import { z } from "zod";
import { BILLING_CYCLES, SUBSCRIPTION_CATEGORIES, SUBSCRIPTION_STATUSES } from "@/types/subscription";

export const subscriptionSchema = z.object({
  name: z.string().trim().min(1, "Service name is required").max(120, "Service name is too long"),
  cost: z.number().nonnegative("Cost must be non-negative"),
  billingCycle: z.enum(BILLING_CYCLES),
  renewalDate: z.string().date("Renewal date must be a valid ISO date (YYYY-MM-DD)"),
  category: z.enum(SUBSCRIPTION_CATEGORIES),
  status: z.enum(SUBSCRIPTION_STATUSES).default("ACTIVE"),
});

export const subscriptionUpdateSchema = subscriptionSchema.partial();

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
