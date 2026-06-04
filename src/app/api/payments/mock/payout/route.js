import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  try {
    const { vendorId, amount } = await request.json();

    if (!vendorId) {
      return NextResponse.json(
        { error: "vendorId is required" },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendors.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // 1. Fetch all earnings for this vendor
    const earnings = await prisma.vendor_earnings.findMany({
      where: { vendor_id: vendorId },
      include: {
        orders: {
          include: {
            payment_transactions: {
              where: { gateway: "VENDOR_PAYOUT" }
            }
          }
        }
      }
    });

    // 2. Filter out orders that already have a payout transaction
    const unpaidEarnings = earnings.filter(e => e.orders.payment_transactions.length === 0);

    if (unpaidEarnings.length === 0) {
      return NextResponse.json({ message: "No pending payouts found for this vendor" }, { status: 200 });
    }

    const totalPayoutAmount = unpaidEarnings.reduce((acc, e) => acc + Number(e.vendor_payout), 0);
    const batchId = `MOCK_BATCH_${Date.now()}`;

    // 3. Process payouts for each order
    const payoutRecords = await Promise.all(unpaidEarnings.map(async (e) => {
      const payoutTxnId = `MOCK_PAYOUT_${e.order_id.slice(-6)}_${Date.now()}`;
      return await prisma.payment_transactions.create({
        data: {
          order_id: e.order_id,
          gateway: "VENDOR_PAYOUT",
          txn_id: payoutTxnId,
          status: "SUCCESSFUL",
          amount: parseFloat(e.vendor_payout),
          webhook_payload: { 
            batchId,
            mode: "SANDBOX",
            accountHolder: vendor.vendor_bank_details?.account_holder || "N/A"
          }
        }
      });
    }));

    return NextResponse.json({
      success: true,
      batchId,
      totalAmount: totalPayoutAmount,
      ordersProcessed: unpaidEarnings.length,
      payouts: payoutRecords,
      message: `Successfully processed payout for ${unpaidEarnings.length} orders`
    });
  } catch (error) {
    console.error("Mock Payment Payout Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
