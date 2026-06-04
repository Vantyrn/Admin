import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. Fetch all successful customer payments
    const successfulPayments = await prisma.payment_transactions.findMany({
      where: { 
        gateway: "MOCK_GATEWAY",
        status: "SUCCESSFUL"
      }
    });

    const totalRevenue = successfulPayments.reduce((acc, t) => acc + Number(t.amount), 0);

    // 2. Fetch all earnings to calculate commission and pending payouts
    const allEarnings = await prisma.vendor_earnings.findMany({
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

    let totalCommission = 0;
    let pendingPayouts = 0;

    allEarnings.forEach(e => {
      totalCommission += Number(e.commission_amt);
      if (e.orders.payment_transactions.length === 0) {
        pendingPayouts += Number(e.vendor_payout);
      }
    });

    // 3. Fetch completed payouts
    const completedPayoutsTxns = await prisma.payment_transactions.findMany({
      where: { gateway: "VENDOR_PAYOUT", status: "SUCCESSFUL" }
    });
    const totalCompletedPayouts = completedPayoutsTxns.reduce((acc, t) => acc + Number(t.amount), 0);

    // 4. Calculate Admin Profits (Retained Commission)
    // Admin profit = Total Commission - (any refunds if we track them separately)
    // For now, let's keep it simple.
    
    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        totalCommission,
        pendingPayouts,
        completedPayouts: totalCompletedPayouts,
        adminProfit: totalCommission,
        transactionCount: successfulPayments.length
      }
    });
  } catch (error) {
    console.error("Payment Stats API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
