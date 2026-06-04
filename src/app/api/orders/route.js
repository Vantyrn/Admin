import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const orders = await prisma.orders.findMany({
      take: 50, // Added pagination limit
      select: {
        id: true,
        created_at: true,
        total_amount: true,
        status: true,
        is_flagged: true,
        customers: { select: { full_name: true } },
        vendors: { select: { business_name: true } },
        _count: { select: { order_items: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    const mappedOrders = orders.map(o => {
      const pendingStatuses = ['payment_successful', 'placed', 'pending', 'pending_vendor'];
      const isPendingVendor = o.status && pendingStatuses.includes(o.status.toLowerCase());
      const isSlaBreached = isPendingVendor && (Date.now() - new Date(o.created_at).getTime() > 300000);
      const isFlagged = o.is_flagged || isSlaBreached;

      return {
        id: o.id,
        shortId: o.id.slice(0, 8).toUpperCase(),
        customerName: o.customers?.full_name || "Unknown",
        vendorName: o.vendors?.business_name || "Unknown",
        items: o._count.order_items,
        amount: `₹${o.total_amount.toNumber().toLocaleString()}`,
        status: isFlagged && isPendingVendor ? "FLAGGED" : o.status.toUpperCase(),
        isFlagged: isFlagged,
        time: o.created_at
      };
    });

    return NextResponse.json(mappedOrders);
  } catch (error) {
    console.error("Orders API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
