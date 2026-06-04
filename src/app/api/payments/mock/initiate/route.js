import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  try {
    const { orderId, amount } = await request.json();

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: "orderId and amount are required" },
        { status: 400 }
      );
    }

    const order = await prisma.orders.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const mockPaymentUrl = `/mock-payment?orderId=${orderId}&amount=${amount}`;
    
    return NextResponse.json({
      success: true,
      paymentUrl: mockPaymentUrl,
      gateway: "MOCK_GATEWAY",
      orderId,
      amount
    });
  } catch (error) {
    console.error("Mock Payment Initiate Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
