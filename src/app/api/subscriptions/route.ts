import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import clientPromise from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { subscriptionSchema } from "@/schemas/subscription.schema";
import { withComputedFields } from "@/lib/calculations";
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

  return NextResponse.json(withComputedFields(subscriptions), { status: 200 });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = subscriptionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const toInsert = {
    userId: session.user.id,
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  };

  const client = await clientPromise;
  const db = client.db();
  const result = await db.collection(COLLECTION).insertOne(toInsert);

  const created: Subscription = {
    id: result.insertedId.toString(),
    userId: toInsert.userId,
    name: toInsert.name,
    cost: toInsert.cost,
    billingCycle: toInsert.billingCycle,
    renewalDate: toInsert.renewalDate,
    category: toInsert.category,
    status: toInsert.status,
    createdAt: toInsert.createdAt,
    updatedAt: toInsert.updatedAt,
  };

  return NextResponse.json(created, { status: 201 });
}
