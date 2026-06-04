import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function GET(request, { params }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    // 1. Fetch all earnings for this vendor
    const earnings = await prisma.vendor_earnings.findMany({
      where: { vendor_id: id },
      include: {
        orders: {
          select: {
            id: true,
            status: true,
            created_at: true,
            payment_transactions: {
              where: { 
                OR: [
                  { gateway: "VENDOR_PAYOUT" },
                  { gateway: "REFUND" }
                ]
              }
            }
          }
        }
      },
      orderBy: { earned_at: 'desc' }
    });

    // 2. Calculate summaries
    let grossEarnings = 0;
    let commissionDeducted = 0;
    let netEarnings = 0;
    let pendingPayouts = 0;
    let completedPayouts = 0;

    const history = earnings.map(e => {
      const payoutTxn = e.orders.payment_transactions.find(t => t.gateway === "VENDOR_PAYOUT");
      const isPaid = !!payoutTxn;
      const isRefunded = e.orders.status === "REFUNDED";

      grossEarnings += Number(e.order_total);
      commissionDeducted += Number(e.commission_amt);
      netEarnings += Number(e.vendor_payout);

      if (isPaid) {
        completedPayouts += Number(e.vendor_payout);
      } else if (!isRefunded) {
        pendingPayouts += Number(e.vendor_payout);
      }

      return {
        orderId: e.order_id,
        date: e.earned_at,
        gross: Number(e.order_total),
        commissionRate: Number(e.commission_rate),
        commissionAmt: Number(e.commission_amt),
        net: Number(e.vendor_payout),
        status: isRefunded ? "REFUNDED" : (isPaid ? "PAID" : "PENDING"),
        payoutTxnId: payoutTxn?.txn_id || null,
        payoutDate: payoutTxn?.created_at || null
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        grossEarnings,
        commissionDeducted,
        netEarnings,
        pendingPayouts,
        completedPayouts
      },
      history
    });
  } catch (error) {
    console.error("Vendor Earnings API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
