import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const customer = await prisma.customers.findUnique({
      where: { id },
      include: {
        profiles: true,
        orders: {
          include: {
            vendors: {
              include: {
                profiles: true
              }
            },
            feedback: true
          },
          orderBy: { created_at: 'desc' },
          take: 10
        },
        addresses: true,
        feedback: {
          include: {
            orders: {
              include: {
                vendors: true
              }
            }
          },
          orderBy: { submitted_at: 'desc' }
        },
        support_requests: {
          include: {
            orders: {
              include: {
                vendors: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        },
        age_verifications: true
      }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Map to frontend expected structure
    const mappedCustomer = {
      id: customer.id,
      fullName: customer.full_name,
      phone: customer.profiles?.phone_number || "N/A",
      email: customer.email || "N/A",
      profilePhoto: customer.profile_pic_url || "https://via.placeholder.com/150",
      registrationDate: customer.created_at.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      isGuest: customer.is_guest,
      addresses: customer.addresses.map(addr => ({
        type: addr.address_type || "Home",
        detail: `${addr.address_line1}${addr.address_line2 ? ', ' + addr.address_line2 : ''}, ${addr.city}, ${addr.state} - ${addr.postal_code}`
      })),
      ageVerification: {
        status: customer.age_verifications?.is_verified ? "VERIFIED" : "PENDING",
        birthDate: customer.age_verifications?.birth_date?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) || "N/A",
        age: customer.age_verifications?.birth_date ? 
             Math.floor((new Date() - new Date(customer.age_verifications.birth_date)) / (1000 * 60 * 60 * 24 * 365.25)) : "N/A"
      },
      orders: customer.orders.map(order => ({
        id: order.id.slice(0, 8).toUpperCase(),
        vendor: order.vendors?.business_name || "Unknown Vendor",
        amount: `₹${order.total_amount.toNumber().toLocaleString()}`,
        status: order.status.toUpperCase(),
        date: order.created_at.toISOString().split('T')[0]
      })),
      feedback: customer.feedback.map(f => ({
        id: f.id,
        vendor: f.orders?.vendors?.business_name || "Unknown Vendor",
        rating: f.rating,
        comment: f.comment,
        date: f.submitted_at.toISOString().split('T')[0]
      })),
      support: customer.support_requests.map(s => ({
        id: s.id,
        ticketId: s.whatsapp_ticket_id || s.id.slice(0, 8).toUpperCase(),
        type: s.issue_type || "General",
        message: s.message,
        status: s.status,
        date: s.created_at.toISOString().split('T')[0],
        orderId: s.order_id?.slice(0, 8).toUpperCase()
      })),
      status: customer.status
    };

    return NextResponse.json(mappedCustomer);
  } catch (error) {
    console.error("Customer Detail API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
