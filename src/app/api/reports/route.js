import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7");
    
    const rangeAgo = new Date();
    rangeAgo.setDate(rangeAgo.getDate() - days);

    // 1. Order and Revenue Trend (Daily)
    const [orders, allVendors, allPartners, vendorSla, vendorRatings, riderRatings] = await Promise.all([
      prisma.orders.findMany({
        where: { created_at: { gte: rangeAgo } },
        select: { 
          created_at: true, 
          total_amount: true, 
          status: true, 
          vendor_id: true, 
          rider_id: true, 
          subtotal: true,
          vendor_earnings: {
            select: { commission_amt: true }
          }
        }
      }),
      prisma.vendors.findMany({ 
        take: 100, // Limit to top 100 vendors for performance
        select: { id: true, business_name: true } 
      }),
      Promise.resolve([]),
      prisma.vendor_sla_metrics.findMany({
        take: 100,
        select: { vendor_id: true, rejection_rate: true, breached_orders: true }
      }),
      prisma.vendor_ratings_summary.findMany({
        take: 100,
        select: { vendor_id: true, avg_rating: true }
      }),
      // Handle missing rider ratings model
      prisma.riderStatusLog.findMany({ 
        take: 1,
        select: { id: true } 
      }).then(() => []).catch(() => [])
    ]);

    const dailyData = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0].slice(5); // MM-DD
      dailyData[dateStr] = { date: dateStr, orders: 0, completed: 0, cancelled: 0, revenue: 0, commission: 0 };
    }

    // Aggregates for top cards
    let totalOrders = orders.length;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let totalGross = 0;
    let totalCommission = 0;
    
    // Performance maps
    const vendorMap = {};
    const partnerMap = {};

    orders.forEach(o => {
      const dateStr = o.created_at.toISOString().split('T')[0].slice(5);
      const isDelivered = o.status.toLowerCase() === 'delivered' || o.status.toLowerCase() === 'payment_successful';
      const isCancelled = o.status.toLowerCase() === 'cancelled';

      if (dailyData[dateStr]) {
        dailyData[dateStr].orders++;
        if (isDelivered) {
          dailyData[dateStr].completed++;
          dailyData[dateStr].revenue += o.total_amount.toNumber();
          const comm = o.vendor_earnings?.commission_amt ? o.vendor_earnings.commission_amt.toNumber() : (o.total_amount.toNumber() * 0.05);
          dailyData[dateStr].commission += comm;
        } else if (isCancelled) {
          dailyData[dateStr].cancelled++;
        }
      }

      if (isDelivered) {
        completedOrders++;
        totalGross += o.total_amount.toNumber();
        totalCommission += o.vendor_earnings?.commission_amt ? o.vendor_earnings.commission_amt.toNumber() : (o.total_amount.toNumber() * 0.05);
        
        // Vendor Performance
        if (!vendorMap[o.vendor_id]) vendorMap[o.vendor_id] = { orders: 0, revenue: 0 };
        vendorMap[o.vendor_id].orders++;
        vendorMap[o.vendor_id].revenue += o.total_amount.toNumber();

        // Partner Performance
        if (o.rider_id) {
          if (!partnerMap[o.rider_id]) partnerMap[o.rider_id] = { completed: 0 };
          partnerMap[o.rider_id].completed++;
        }
      } else if (isCancelled) {
        cancelledOrders++;
      }
    });

    const orderTrend = Object.values(dailyData).reverse();
    const revenueTrend = orderTrend.map(d => ({
      date: d.date,
      gross: d.revenue,
      commission: d.commission,
      net: d.revenue - d.commission
    }));

    // Map performance data
    const vendorPerformance = allVendors.map(v => {
      const sla = vendorSla.find(s => s.vendor_id === v.id);
      const rating = vendorRatings.find(r => r.vendor_id === v.id);
      return {
        id: v.id,
        name: v.business_name,
        orders: vendorMap[v.id]?.orders || 0,
        revenue: `₹${(vendorMap[v.id]?.revenue || 0).toLocaleString()}`,
        acceptance: sla ? `${(100 - sla.rejection_rate.toNumber()).toFixed(1)}%` : "N/A",
        sla: sla ? sla.breached_orders : 0,
        rating: rating ? rating.avg_rating.toNumber() : 0
      };
    }).sort((a, b) => parseFloat(b.revenue.replace('₹','').replace(/,/g,'')) - parseFloat(a.revenue.replace('₹','').replace(/,/g,''))).slice(0, 10);

    const partnerPerformance = [];

    return NextResponse.json({
      orderTrend,
      revenueTrend,
      vendorPerformance,
      partnerPerformance,
      summary: {
        orders: {
          total: totalOrders.toLocaleString(),
          completed: completedOrders.toLocaleString(),
          cancelled: cancelledOrders.toLocaleString(),
          avgValue: `₹${totalOrders > 0 ? Math.round(totalGross / totalOrders).toLocaleString() : 0}`
        },
        revenue: {
          gross: `₹${totalGross.toLocaleString()}`,
          commission: `₹${totalCommission.toLocaleString()}`,
          net: `₹${(totalGross - totalCommission).toLocaleString()}`
        }
      }
    });
  } catch (error) {
    console.error("Reports API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
