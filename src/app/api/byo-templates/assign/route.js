import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { template_id, vendor_ids } = body;

    if (!template_id || !Array.isArray(vendor_ids)) {
      return NextResponse.json({ error: "template_id and an array of vendor_ids are required" }, { status: 400 });
    }

    // First, delete existing assignments for this template
    // This allows replacing assignments cleanly. 
    // Alternatively, if we just want to add, we can do an upsert.
    // Let's assume we replace the entire assignment list for this template.
    await prisma.vendor_assigned_templates.deleteMany({
      where: { template_id }
    });

    if (vendor_ids.length > 0) {
      await prisma.vendor_assigned_templates.createMany({
        data: vendor_ids.map(vendor_id => ({
          template_id,
          vendor_id
        }))
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assign Templates Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
