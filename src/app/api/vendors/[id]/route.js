import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { logActivity } from "@/lib/audit";
import { getAdmin } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const vendor = await prisma.vendors.findUnique({
      where: { id },
      include: {
        profiles: true,
        vendor_kyc: true,
        vendor_bank_details: true,
        vendor_operating_hours: {
          orderBy: { day_of_week: 'asc' }
        },
        products: {
          select: { id: true }
        },
        _count: {
          select: { orders: true }
        }
      }
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Fetch logs separately since relations were removed from the vendor schema
    const [kycReviews, statusLogs] = await Promise.all([
      prisma.vendorKycReview.findMany({
        where: { vendorId: id },
        orderBy: { reviewedAt: 'desc' },
        include: { adminUser: { select: { name: true } } }
      }),
      prisma.vendorStatusLog.findMany({
        where: { vendorId: id },
        orderBy: { changedAt: 'desc' },
        include: { adminUser: { select: { name: true } } }
      })
    ]);

    // Process KYC docs
    let kycDocs = [];
    if (vendor.vendor_kyc && vendor.vendor_kyc.length > 0) {
      const latestKyc = vendor.vendor_kyc.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0];
      const dateStr = latestKyc.submitted_at?.toISOString().split('T')[0] || "";
      
      const formatUrl = (url) => {
        if (!url) return url;
        return url.startsWith('http') ? url : `https://${url}`;
      };

      if (latestKyc.gov_id_url) kycDocs.push({ type: "Government ID", url: formatUrl(latestKyc.gov_id_url), date: dateStr });
      if (latestKyc.business_proof_url) kycDocs.push({ type: "Business Proof", url: formatUrl(latestKyc.business_proof_url), date: dateStr });
      if (latestKyc.pan_url) kycDocs.push({ type: "PAN Card", url: formatUrl(latestKyc.pan_url), date: dateStr });
      if (latestKyc.address_proof_url) kycDocs.push({ type: "Address Proof", url: formatUrl(latestKyc.address_proof_url), date: dateStr });
    }

    // Process Operating Hours
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const mappedHours = vendor.vendor_operating_hours.map(oh => ({
      day: days[oh.day_of_week - 1],
      time: oh.is_closed ? "Closed" : `${oh.open_time} - ${oh.close_time}`
    }));

    // Map to frontend expected structure
    const mappedVendor = {
      id: vendor.id,
      businessName: vendor.business_name,
      ownerName: vendor.owner_name,
      phone: vendor.profiles?.phone_number || "N/A",
      email: vendor.email || "N/A",
      address: vendor.business_address || "No address provided",
      category: vendor.business_category || "General",
      operatingHours: mappedHours.length > 0 ? mappedHours : "10:00 AM - 11:00 PM",
      openTime: vendor.vendor_operating_hours?.[0]?.open_time || "09:00",
      closeTime: vendor.vendor_operating_hours?.[0]?.close_time || "22:00",
      description: vendor.store_description || "Vendor registered on our platform.",
      status: vendor.account_status.toUpperCase(),
      kycStatus: vendor.account_status.toUpperCase(),
      isOnline: vendor.online_status?.toLowerCase() === 'online',
      lat: vendor.latitude?.toNumber() || 12.910235,
      lng: vendor.longitude?.toNumber() || 77.645032,
      logoUrl: vendor.logo_url || vendor.profile_pic_url || "https://placehold.co/150x150.png",
      bannerUrl: vendor.banner_url || "https://placehold.co/800x300.png",
      commissionModel: vendor.commissionModel,
      commissionRate: vendor.commissionRate?.toNumber() || 0,
      bankDetails: vendor.vendor_bank_details ? {
        accountHolder: vendor.vendor_bank_details.account_holder,
        bankName: vendor.vendor_bank_details.bank_name,
        accountNumber: vendor.vendor_bank_details.account_number,
        ifscCode: vendor.vendor_bank_details.ifsc_code,
        upiId: vendor.vendor_bank_details.upi_id
      } : null,
      kycDocuments: kycDocs,
      complianceFlags: [], // Logic for flags can be added here
      kycReviews: kycReviews.map(review => ({
        decision: review.decision,
        reason: review.rejectionReason,
        by: review.adminUser?.name || "System",
        date: review.reviewedAt.toLocaleString()
      })),
      shadowfaxLinked: vendor.shadowfax_linked,
      sfxStoreCode: vendor.sfx_store_code,
      adminActions: statusLogs.map(log => ({
        action: log.newStatus === log.oldStatus ? log.reason : `STATUS_CHANGED_${log.newStatus.toUpperCase()}`,
        oldStatus: log.oldStatus,
        reason: log.reason,
        by: log.adminUser?.name || "System",
        date: log.changedAt.toLocaleString()
      }))
    };

    return NextResponse.json(mappedVendor);
  } catch (error) {
    console.error("Vendor Detail API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, reason, commissionModel, commissionRate } = body;

    const vendor = await prisma.vendors.findUnique({ where: { id } });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    if (action === "UPDATE_DETAILS") {
      const {
        businessName,
        ownerName,
        phone,
        email,
        category,
        address,
        latitude,
        longitude,
        description,
        openTime,
        closeTime,
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
        upiId,
      } = body;

      if (!businessName || !ownerName || !phone) {
        return NextResponse.json({ error: "Business name, owner name, and phone are required." }, { status: 400 });
      }

      // Normalize email (if email is 'N/A' or empty, treat it as null to avoid unique constraint issues)
      const cleanEmail = (email && email.trim() !== "" && email.trim() !== "N/A") ? email.trim() : null;
      const cleanPhone = phone.trim();

      await prisma.$transaction(async (tx) => {
        // 1. Get vendor details to find its associated profile_id
        const vendorRecord = await tx.vendors.findUnique({
          where: { id },
          select: { profile_id: true }
        });

        // 2. Update Vendors
        await tx.vendors.update({
          where: { id },
          data: {
            business_name: businessName,
            owner_name: ownerName,
            email: cleanEmail,
            business_category: category || null,
            business_address: address || null,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            store_description: description || null,
          }
        });

        // 3. Update associated Profile phone number ONLY if it has actually changed
        if (vendorRecord?.profile_id) {
          const currentProfile = await tx.profiles.findUnique({
            where: { id: vendorRecord.profile_id },
            select: { phone_number: true }
          });
          // Only push the update if the phone is genuinely different
          if (currentProfile && currentProfile.phone_number !== cleanPhone) {
            // Check if another profile already owns this phone number
            const conflictingProfile = await tx.profiles.findFirst({
              where: {
                phone_number: cleanPhone,
                id: { not: vendorRecord.profile_id }
              },
              select: { id: true }
            });
            if (conflictingProfile) {
              throw new Error("This phone number is already registered to another user profile.");
            }
            await tx.profiles.update({
              where: { id: vendorRecord.profile_id },
              data: {
                phone_number: cleanPhone
              }
            });
          }
        } else {
          throw new Error("Vendor does not have an associated login profile. Please link a profile first.");
        }

        // 4. Update/Upsert Bank Details
        const bankDetailsExist = await tx.vendor_bank_details.findFirst({
          where: { vendor_id: id }
        });

        if (bankDetailsExist) {
          await tx.vendor_bank_details.update({
            where: { id: bankDetailsExist.id },
            data: {
              account_holder: accountHolderName || "",
              bank_name: bankName || "",
              account_number: accountNumber || "",
              ifsc_code: ifscCode || "",
              upi_id: upiId || null,
            }
          });
        } else if (accountHolderName || bankName || accountNumber || ifscCode) {
          await tx.vendor_bank_details.create({
            data: {
              id: crypto.randomUUID(),
              vendor_id: id,
              account_holder: accountHolderName || "",
              bank_name: bankName || "",
              account_number: accountNumber || "",
              ifsc_code: ifscCode || "",
              upi_id: upiId || null,
            }
          });
        }

        // 5. Update Operating Hours
        if (openTime && closeTime) {
          await tx.vendor_operating_hours.updateMany({
            where: { vendor_id: id },
            data: {
              open_time: openTime,
              close_time: closeTime,
            }
          });
        }
      });

      const admin = await getAdmin();
      await logActivity("VENDOR_DETAILS_UPDATE", { 
        vendorId: id, 
        businessName: businessName 
      }, admin?.id);

      return NextResponse.json({ success: true });
    }

    if (action === "UPDATE_COMMISSION") {
      // Input Validation
      if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 100) {
        return NextResponse.json({ error: "Invalid commission rate. Must be between 0 and 100." }, { status: 400 });
      }
      if (!['ADD_ON', 'DEDUCTED'].includes(commissionModel)) {
        return NextResponse.json({ error: "Invalid commission model." }, { status: 400 });
      }

      await prisma.vendors.update({
        where: { id },
        data: { 
          commissionModel: commissionModel,
          commissionRate: commissionRate
        }
      });

      const admin = await getAdmin();
      await logActivity("VENDOR_COMMISSION_UPDATE", { 
        vendorId: id, 
        businessName: vendor.business_name,
        commissionModel, 
        commissionRate 
      }, admin?.id);

      return NextResponse.json({ success: true });
    }

    let newStatus = vendor.account_status;
    let kycDecision = null;

    if (action === "APPROVE_KYC") {
      newStatus = "UNDER_REVIEW"; // Move to under review after KYC approval
      kycDecision = "approved";
    } else if (action === "REJECT_KYC") {
      newStatus = "REJECTED";
      kycDecision = "rejected";
    } else if (action === "APPROVE_VENDOR") {
      // NOTE: Shadowfax store-code linkage is TEMPORARILY not required for approval
      // (per product decision). Re-enable this gate before going live with real delivery.
      // if (!vendor.sfx_store_code || !vendor.shadowfax_linked) {
      //   return NextResponse.json({ error: "Vendor cannot be approved without Shadowfax integration." }, { status: 400 });
      // }
      newStatus = "ACTIVE";
    } else if (action === "REJECT_VENDOR") {
      newStatus = "REJECTED";
    } else if (action === "SUSPEND") {
      newStatus = "SUSPENDED";
    } else if (action === "DISABLE") {
      const { duration } = body;
      if (duration && duration !== "permanent") {
        const hours = parseInt(duration);
        const expiryDate = new Date(Date.now() + hours * 60 * 60 * 1000);
        newStatus = `DISABLED:${expiryDate.toISOString()}`;
      } else {
        newStatus = "DISABLED";
      }
    } else if (action === "REACTIVATE") {
      newStatus = "ACTIVE";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await prisma.vendors.update({
      where: { id },
      data: { account_status: newStatus }
    });

    if (newStatus !== vendor.account_status) {
      await prisma.vendorStatusLog.create({
        data: {
          vendorId: id,
          oldStatus: vendor.account_status,
          newStatus: newStatus,
          reason: reason || null,
        }
      });
    }

    if (kycDecision) {
      const admin = await getAdmin();
      const kyc = await prisma.vendor_kyc.findFirst({
        where: { vendor_id: id },
        orderBy: { submitted_at: 'desc' }
      });
      
      if (kycDecision === "approved" && kyc) {
        await prisma.vendor_kyc.update({
          where: { id: kyc.id },
          data: { status: "approved", reviewed_at: new Date() }
        });
      } else if (kycDecision === "rejected" && kyc) {
        await prisma.vendor_kyc.update({
          where: { id: kyc.id },
          data: { status: "rejected", reviewed_at: new Date() }
        });
      }

      if (admin && kyc) {
        await prisma.vendorKycReview.create({
          data: {
            adminUserId: admin.id,
            vendorId: id,
            kycId: kyc.id,
            decision: kycDecision,
            rejectionReason: reason || null
          }
        });
      }
    }

    const admin = await getAdmin();
    await logActivity(`VENDOR_${action}`, { 
      vendorId: id, 
      businessName: vendor.business_name,
      oldStatus: vendor.account_status,
      newStatus,
      reason 
    }, admin?.id);

    return NextResponse.json({ success: true, newStatus });
  } catch (error) {
    console.error("Vendor Update API Error:", error);
    
    // Handle Prisma Unique Constraint Errors gracefully
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      const msg = error.message || "";
      if (target.includes('phone') || target.includes('phone_number') || msg.includes('phone') || msg.includes('phone_number')) {
        return NextResponse.json({ error: "This phone number is already registered to another vendor or user profile." }, { status: 400 });
      }
      if (target.includes('email') || msg.includes('email')) {
        return NextResponse.json({ error: "This email address is already registered to another vendor." }, { status: 400 });
      }
      return NextResponse.json({ error: `Unique constraint failed on: ${target.join(', ') || 'duplicate value exists'}` }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
