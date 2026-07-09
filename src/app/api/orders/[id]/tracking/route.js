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

    // Rider telemetry comes from Shadowfax (real callbacks or the simulator), which writes to
    // sfx_rider_location_log — NOT the legacy order_tracking table (nothing populates that).
    const sfxOrder = await prisma.sfx_orders.findUnique({ where: { internal_order_id: orderId } });

    let latestTracking = null;
    let rider = null;
    if (sfxOrder) {
      latestTracking = await prisma.sfx_rider_location_log.findFirst({
        where: { sfx_order_id: sfxOrder.sfx_order_id },
        orderBy: { received_at: 'desc' }
      });

      // Rider identity: newest callback payload carrying rider fields.
      const callbacks = await prisma.sfx_callbacks.findMany({
        where: { sfx_order_id: sfxOrder.sfx_order_id },
        orderBy: { received_at: 'desc' },
        take: 25
      });
      for (const cb of callbacks) {
        const p = cb.payload || {};
        if (p.rider_name || p.rider_contact) {
          rider = { name: p.rider_name || null, phone: p.rider_contact || p.rider_phone || null };
          break;
        }
      }
    }

    let customerLat = null;
    let customerLng = null;

    // Attempt to extract lat/lng from address snapshot
    if (order.address_snapshot && typeof order.address_snapshot === 'object') {
      const snap = order.address_snapshot;
      if (snap.latitude) customerLat = parseFloat(snap.latitude);
      if (snap.longitude) customerLng = parseFloat(snap.longitude);
    }

    return NextResponse.json({
      sfxStatus: sfxOrder?.sfx_status || null,
      riderDetails: rider,
      rider: latestTracking?.lat != null && latestTracking?.lng != null ? {
        lat: parseFloat(latestTracking.lat.toString()),
        lng: parseFloat(latestTracking.lng.toString()),
        lastUpdated: latestTracking.received_at
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
