import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

// Map a DB row to the shape the frontend / apps consume.
const mapCategory = (c) => ({
  id: c.id,
  name: c.name,
  isFood: c.is_food,
  displayOrder: c.display_order,
  isActive: c.is_active,
  createdAt: c.created_at,
});

// GET /api/categories            → all categories (admin management view)
// GET /api/categories?active=1   → only active categories (for dropdowns)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "1" || searchParams.get("active") === "true";

    const categories = await prisma.business_categories.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: [{ display_order: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(categories.map(mapCategory));
  } catch (error) {
    console.error("Categories List API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/categories — create a new business category
export async function POST(request) {
  try {
    const body = await request.json();
    const name = (body.name || "").trim();
    const isFood = body.isFood !== undefined ? Boolean(body.isFood) : true;

    if (!name) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: "Category name must be between 2 and 100 characters." }, { status: 400 });
    }

    // Place new categories at the end of the ordering by default.
    const last = await prisma.business_categories.findFirst({
      orderBy: { display_order: "desc" },
      select: { display_order: true },
    });
    const displayOrder =
      typeof body.displayOrder === "number" ? body.displayOrder : (last?.display_order ?? -1) + 1;

    const created = await prisma.business_categories.create({
      data: { name, is_food: isFood, display_order: displayOrder, is_active: true },
    });

    const admin = await getAdmin();
    await logActivity("CATEGORY_CREATED", { categoryId: created.id, name, isFood }, admin?.id);

    return NextResponse.json(mapCategory(created), { status: 201 });
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A category with this name already exists." }, { status: 400 });
    }
    console.error("Category Create API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
