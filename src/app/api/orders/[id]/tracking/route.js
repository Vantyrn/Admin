import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
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
      where: { id: orderId },
      include: {
        vendors: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get latest tracking record
    const latestTracking = await prisma.order_tracking.findFirst({
      where: { order_id: orderId },
      orderBy: { recorded_at: 'desc' }
    });

    let customerLat = null;
    let customerLng = null;
    
    // Attempt to extract lat/lng from address snapshot
    if (order.address_snapshot && typeof order.address_snapshot === 'object') {
      const snap = order.address_snapshot;
      if (snap.latitude) customerLat = parseFloat(snap.latitude);
      if (snap.longitude) customerLng = parseFloat(snap.longitude);
    }

    return NextResponse.json({
      rider: latestTracking ? {
        lat: parseFloat(latestTracking.latitude.toString()),
        lng: parseFloat(latestTracking.longitude.toString()),
        lastUpdated: latestTracking.recorded_at
      } : null,
      vendor: order.vendors?.latitude && order.vendors?.longitude ? {
        lat: parseFloat(order.vendors.latitude.toString()),
        lng: parseFloat(order.vendors.longitude.toString())
      } : null,
      customer: customerLat && customerLng ? {
        lat: customerLat,
        lng: customerLng
      } : null
    });

  } catch (error) {
    console.error("Tracking API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
