import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import clientPromise from "@/lib/db";
import { authOptions } from "@/lib/auth";
import {
  calculateBurnByCategory,
  calculateTotalMonthlyBurn,
  calculateUpcomingRenewalsCount,
} from "@/lib/calculations";
import type { Subscription } from "@/types/subscription";

const COLLECTION = "subscriptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db();
  const docs = await db
    .collection(COLLECTION)
    .find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .toArray();

  const subscriptions: Subscription[] = docs.map((doc) => ({
    id: doc._id.toString(),
    userId: doc.userId,
    name: doc.name,
    cost: doc.cost,
    billingCycle: doc.billingCycle,
    renewalDate: doc.renewalDate,
    category: doc.category,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));

  return NextResponse.json(
    {
      totalMonthlyBurn: calculateTotalMonthlyBurn(subscriptions),
      upcomingRenewalsCount: calculateUpcomingRenewalsCount(subscriptions, 7),
      burnByCategory: calculateBurnByCategory(subscriptions),
      activeSubscriptionCount: subscriptions.filter((s) => s.status === "ACTIVE").length,
      totalSubscriptionCount: subscriptions.length,
    },
    { status: 200 }
  );
}
