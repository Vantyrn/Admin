import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/audit";
import { getAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const templates = await prisma.byo_templates.findMany({
      include: {
        byo_template_groups: {
          orderBy: { display_order: 'asc' },
          include: {
            byo_template_options: { orderBy: { display_order: 'asc' } }
          }
        },
        vendor_assigned_templates: {
          include: {
            vendors: { select: { id: true, business_name: true } }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Fetch Templates Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, category, description, groups } = body;

    if (!name) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    // Fetch all active vendors to auto-assign the template to everyone
    const allVendors = await prisma.vendors.findMany({
      select: { id: true }
    });

    const template = await prisma.byo_templates.create({
      data: {
        name,
        category,
        description,
        byo_template_groups: {
          create: (groups || []).filter(g => g?.name?.trim()).map((g, index) => ({
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
        },
        vendor_assigned_templates: {
          create: allVendors.map(v => ({
            vendor_id: v.id
          }))
        }
      },
      include: {
        byo_template_groups: true,
        vendor_assigned_templates: true
      }
    });

    const admin = await getAdmin();
    await logActivity("TEMPLATE_CREATED", { 
      templateId: template.id, 
      name: template.name 
    }, admin?.id);
    return NextResponse.json(template);
  } catch (error) {
    console.error("Create Template Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, category, description, groups } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "Template ID and name are required" }, { status: 400 });
    }

    // Delete existing groups and recreate them to simplify sync
    await prisma.byo_template_groups.deleteMany({
      where: { template_id: id }
    });

    const template = await prisma.byo_templates.update({
      where: { id },
      data: {
        name,
        category,
        description,
        byo_template_groups: {
          create: (groups || []).filter(g => g?.name?.trim()).map((g, index) => ({
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
        }
      },
      include: {
        byo_template_groups: {
          include: { byo_template_options: true }
        }
      }
    });

    const admin = await getAdmin();
    await logActivity("TEMPLATE_UPDATED", { 
      templateId: template.id, 
      name: template.name 
    }, admin?.id);
    return NextResponse.json(template);
  } catch (error) {
    console.error("Update Template Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
