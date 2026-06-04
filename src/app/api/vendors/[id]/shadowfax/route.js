import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { sfxStoreCode } = await request.json();

    if (!sfxStoreCode) {
      return NextResponse.json({ error: "Shadowfax Store Code is required" }, { status: 400 });
    }

    const vendor = await prisma.vendors.findUnique({ where: { id } });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const updatedVendor = await prisma.vendors.update({
      where: { id },
      data: {
        sfx_store_code: sfxStoreCode,
        shadowfax_linked: true,
      },
    });

    // Log the action
    await prisma.vendorStatusLog.create({
      data: {
        vendorId: id,
        oldStatus: vendor.account_status,
        newStatus: vendor.account_status, // Status doesn't change yet
        reason: `Shadowfax Store Code linked: ${sfxStoreCode}`,
      },
    });

    return NextResponse.json({ 
      success: true, 
      sfxStoreCode: updatedVendor.sfx_store_code,
      shadowfaxLinked: updatedVendor.shadowfax_linked 
    });
  } catch (error) {
    console.error("Shadowfax Link API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
