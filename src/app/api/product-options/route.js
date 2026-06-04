import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { logActivity } from "@/lib/audit";
import { getAdmin } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const { group_id, name, price_modifier } = body;

    if (!group_id || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newOption = await prisma.product_customization_options.create({
      data: {
        id: crypto.randomUUID(),
        group_id,
        name,
        price_modifier: price_modifier ? parseFloat(price_modifier) : 0,
        is_available: true
      }
    });

    const admin = await getAdmin();
    await logActivity("PRODUCT_OPTION_CREATED", { 
      optionId: newOption.id, 
      name: newOption.name,
      groupId: newOption.group_id 
    }, admin?.id);

    return NextResponse.json(newOption);
  } catch (error) {
    console.error("Product Option Creation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, name, price_modifier, is_available } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing option ID" }, { status: 400 });
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (price_modifier !== undefined) data.price_modifier = parseFloat(price_modifier);
    if (is_available !== undefined) data.is_available = is_available;

    const updatedOption = await prisma.product_customization_options.update({
      where: { id },
      data
    });

    const admin = await getAdmin();
    await logActivity("PRODUCT_OPTION_UPDATED", { 
      optionId: updatedOption.id, 
      updates: data 
    }, admin?.id);

    return NextResponse.json(updatedOption);
  } catch (error) {
    console.error("Product Option Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing option ID" }, { status: 400 });
    }

    await prisma.product_customization_options.delete({
      where: { id }
    });

    const admin = await getAdmin();
    await logActivity("PRODUCT_OPTION_DELETED", { optionId: id }, admin?.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product Option Deletion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
