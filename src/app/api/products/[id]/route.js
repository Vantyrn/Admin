import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) {
      return NextResponse.json({ error: "Missing product ID" }, { status: 400 });
    }

    const product = await prisma.products.findUnique({
      where: { id },
      include: {
        vendors: { select: { business_name: true } },
        product_images: { select: { url: true }, take: 1, orderBy: { sort_order: 'asc' } },
        product_addons: { select: { id: true } }
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const mappedProduct = {
      id: product.id,
      name: product.name,
      vendorName: product.vendors?.business_name || "Unknown",
      category: product.category || "General",
      type: product.product_type || "Veg",
      base_price: product.base_price,
      status: (product.review_status || "pending_review").toUpperCase(),
      description: product.description || "",
      imageUrl: product.product_images?.[0]?.url || "",
      is_customizable: product.is_customizable || (product.product_addons?.length > 0)
    };

    return NextResponse.json(mappedProduct);
  } catch (error) {
    console.error("Single Product API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
