import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/audit";
import { getAdmin } from "@/lib/auth";

export async function POST(request) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { orderId, amount, notes } = body;

    let dbOrderId = orderId;
    if (orderId.length === 8) {
      const results = await prisma.$queryRawUnsafe(
        `SELECT id FROM "customer"."orders" WHERE id::text LIKE $1 LIMIT 1`,
        `${orderId.toLowerCase()}%`
      );
      if (results.length > 0) {
        dbOrderId = results[0].id;
      }
    }

    const order = await prisma.orders.findUnique({
      where: { id: dbOrderId }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Since we are mocking the payment gateway refund process for now,
    // we directly insert a Refund record and update the order status.
    await prisma.$transaction(async (tx) => {
      // Upsert the refund record
      await tx.refund.upsert({
        where: { orderId: dbOrderId },
        update: {
          amount: parseFloat(amount),
          status: "success",
          completedAt: new Date()
        },
        create: {
          orderId: dbOrderId,
          adminUserId: admin.id,
          amount: parseFloat(amount),
          status: "success", 
          completedAt: new Date()
        }
      });

      // Update order status
      await tx.orders.update({
        where: { id: dbOrderId },
        data: {
          status: "refunded"
        }
      });

      // Add status history
      await tx.order_status_history.create({
        data: {
          order_id: dbOrderId,
          status: "refunded",
          changed_by: `Admin: ${admin.name}`,
          notes: notes || "Refund triggered via Admin Panel"
        }
      });

      // Add intervention record
      await tx.orderIntervention.create({
        data: {
          adminUserId: admin.id,
          orderId: dbOrderId,
          action: "TRIGGER_REFUND",
          notes: `Refunded amount: ${amount} - ${notes || ''}`
        }
      });
    });

    // Log the major admin action
    await logActivity("ADMIN_REFUND_INITIATED", {
      orderId: dbOrderId,
      amount,
      notes
    }, admin.id);

    return NextResponse.json({ success: true, message: "Refund processed successfully" });
  } catch (error) {
    console.error("Refund API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
