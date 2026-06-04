import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/audit";
import { getAdmin } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const template = await prisma.byo_templates.findUnique({
      where: { id },
      include: {
        byo_template_groups: {
          orderBy: { display_order: 'asc' }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, groups } = body;

    // Update template basic info
    const updateData = {};
    if (name) updateData.name = name;
    if (category !== undefined) updateData.category = category;

    const template = await prisma.byo_templates.update({
      where: { id },
      data: updateData
    });

    // Handle groups if provided
    if (groups && Array.isArray(groups)) {
      // For simplicity, we can delete all existing groups and recreate them,
      // or we can use an upsert approach. Since templates might have active products linked,
      // wait, products copy groups to `product_customization_groups`. So it's safe to recreate
      // template groups.
      await prisma.byo_template_groups.deleteMany({
        where: { template_id: id }
      });

      if (groups.length > 0) {
        await prisma.byo_template_groups.createMany({
          data: groups.map((g, index) => ({
            template_id: id,
            name: g.name,
            selection_type: g.selection_type || "SINGLE",
            is_required: g.is_required || false,
            max_limit: g.max_limit || null,
            display_order: g.display_order ?? index
          }))
        });
      }
    }

    const updatedTemplate = await prisma.byo_templates.findUnique({
      where: { id },
      include: { byo_template_groups: { orderBy: { display_order: 'asc' } } }
    });

    const admin = await getAdmin();
    await logActivity("TEMPLATE_UPDATED", { 
      templateId: id, 
      name: updatedTemplate.name,
      updates: updateData 
    }, admin?.id);
    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error("Update Template Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.byo_templates.delete({
      where: { id }
    });
    const admin = await getAdmin();
    await logActivity("TEMPLATE_DELETED", { templateId: id }, admin?.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
