import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason, notes } = body;

    let orderId = id;
    if (id.length === 8) {
      const results = await prisma.$queryRawUnsafe(
        `SELECT id FROM "customer"."orders" WHERE id::text LIKE $1 LIMIT 1`,
        `${id.toLowerCase()}%`
      );
      if (results.length > 0) {
        orderId = results[0].id;
      }
    }

    const order = await prisma.orders.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Enforce authentication
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Transaction to update order status, add history, and add intervention
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.orders.update({
        where: { id: orderId },
        data: {
          status: "cancelled",
          delivery_failure_reason: reason
        }
      });

      // Add status history
      await tx.order_status_history.create({
        data: {
          order_id: orderId,
          status: "cancelled",
          changed_by: "Admin",
          notes: reason
        }
      });

      // Add intervention record
      await tx.orderIntervention.create({
        data: {
          adminUserId: admin.id,
          orderId: orderId,
          action: "CANCEL_ORDER",
          notes: `${reason} - ${notes || ''}`
        }
      });
    });

    return NextResponse.json({ success: true, message: "Order cancelled successfully" });
  } catch (error) {
    console.error("Cancel Order API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
