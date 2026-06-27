import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

const mapCategory = (c) => ({
  id: c.id,
  name: c.name,
  isFood: c.is_food,
  displayOrder: c.display_order,
  isActive: c.is_active,
  createdAt: c.created_at,
});

// PATCH /api/categories/[id] — edit name / is_food / display_order / is_active
// (is_active is also how a soft-dropped category gets re-enabled).
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.business_categories.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    const data = {};
    if (body.name !== undefined) {
      const name = (body.name || "").trim();
      if (!name || name.length < 2 || name.length > 100) {
        return NextResponse.json({ error: "Category name must be between 2 and 100 characters." }, { status: 400 });
      }
      data.name = name;
    }
    if (body.isFood !== undefined) data.is_food = Boolean(body.isFood);
    if (body.displayOrder !== undefined && typeof body.displayOrder === "number") {
      data.display_order = body.displayOrder;
    }
    if (body.isActive !== undefined) data.is_active = Boolean(body.isActive);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const updated = await prisma.business_categories.update({ where: { id }, data });

    const admin = await getAdmin();
    await logActivity("CATEGORY_UPDATED", { categoryId: id, name: updated.name, changes: data }, admin?.id);

    return NextResponse.json(mapCategory(updated));
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A category with this name already exists." }, { status: 400 });
    }
    console.error("Category Update API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/categories/[id] — "drop" a category. Soft delete (is_active = false)
// so existing vendors that reference it by name are unaffected and it can be restored.
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const existing = await prisma.business_categories.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    const updated = await prisma.business_categories.update({
      where: { id },
      data: { is_active: false },
    });

    const admin = await getAdmin();
    await logActivity("CATEGORY_DISABLED", { categoryId: id, name: existing.name }, admin?.id);

    return NextResponse.json(mapCategory(updated));
  } catch (error) {
    console.error("Category Delete API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
