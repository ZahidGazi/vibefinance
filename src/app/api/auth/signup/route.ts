import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import clientPromise from "@/lib/db";

type SignupBody = {
  email?: string;
  password?: string;
  name?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const name = body.name?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");

    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);

    const result = await users.insertOne({
      email,
      name: name || email.split("@")[0],
      passwordHash,
      emailVerified: null,
      image: null,
    });

    return NextResponse.json(
      {
        message: "Signup successful.",
        userId: String(result.insertedId),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create account." },
      { status: 500 },
    );
  }
}
