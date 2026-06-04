import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/audit";
import { getAdmin } from "@/lib/auth";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reason } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const customer = await prisma.customers.update({
      where: { id },
      data: { status: status }
    });

    const admin = await getAdmin();
    await logActivity("CUSTOMER_STATUS_UPDATED", { 
      customerId: id, 
      newStatus: status,
      reason: reason || "No reason provided" 
    }, admin?.id);

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Customer Status Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
