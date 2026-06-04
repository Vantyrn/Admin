import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  try {
    const { orderId, amount, adminUserId } = await request.json();

    if (!orderId || !amount || !adminUserId) {
      return NextResponse.json(
        { error: "orderId, adminUserId and amount are required" },
        { status: 400 }
      );
    }

    const order = await prisma.orders.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const refundRef = `MOCK_RFND_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

    // 1. Create Refund Record
    const refund = await prisma.refund.create({
      data: {
        orderId,
        adminUserId,
        amount: parseFloat(amount),
        paymentGatewayRef: refundRef,
        status: "success",
        completedAt: new Date()
      }
    });

    // 2. Add Payment Transaction for the Refund
    await prisma.payment_transactions.create({
      data: {
        order_id: orderId,
        gateway: "REFUND",
        txn_id: refundRef,
        status: "SUCCESSFUL",
        amount: -parseFloat(amount), // Negative amount for refund
        webhook_payload: { 
          reason: "Admin Initiated Refund",
          mode: "SANDBOX"
        }
      }
    });

    // 3. Update Order Status
    await prisma.orders.update({
      where: { id: orderId },
      data: {
        status: "REFUNDED"
      }
    });

    return NextResponse.json({
      success: true,
      refund,
      message: "Mock refund processed successfully in Sandbox Mode"
    });
  } catch (error) {
    console.error("Mock Payment Refund Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
