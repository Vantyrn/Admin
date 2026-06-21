import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/cloudflare";
import { getAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import logger from "@/lib/logger";
import crypto from "crypto";

export async function GET() {
  try {
    const vendors = await prisma.vendors.findMany({
      take: 50,
      select: {
        id: true,
        business_name: true,
        owner_name: true,
        profiles: {
          select: {
            phone_number: true
          }
        },
        business_category: true,
        account_status: true,
        online_status: true,
        created_at: true,
        sfx_store_code: true
      },
      orderBy: { created_at: 'desc' }
    });

    const mappedVendors = vendors.map(v => ({
      id: v.id,
      businessName: v.business_name,
      ownerName: v.owner_name,
      phone: v.profiles?.phone_number || "N/A",
      sfxStoreCode: v.sfx_store_code,
      category: v.business_category || "General",
      status: v.account_status.toUpperCase(),
      kycStatus: v.account_status.toUpperCase(), // Using account_status as proxy
      isOnline: v.online_status?.toLowerCase() === 'online'
    }));

    return NextResponse.json(mappedVendors);
  } catch (error) {
    logger.error("Failed to list vendors", error, {
      component: "api/vendors",
      operation: "GET listVendors",
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAdmin();

    const formData = await request.formData();
    
    // Extracting fields from formData
    const businessName = formData.get("businessName");
    const ownerName = formData.get("ownerName");
    const phone = formData.get("phone");
    const email = formData.get("email");
    const category = formData.get("category");
    const address = formData.get("address");
    const latitude = formData.get("latitude");
    const longitude = formData.get("longitude");
    const openTime = formData.get("openTime") || "09:00";
    const closeTime = formData.get("closeTime") || "22:00";
    const description = formData.get("description") || "";
    const logoFile = formData.get("logo");

    const accountHolderName = formData.get("accountHolderName");
    const bankName = formData.get("bankName");
    const accountNumber = formData.get("accountNumber");
    const ifscCode = formData.get("ifscCode");
    const upiId = formData.get("upiId");

    const govIdFile = formData.get("govId");
    const businessProofFile = formData.get("businessProof");
    const panCardFile = formData.get("panCard");
    const addressProofFile = formData.get("addressProof");

    // Upload files to R2 (isolated so a storage failure is reported as exactly that,
    // and not confused with a later database error).
    let govIdUrl, businessProofUrl, panCardUrl, addressProofUrl, logoUrl;
    try {
      [govIdUrl, businessProofUrl, panCardUrl, addressProofUrl, logoUrl] = await Promise.all([
        uploadToR2(govIdFile, "kyc/gov_id"),
        uploadToR2(businessProofFile, "kyc/business_proof"),
        uploadToR2(panCardFile, "kyc/pan"),
        uploadToR2(addressProofFile, "kyc/address_proof"),
        uploadToR2(logoFile, "logos"),
      ]);
    } catch (uploadError) {
      logger.error("Vendor document upload to R2 failed", uploadError, {
        component: "lib/cloudflare (R2)",
        operation: "POST createVendor → uploadToR2",
        adminId: admin?.id,
        businessName,
      });
      return NextResponse.json(
        { error: "Failed to upload vendor documents to storage. Please try again." },
        { status: 502 }
      );
    }

    const vendorId = crypto.randomUUID();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check or Create Profile under Path A
      let profileRecord = await tx.profiles.findUnique({
        where: { phone_number: phone }
      });

      if (profileRecord) {
        if (profileRecord.role === 'VENDOR') {
          throw new Error("This phone number is already registered to a vendor account.");
        }
        if (!profileRecord.role) {
          await tx.profiles.update({
            where: { id: profileRecord.id },
            data: { role: 'VENDOR' }
          });
        }
      } else {
        profileRecord = await tx.profiles.create({
          data: {
            id: crypto.randomUUID(),
            firebase_uid: `vendor_${crypto.randomUUID().slice(0, 8)}`,
            phone_number: phone,
            role: 'VENDOR',
            profile_status: 'PENDING'
          }
        });
      }

      // 2. Create Vendor linked to Profile
      const vendor = await tx.vendors.create({
        data: {
          id: vendorId,
          profile_id: profileRecord.id,
          business_name: businessName,
          owner_name: ownerName,
          email: email,
          business_category: category,
          business_address: address,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          store_description: description,
          account_status: 'PENDING',
          logo_url: logoUrl,
        }
      });

      // 2. Create Bank Details
      await tx.vendor_bank_details.create({
        data: {
          id: crypto.randomUUID(),
          vendor_id: vendorId,
          account_holder: accountHolderName,
          bank_name: bankName,
          account_number: accountNumber,
          ifsc_code: ifscCode,
          upi_id: upiId,
        }
      });

      // 3. Create KYC
      await tx.vendor_kyc.create({
        data: {
          id: crypto.randomUUID(),
          vendor_id: vendorId,
          gov_id_url: govIdUrl,
          business_proof_url: businessProofUrl,
          pan_url: panCardUrl,
          address_proof_url: addressProofUrl,
          status: 'submitted'
        }
      });

      // 4. Create Operating Hours (All 7 days)
      const operatingHoursData = [];
      for (let i = 1; i <= 7; i++) {
        operatingHoursData.push({
          id: crypto.randomUUID(),
          vendor_id: vendorId,
          day_of_week: i,
          open_time: openTime,
          close_time: closeTime,
          is_closed: false
        });
      }
      await tx.vendor_operating_hours.createMany({
        data: operatingHoursData
      });

      // 5. Create Admin Notification
      await tx.admin_notifications.create({
        data: {
          id: crypto.randomUUID(),
          title: "KYC Pending Review",
          description: `Vendor '${businessName}' uploaded documents`,
          type: "KYC",
          is_read: false
        }
      });

      return vendor;
    });

    // Audit: admin added a vendor, and which KYC documents were uploaded for them.
    const uploadedDocs = [
      govIdUrl && "Government ID",
      businessProofUrl && "Business Proof",
      panCardUrl && "PAN Card",
      addressProofUrl && "Address Proof",
    ].filter(Boolean);

    await logActivity(
      "VENDOR_CREATED",
      { vendorId: result.id, businessName, ownerName, category, uploadedDocuments: uploadedDocs },
      admin?.id
    );

    if (uploadedDocs.length > 0) {
      await logActivity(
        "VENDOR_DOCUMENTS_UPLOADED",
        { vendorId: result.id, businessName, documents: uploadedDocs },
        admin?.id
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Vendor creation failed (database transaction)", error, {
      component: "api/vendors",
      operation: "POST createVendor (db transaction)",
      prismaCode: error?.code,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
