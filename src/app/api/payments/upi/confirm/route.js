import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

// Confirms a pending UPI payment by relaying to the backend service, which is
// what actually creates the paid order. The admin has matched the customer's
// UTR against the credit in the Vantryn bank/UPI account.
export async function POST(request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!BACKEND_API_URL) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_BACKEND_URL is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { tr, utr, amount } = body;

    // UTR is OPTIONAL: automatic capture isn't possible on iOS / without the native
    // intent module, so the admin may confirm on an amount + time match alone.
    if (!tr) {
      return NextResponse.json(
        { error: "tr is required" },
        { status: 400 }
      );
    }

    const res = await fetch(`${BACKEND_API_URL}/api/payments/upi/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_SECRET,
      },
      body: JSON.stringify({
        tr,
        utr,
        amount,
        source: "ADMIN_MANUAL",
        actor: admin.email,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return NextResponse.json(
        { error: data.error || data.message || "Failed to confirm payment" },
        { status: res.status || 502 }
      );
    }

    await logActivity(
      "UPI_PAYMENT_CONFIRMED",
      { tr, utr, amount, orderId: data.orderId },
      admin.id
    );

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("UPI Confirm API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
