import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signJwt, comparePasswords } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  let body;
  
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, password } = body;

  try {
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // 1. Basic Rate Limiting Check (using AnalyticsEventLog)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentFailures = await prisma.analyticsEventLog.count({
      where: {
        eventName: "ADMIN_LOGIN_FAILURE",
        firedAt: { gte: fifteenMinsAgo },
        metadata: {
          path: ["email"],
          equals: email
        }
      }
    });

    if (recentFailures >= 5) {
      await logActivity("ADMIN_LOGIN_BLOCKED", { email, ip, reason: "Too many attempts" });
      return NextResponse.json(
        { error: "Too many failed attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    // 2. Find User
    const adminUser = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!adminUser) {
      await logActivity("ADMIN_LOGIN_FAILURE", { email, ip, reason: "User not found" });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 3. Verify Password
    const isValid = await comparePasswords(password, adminUser.passwordHash);

    if (!isValid) {
      await logActivity("ADMIN_LOGIN_FAILURE", { email, ip, reason: "Wrong password" });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 4. Create JWT
    const token = await signJwt({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: "admin",
    });

    // 5. Set Secure Cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "admin_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    // 6. Log Success
    await logActivity("ADMIN_LOGIN_SUCCESS", { email, ip }, adminUser.id);

    return NextResponse.json({
      success: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
      },
    });
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
