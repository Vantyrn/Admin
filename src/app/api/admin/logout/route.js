import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/audit";
import { getAdmin } from "@/lib/auth";

export async function POST() {
  try {
    const admin = await getAdmin();
    if (admin) {
      await logActivity("ADMIN_LOGOUT", { email: admin.email }, admin.id);
    }

    const cookieStore = await cookies();
    cookieStore.delete("admin_token");

    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
