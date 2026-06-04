import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { logActivity } from "@/lib/audit";
import { getAdmin } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const { product_id, name, selection_type, is_required, max_limit } = body;

    if (!product_id || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const lastGroup = await prisma.product_customization_groups.findFirst({
      where: { product_id },
      orderBy: { display_order: 'desc' }
    });
    const display_order = lastGroup ? lastGroup.display_order + 1 : 0;

    const newGroup = await prisma.product_customization_groups.create({
      data: {
        id: crypto.randomUUID(),
        product_id,
        name,
        selection_type: selection_type || "SINGLE",
        is_required: is_required || false,
        max_selections: max_limit ? parseInt(max_limit) : null,
        display_order
      }
    });

    const admin = await getAdmin();
    await logActivity("OPTION_GROUP_CREATED", { 
      groupId: newGroup.id, 
      name: newGroup.name,
      productId: newGroup.product_id 
    }, admin?.id);

    return NextResponse.json(newGroup);
  } catch (error) {
    console.error("Option Group Creation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, name, selection_type, is_required, max_limit, sort_order } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing group ID" }, { status: 400 });
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (selection_type !== undefined) data.selection_type = selection_type;
    if (is_required !== undefined) data.is_required = is_required;
    if (max_limit !== undefined) data.max_selections = (max_limit === "" || max_limit === null) ? null : parseInt(max_limit);
    if (sort_order !== undefined) data.display_order = parseInt(sort_order);

    const updatedGroup = await prisma.product_customization_groups.update({
      where: { id },
      data
    });

    const admin = await getAdmin();
    await logActivity("OPTION_GROUP_UPDATED", { 
      groupId: updatedGroup.id, 
      updates: data 
    }, admin?.id);

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Option Group Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing group ID" }, { status: 400 });
    }

    await prisma.product_customization_groups.delete({
      where: { id }
    });

    const admin = await getAdmin();
    await logActivity("OPTION_GROUP_DELETED", { groupId: id }, admin?.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Option Group Deletion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
