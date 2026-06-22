import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import clientPromise from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { subscriptionUpdateSchema } from "@/schemas/subscription.schema";

const COLLECTION = "subscriptions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid subscription id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = subscriptionUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updateDoc = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { _id: new ObjectId(id), userId: session.user.id },
    { $set: updateDoc },
    { returnDocument: "after" }
  );

  if (!result) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      id: result._id.toString(),
      userId: result.userId,
      name: result.name,
      cost: result.cost,
      billingCycle: result.billingCycle,
      renewalDate: result.renewalDate,
      category: result.category,
      status: result.status,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    },
    { status: 200 }
  );
}
