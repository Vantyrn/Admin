import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

// Lists UPI payment requests awaiting human reconciliation.
// There is no PSP webhook yet, so an admin matches the customer's claimed UTR
// against the bank credit and confirms/rejects via the backend service.
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const requests = await prisma.upi_payment_requests.findMany({
      where: { status: { in: ["PENDING", "CONFIRMING", "DISPUTED"] } },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    // Enrich with vendor business name + customer name (mirrors how the
    // transactions route attaches related data). We batch-load to avoid N+1.
    const vendorIds = [...new Set(requests.map((r) => r.vendor_id).filter(Boolean))];
    const customerIds = [...new Set(requests.map((r) => r.customer_id).filter(Boolean))];

    const [vendors, customers] = await Promise.all([
      vendorIds.length
        ? prisma.vendors.findMany({
            where: { id: { in: vendorIds } },
            select: { id: true, business_name: true },
          })
        : Promise.resolve([]),
      customerIds.length
        ? prisma.customers.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, full_name: true },
          })
        : Promise.resolve([]),
    ]);

    const vendorMap = new Map(vendors.map((v) => [v.id, v.business_name]));
    const customerMap = new Map(customers.map((c) => [c.id, c.full_name]));

    const enriched = requests.map((r) => ({
      ...r,
      vendor_name: vendorMap.get(r.vendor_id) || null,
      customer_name: r.customer_id ? customerMap.get(r.customer_id) || null : null,
    }));

    return NextResponse.json({ success: true, requests: enriched });
  } catch (error) {
    console.error("UPI Reconciliation List API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
