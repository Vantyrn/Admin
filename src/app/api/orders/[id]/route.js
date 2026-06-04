import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    let orderId = id;

    // If it's a short ID (8 chars), find the full UUID first
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
        customers: {
          include: {
            profiles: true
          }
        },
        vendors: {
          include: {
            profiles: true
          }
        },
        riders: {
          include: {
            profiles: true
          }
        },
        order_items: true,
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const subtotal = order.subtotal?.toNumber() || 0;
    const deliveryFee = order.delivery_fee?.toNumber() || 0;
    const totalAmount = order.total_amount?.toNumber() || 0;
    
    // Use stored commission if available, otherwise calculate from current vendor settings
    let platformCommission = 0;
    if (order.commission_amount) {
      platformCommission = order.commission_amount.toNumber();
    } else {
      const rate = order.vendors?.commissionRate?.toNumber() || 5;
      platformCommission = subtotal * (rate / 100);
    }
    
    const netTotal = totalAmount;

    // Parse address from address_snapshot if available
    const deliveryAddress = order.address_snapshot?.display_address || 
                           order.address_snapshot?.address_line_1 || 
                           "No address provided";

    const pendingStatuses = ['payment_successful', 'placed', 'pending', 'pending_vendor'];
    const isPendingVendor = order.status && pendingStatuses.includes(order.status.toLowerCase());
    const isSlaBreached = isPendingVendor && (Date.now() - new Date(order.created_at).getTime() > 300000);
    const isFlagged = order.is_flagged || isSlaBreached;

    // Map to frontend expected structure
    const mappedOrder = {
      id: order.id.slice(0, 8).toUpperCase(),
      createdAt: order.created_at.toLocaleString(),
      status: isFlagged && isPendingVendor ? "FLAGGED" : order.status.toUpperCase(),
      isFlagged: isFlagged,
      flagReason: isSlaBreached ? "SLA Breached: Vendor did not accept within 5 minutes" : (order.flag_reason || ""),
      customer: {
        id: order.customers?.id || "N/A",
        name: order.customers?.full_name || "Unknown",
        phone: order.customers?.profiles?.phone_number || "N/A",
        address: deliveryAddress
      },
      vendor: {
        id: order.vendors?.id || "N/A",
        name: order.vendors?.business_name || "Unknown",
        phone: order.vendors?.profiles?.phone_number || "N/A",
        address: order.vendors?.business_address || "No address provided"
      },
      partner: order.riders ? {
        id: order.riders.id,
        name: order.riders.name,
        phone: order.riders.profiles?.phone_number || "N/A",
        status: order.riders.online_status?.toUpperCase() || "OFFLINE"
      } : null,
      items: order.order_items.map(item => ({
        name: item.products?.name || item.product_name || "Unknown Item",
        quantity: item.quantity,
        addOns: null,
        unitPrice: `₹${(item.unit_price?.toNumber() || 0).toLocaleString()}`,
        total: `₹${(item.line_total?.toNumber() || (item.quantity * (item.unit_price?.toNumber() || 0))).toLocaleString()}`
      })),
      financials: {
        subtotal: `₹${subtotal.toLocaleString()}`,
        deliveryFee: `₹${deliveryFee.toLocaleString()}`,
        discount: "-₹0",
        platformCommission: `₹${platformCommission.toLocaleString()}`,
        netTotal: `₹${netTotal.toLocaleString()}`
      },
      payment: {
        method: order.payment_method || "Online",
        transactionId: order.id.replace(/-/g, '').slice(0, 12),
        status: "PAID",
        verified: true
      }
    };

    return NextResponse.json(mappedOrder);
  } catch (error) {
    console.error("Order Detail API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
