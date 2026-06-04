import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const queue = await prisma.vendors.findMany({
      where: {
        account_status: {
          in: ["KYC_SUBMITTED", "UNDER_REVIEW"]
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    // Map to frontend expected structure
    const mappedQueue = queue.map(v => {
      const diff = new Date() - new Date(v.created_at);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return {
        id: v.id,
        businessName: v.business_name,
        ownerName: v.owner_name,
        submissionDate: v.created_at.toLocaleString(),
        timeWaiting: `${hours}h ${minutes}m`,
        status: v.account_status.toUpperCase()
      };
    });

    return NextResponse.json(mappedQueue);
  } catch (error) {
    console.error("Vendor KYC Queue API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
