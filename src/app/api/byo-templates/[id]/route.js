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
          orderBy: { display_order: 'asc' },
          include: { byo_template_options: { orderBy: { display_order: 'asc' } } }
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
    const { name, category, description, groups, status, isActive, rejectionReason } = body;

    const updateData = {};
    if (name) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    // Moderation: approve / reject / enable / disable a (vendor-authored) template.
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.is_active = Boolean(isActive);
    if (rejectionReason !== undefined) updateData.rejection_reason = rejectionReason;

    // Replace groups (+ their options) when provided. Products snapshot their own
    // copy of a template's groups/options, so recreating the template is safe and
    // never mutates already-built products.
    if (groups && Array.isArray(groups)) {
      await prisma.byo_template_groups.deleteMany({ where: { template_id: id } });
      updateData.byo_template_groups = {
        create: groups.filter(g => g?.name?.trim()).map((g, index) => ({
          name: g.name.trim(),
          selection_type: g.selection_type || "SINGLE",
          is_required: g.is_required || false,
          max_limit: g.max_limit || null,
          free_threshold: g.free_threshold || 0,
          extra_price: g.extra_price || 0,
          display_order: g.display_order ?? index,
          byo_template_options: {
            create: (g.options || []).filter(o => o?.name?.trim()).map((o, oi) => ({
              name: o.name.trim(),
              price_modifier: Number(o.price_modifier) || 0,
              is_available: o.is_available !== false,
              display_order: o.display_order ?? oi,
              image_url: o.image_url || null,
            }))
          }
        }))
      };
    }

    const updatedTemplate = await prisma.byo_templates.update({
      where: { id },
      data: updateData,
      include: {
        byo_template_groups: {
          orderBy: { display_order: 'asc' },
          include: { byo_template_options: { orderBy: { display_order: 'asc' } } }
        }
      }
    });

    const admin = await getAdmin();
    await logActivity("TEMPLATE_UPDATED", {
      templateId: id,
      name: updatedTemplate.name,
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
