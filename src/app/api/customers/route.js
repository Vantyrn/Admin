import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const customers = await prisma.customers.findMany({
      include: {
        profiles: true,
        _count: {
          select: { orders: true }
        },
        orders: {
          select: { total_amount: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const mappedCustomers = customers.map(c => {
      const totalSpent = c.orders.reduce((sum, order) => sum + order.total_amount.toNumber(), 0);
      return {
        id: c.id,
        name: c.full_name || "Unknown",
        email: c.email || "N/A",
        phone: c.profiles?.phone_number || "N/A",
        isGuest: c.is_guest,
        registeredAt: c.created_at,
        orders: c._count.orders,
        spent: `₹${totalSpent.toLocaleString()}`,
        status: c.status
      };
    });

    return NextResponse.json(mappedCustomers);
  } catch (error) {
    console.error("Customers API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
