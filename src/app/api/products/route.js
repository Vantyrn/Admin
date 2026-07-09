import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { logActivity } from "@/lib/audit";
import { getAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const products = await prisma.products.findMany({
      include: {
        vendors: { select: { business_name: true } },
        product_images: { select: { url: true }, take: 1, orderBy: { sort_order: 'asc' } },
        product_addons: { select: { id: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    const mappedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      vendorName: p.vendors?.business_name || "Unknown",
      category: p.category || "General",
      type: p.product_type || "Veg", // Default to Veg if null
      price: `₹${Number(p.base_price || 0).toLocaleString()}`,
      status: (p.review_status || "pending_review").toUpperCase(),
      time: p.created_at,
      description: p.description || "",
      imageUrl: p.product_images?.[0]?.url || "",
      is_customizable: p.is_customizable || (p.product_addons?.length > 0),
      isActive: p.is_active !== false
    }));

    return NextResponse.json(mappedProducts);
  } catch (error) {
    console.error("Products API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name, vendor_id, base_price, category, product_type,
      review_status, description, imageUrl, is_customizable, customization_type, template_id,
      customization_groups, add_ons
    } = body;

    if (!name || !vendor_id || !base_price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Keep only groups/options/add-ons that actually have a name, so empty builder
    // rows don't create junk records.
    const cleanGroups = (customization_groups || [])
      .filter(g => g?.name?.trim())
      .map((group, gIdx) => ({
        ...group,
        display_order: group.display_order ?? gIdx,
        options: (group.options || []).filter(o => o?.name?.trim()),
      }));
    const cleanAddons = (add_ons || []).filter(a => a?.name?.trim());

    const productId = crypto.randomUUID();

    const newProduct = await prisma.products.create({
      data: {
        id: productId,
        vendor_id,
        name,
        base_price,
        category,
        product_type,
        description,
        is_customizable: is_customizable || false,
        customization_type: customization_type || "NORMAL",
        template_id: template_id || null,
        review_status: review_status || "pending_review",
        ...(imageUrl && {
          product_images: {
            create: {
              url: imageUrl,
              sort_order: 0
            }
          }
        }),
        ...(cleanAddons.length > 0 && {
          product_addons: {
            create: cleanAddons.map(a => ({
              name: a.name.trim(),
              price: Number(a.price) || 0,
              free_limit: Number(a.free_limit) || 0,
            }))
          }
        }),
        ...(cleanGroups.length > 0 && {
          product_customization_groups: {
            create: cleanGroups.map((group, gIdx) => ({
              name: group.name,
              is_required: group.is_required || false,
              selection_type: group.selection_type || "SINGLE",
              max_selections: group.max_limit || null,
              free_threshold: group.free_threshold || 0,
              extra_price: group.extra_price || 0,
              display_order: group.display_order ?? gIdx,
              product_customization_options: {
                create: (group.options || []).map((opt, oIdx) => ({
                  name: opt.name,
                  price_modifier: opt.price_modifier || 0,
                  is_available: opt.is_available !== false,
                  display_order: opt.display_order ?? oIdx,
                  image_url: opt.image_url || null
                }))
              }
            }))
          }
        })
      },
      include: {
        product_addons: true,
        product_customization_groups: {
          include: {
            product_customization_options: true
          }
        }
      }
    });

    const admin = await getAdmin();
    await logActivity("PRODUCT_CREATED", { 
      productId: newProduct.id, 
      name: newProduct.name,
      vendorId: newProduct.vendor_id 
    }, admin?.id);

    return NextResponse.json(newProduct);
  } catch (error) {
    console.error("Product Creation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status, name, base_price, category, product_type, description, imageUrl, is_customizable, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing product ID" }, { status: 400 });
    }

    const data = {};
    if (status) data.review_status = status.toLowerCase();
    if (name) data.name = name;
    if (base_price) data.base_price = base_price;
    if (category) data.category = category;
    if (product_type) data.product_type = product_type;
    if (description !== undefined) data.description = description;
    if (is_customizable !== undefined) data.is_customizable = is_customizable;
    // Admin enable/disable switch — hide/show the product without changing its review_status.
    if (is_active !== undefined) data.is_active = Boolean(is_active);
    // Approving a product makes it LIVE: all new products are created pending_review +
    // inactive, so approval must also activate it (unless is_active was explicitly set in
    // the same request) — otherwise an approved product would stay hidden from customers.
    if (status && status.toLowerCase() === "approved" && is_active === undefined) {
      data.is_active = true;
    }

    if (imageUrl) {
      // Upsert the first image or create a new one
      const existingImages = await prisma.product_images.findMany({
        where: { product_id: id },
        orderBy: { sort_order: 'asc' }
      });
      if (existingImages.length > 0) {
        await prisma.product_images.update({
          where: { id: existingImages[0].id },
          data: { url: imageUrl }
        });
      } else {
        await prisma.product_images.create({
          data: { product_id: id, url: imageUrl, sort_order: 0 }
        });
      }
    }

    const updatedProduct = await prisma.products.update({
      where: { id },
      data
    });

    const admin = await getAdmin();
    await logActivity("PRODUCT_UPDATED", { 
      productId: updatedProduct.id, 
      name: updatedProduct.name,
      updates: data 
    }, admin?.id);

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Product Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing product ID" }, { status: 400 });
    }

    await prisma.products.delete({
      where: { id }
    });

    const admin = await getAdmin();
    await logActivity("PRODUCT_DELETED", { productId: id }, admin?.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product Deletion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
