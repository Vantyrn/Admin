import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { groups } = body;

    if (!groups || !Array.isArray(groups)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const transactions = groups.map((g) => prisma.product_customization_groups.update({
      where: { id: g.id },
      data: { display_order: g.sort_order }
    }));

    await prisma.$transaction(transactions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Option Group Reorder Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
