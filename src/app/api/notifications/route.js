import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

let lastSyncTime = 0;
const SYNC_COOLDOWN = 60000; // 1 minute cooldown

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    try {
      const newNotifications = [];

      // 1. Sync New Vendors (KYC_SUBMITTED)
      const pendingVendors = await prisma.vendors.findMany({
        where: { account_status: 'KYC_SUBMITTED' },
        select: { id: true, business_name: true, created_at: true }
      });

      for (const vendor of pendingVendors) {
        newNotifications.push({
          reference_id: `vendor_kyc_${vendor.id}`,
          title: "New Vendor Registered",
          description: `${vendor.business_name || 'Unknown'} has registered and is pending KYC review.`,
          type: 'KYC',
          created_at: vendor.created_at || new Date()
        });
      }

      // 2. Sync New Orders (payment_successful)
      const newOrders = await prisma.orders.findMany({
        where: { status: { in: ['payment_successful', 'placed', 'pending', 'pending_vendor'] } },
        select: { id: true, created_at: true }
      });

      for (const order of newOrders) {
        newNotifications.push({
          reference_id: `new_order_${order.id}`,
          title: "New Order Received",
          description: `Order #${order.id.slice(0, 8).toUpperCase()} has been placed and is pending vendor acceptance.`,
          type: 'ORDER',
          created_at: order.created_at || new Date()
        });
      }

      // 3. Sync Flagged/SLA Breached Orders
      const fiveMinAgo = new Date(Date.now() - 300000);
      const pendingStatuses = ['payment_successful', 'placed', 'pending', 'pending_vendor'];
      
      const flaggedOrders = await prisma.orders.findMany({
        where: {
          OR: [
            { is_flagged: true },
            { status: { in: pendingStatuses }, created_at: { lt: fiveMinAgo } }
          ]
        },
        select: { id: true, status: true, created_at: true, is_flagged: true }
      });

      for (const order of flaggedOrders) {
        const isPendingVendor = order.status && pendingStatuses.includes(order.status.toLowerCase());
        const isSlaBreach = isPendingVendor && order.created_at < fiveMinAgo;
        newNotifications.push({
          reference_id: isSlaBreach ? `sla_breach_${order.id}` : `flagged_${order.id}`,
          title: isSlaBreach ? "Order SLA Breached" : "Order Flagged",
          description: isSlaBreach 
            ? `Order #${order.id.slice(0, 8).toUpperCase()} has exceeded the 5-minute acceptance window.`
            : `Order #${order.id.slice(0, 8).toUpperCase()} has been flagged for review.`,
          type: 'ORDER',
          created_at: new Date()
        });
      }

      // 4. Sync Pending Products
      const pendingProducts = await prisma.products.findMany({
        where: { review_status: 'pending_review' },
        include: { vendors: { select: { business_name: true } } }
      });

      for (const product of pendingProducts) {
        newNotifications.push({
          reference_id: `product_review_${product.id}`,
          title: "Product Pending Review",
          description: `${product.name} from ${product.vendors?.business_name || 'Unknown'} is pending review.`,
          type: 'SYSTEM',
          created_at: product.created_at || new Date()
        });
      }

      // 5. Sync Support Requests (Complaints)
      const pendingSupport = await prisma.support_requests.findMany({
        where: { status: 'PENDING' },
        include: { customers: { select: { full_name: true } } },
        take: 10
      });

      for (const support of pendingSupport) {
        newNotifications.push({
          reference_id: `support_req_${support.id}`,
          title: "New Customer Complaint",
          description: `${support.customers?.full_name || 'A customer'} raised a ${support.issue_type || 'complaint'}: ${support.message?.slice(0, 50)}...`,
          type: 'CUSTOMER',
          created_at: support.created_at || new Date()
        });
      }

      // 6. Sync Negative Feedback
      const negativeFeedback = await prisma.feedback.findMany({
        where: { rating: { lte: 2 } },
        include: { 
          customers: { select: { full_name: true } },
          orders: { include: { vendors: { select: { business_name: true } } } }
        },
        orderBy: { submitted_at: 'desc' },
        take: 5
      });

      for (const feedback of negativeFeedback) {
        newNotifications.push({
          reference_id: `neg_feedback_${feedback.id}`,
          title: "Poor Feedback Received",
          description: `${feedback.customers?.full_name || 'Customer'} gave ${feedback.rating} stars to ${feedback.orders?.vendors?.business_name || 'Vendor'}: ${feedback.comment?.slice(0, 50)}`,
          type: 'CUSTOMER',
          created_at: feedback.submitted_at || new Date()
        });
      }

      // Bulk create if there are any pending items
      if (newNotifications.length > 0) {
        await prisma.admin_notifications.createMany({
          data: newNotifications,
          skipDuplicates: true
        });
      }
    } catch (syncError) {
      console.error("Notifications Sync Error:", syncError);
      // Fail silently on sync errors so we still return existing notifications
    }

    // Now fetch and return all notifications
    const notifications = await prisma.admin_notifications.findMany({
      where: { is_cleared: false },
      orderBy: { created_at: 'desc' }
    });

    const mappedNotifications = notifications.map(n => ({
      id: n.id,
      title: n.title,
      description: n.description,
      time: new Intl.DateTimeFormat('en-US', { 
        hour: 'numeric', 
        minute: 'numeric', 
        hour12: true, 
        month: 'short', 
        day: 'numeric' 
      }).format(new Date(n.created_at)),
      type: n.type,
      isRead: n.is_read,
    }));

    return NextResponse.json(mappedNotifications);
  } catch (error) {
    console.error("Notifications API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id } = body;

    if (id) {
      await prisma.admin_notifications.update({
        where: { id },
        data: { is_read: true }
      });
    } else {
      await prisma.admin_notifications.updateMany({
        where: { is_cleared: false },
        data: { is_read: true }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const admin = await getAdmin();
  console.log("DELETE notifications called by admin:", admin?.email);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.admin_notifications.updateMany({
      where: {},
      data: { is_cleared: true }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
