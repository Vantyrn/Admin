import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    // Next 16 dynamic params need to be awaited
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) {
      return NextResponse.json({ error: "Missing product ID" }, { status: 400 });
    }

    const optionGroups = await prisma.product_customization_groups.findMany({
      where: { product_id: id },
      include: {
        product_customization_options: {
          orderBy: { display_order: 'asc' }
        }
      },
      orderBy: { display_order: 'asc' }
    });

    const directAddons = await prisma.product_addons.findMany({
      where: { product_id: id }
    });

    if (directAddons.length > 0) {
      const virtualGroup = {
        id: "virtual-addons-group",
        name: "Add-ons",
        is_required: false,
        selection_type: "MULTI",
        display_order: optionGroups.length,
        product_customization_options: directAddons.map(addon => ({
          id: addon.id,
          name: addon.name,
          price_modifier: addon.price,
          is_available: addon.is_active ?? true,
          free_limit: addon.free_limit
        }))
      };
      optionGroups.push(virtualGroup);
    }

    return NextResponse.json(optionGroups);
  } catch (error) {
    console.error("Customizations API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
