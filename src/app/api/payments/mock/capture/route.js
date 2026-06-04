import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  try {
    const { orderId, amount, status } = await request.json();

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: "orderId and amount are required" },
        { status: 400 }
      );
    }

    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        vendors: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const txnId = `MOCK_TXN_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
    const paymentStatus = status === "success" ? "successful" : "failed";

    // 1. Record the payment transaction
    const transaction = await prisma.payment_transactions.create({
      data: {
        order_id: orderId,
        gateway: "MOCK_GATEWAY",
        txn_id: txnId,
        status: paymentStatus.toUpperCase(),
        amount: parseFloat(amount),
        webhook_payload: { 
          status, 
          simulatedAt: new Date().toISOString(),
          mode: "SANDBOX"
        }
      }
    });

    if (paymentStatus === "successful") {
      // 2. Calculate Commission & Vendor Earnings
      const vendor = order.vendors;
      const commissionRate = vendor.commissionRate ? parseFloat(vendor.commissionRate) : 5.0; // Fallback to 5%
      const orderTotal = parseFloat(amount);
      
      let commissionAmt = 0;
      let vendorPayout = 0;

      if (vendor.commissionModel === "ADD_ON") {
        // Commission was added on top of product price, vendor gets full amount minus any system fees
        // But usually, in this logic, we'll assume the 'amount' includes the addon.
        // For simplicity, we treat it as orderTotal * (rate / 100)
        commissionAmt = orderTotal * (commissionRate / 100);
        vendorPayout = orderTotal - commissionAmt;
      } else {
        // DEDUCTED Model: Commission is taken from the order total
        commissionAmt = orderTotal * (commissionRate / 100);
        vendorPayout = orderTotal - commissionAmt;
      }

      // 3. Create Vendor Earnings Record (using upsert to prevent duplicates)
      await prisma.vendor_earnings.upsert({
        where: { order_id: orderId },
        update: {
          order_total: orderTotal,
          commission_rate: commissionRate,
          commission_amt: commissionAmt,
          vendor_payout: vendorPayout,
          earned_at: new Date()
        },
        create: {
          vendor_id: vendor.id,
          order_id: orderId,
          order_total: orderTotal,
          commission_rate: commissionRate,
          commission_amt: commissionAmt,
          vendor_payout: vendorPayout
        }
      });

      // 4. Update Order Status
      await prisma.orders.update({
        where: { id: orderId },
        data: {
          status: "payment_successful",
          payment_method: "MOCK_SANDBOX",
          payment_gateway_ref: txnId
        }
      });
    }

    return NextResponse.json({
      success: true,
      transaction,
      txnId,
      message: `Payment ${paymentStatus} in Sandbox Mode`
    });
  } catch (error) {
    console.error("Mock Payment Capture Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
