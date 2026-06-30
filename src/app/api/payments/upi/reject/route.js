import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

// Rejects a pending UPI payment by relaying to the backend service (e.g. the
// customer's claimed UTR did not match any credit, or it was a duplicate).
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
    const { tr, reason } = body;

    if (!tr || !reason) {
      return NextResponse.json(
        { error: "tr and reason are required" },
        { status: 400 }
      );
    }

    const res = await fetch(`${BACKEND_API_URL}/api/payments/upi/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_SECRET,
      },
      body: JSON.stringify({ tr, reason, actor: admin.email }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return NextResponse.json(
        { error: data.error || data.message || "Failed to reject payment" },
        { status: res.status || 502 }
      );
    }

    await logActivity("UPI_PAYMENT_REJECTED", { tr, reason }, admin.id);

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("UPI Reject API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
