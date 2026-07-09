import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

let lastSyncTime = 0;
const SYNC_COOLDOWN = 60000; // 1 minute cooldown

// Fallback deep-link for notifications created before the `link` column existed.
// New rows carry an explicit `link`; this only kicks in for legacy reference_ids.
function deriveLink(referenceId) {
  if (!referenceId) return null;
  if (referenceId.startsWith('vendor_kyc_')) return `/vendors/${referenceId.slice('vendor_kyc_'.length)}`;
  if (referenceId.startsWith('product_review_')) return `/products/${referenceId.slice('product_review_'.length)}`;
  if (referenceId.startsWith('support_req_')) return `/customers`;
  if (referenceId.startsWith('neg_feedback_')) return `/vendors`;
  return null;
}

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
          link: `/vendors/${vendor.id}`,
          created_at: vendor.created_at || new Date()
        });
      }

      // NOTE: Order notifications are intentionally NOT generated. Order volume grows
      // unbounded, which would drown the bell. Order monitoring lives on the Orders page.

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
          link: `/products/${product.id}`,
          created_at: product.created_at || new Date()
        });
      }

      // 5. Sync Support Requests (Complaints) → deep-link to the customer who raised it
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
          link: support.customer_id ? `/customers/${support.customer_id}` : `/customers`,
          created_at: support.created_at || new Date()
        });
      }

      // 6. Sync Negative Feedback → deep-link to the vendor it concerns
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
        const vendorId = feedback.orders?.vendor_id;
        newNotifications.push({
          reference_id: `neg_feedback_${feedback.id}`,
          title: "Poor Feedback Received",
          description: `${feedback.customers?.full_name || 'Customer'} gave ${feedback.rating} stars to ${feedback.orders?.vendors?.business_name || 'Vendor'}: ${feedback.comment?.slice(0, 50)}`,
          type: 'CUSTOMER',
          link: vendorId ? `/vendors/${vendorId}` : null,
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

    // Retire any previously-generated ORDER notifications — we no longer surface them
    // (order volume would flood the bell), so clear the backlog out of the feed.
    await prisma.admin_notifications.updateMany({
      where: { type: 'ORDER', is_cleared: false },
      data: { is_cleared: true }
    });

    // Now fetch and return all notifications (ORDER type excluded by design)
    const notifications = await prisma.admin_notifications.findMany({
      where: { is_cleared: false, type: { not: 'ORDER' } },
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
      // Prefer the stored deep-link; fall back to deriving one from the reference_id
      // for older rows created before the link column existed.
      link: n.link || deriveLink(n.reference_id),
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

export async function POST(request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { audience, title, message } = body;

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    if (!BACKEND_URL) {
      return NextResponse.json({ error: "NEXT_PUBLIC_BACKEND_URL is not configured" }, { status: 500 });
    }

    const res = await fetch(`${BACKEND_URL}/api/admin/broadcast-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_SECRET
      },
      body: JSON.stringify({ audience, title, message })
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error || data.message || "Failed to broadcast notification" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Notifications Broadcast Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
