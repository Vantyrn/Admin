import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Total Revenue (all time for now)
    const revenueResult = await prisma.orders.aggregate({
      _sum: {
        total_amount: true
      }
    });
    const totalRevenue = revenueResult._sum.total_amount?.toNumber() || 0;

    // 2. Active Vendors
    const activeVendors = await prisma.vendors.count({
      where: { account_status: 'ACTIVE' }
    });

    // 3. Orders Today
    const ordersToday = await prisma.orders.count({
      where: {
        created_at: {
          gte: today
        }
      }
    });

    // 4. Total Customers
    let totalCustomers = 0;
    try {
      totalCustomers = await prisma.customers.count();
    } catch (e) {
      console.error("Failed to count customers:", e);
    }

    // 5. Recent Orders
    const recentOrders = await prisma.orders.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        created_at: true,
        total_amount: true,
        status: true,
        payment_method: true,
        customers: {
          select: { full_name: true }
        }
      }
    });

    const mappedOrders = recentOrders.map(order => ({
      id: order.id.slice(0, 8).toUpperCase(),
      customerName: order.customers?.full_name || "Unknown Customer",
      time: order.created_at,
      amount: `₹${order.total_amount.toNumber().toLocaleString()}`,
      status: order.status,
      paymentMethod: order.payment_method || "Online"
    }));

    return NextResponse.json({
      stats: [
        { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, change: "+0%", icon: "TrendingUp", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
        { label: "Active Vendors", value: activeVendors.toString(), change: "+0", icon: "ShoppingBag", color: "text-swiggy-orange", bg: "bg-swiggy-orange/10" },
        { label: "Orders Today", value: `+${ordersToday}`, change: "+0", icon: "Receipt", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
        { label: "Total Customers", value: totalCustomers.toString(), change: "+0", icon: "Users", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
      ],
      recentOrders: mappedOrders
    });
  } catch (error) {
    console.error("Dashboard Stats API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
