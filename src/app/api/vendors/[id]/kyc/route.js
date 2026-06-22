import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/cloudflare";
import { getAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import crypto from "crypto";

// Replace / update a vendor's KYC documents after the vendor already exists.
// Accepts multipart/form-data with any subset of: govId, businessProof, panCard, addressProof.
// Only the documents that are actually provided are re-uploaded and overwritten; the rest
// are left untouched. Files are stored under the SAME deterministic per-vendor keys used at
// vendor creation (kyc/<vendorId>/<docToken>.<ext>) so re-uploads overwrite cleanly.
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const admin = await getAdmin();

    const vendor = await prisma.vendors.findUnique({ where: { id } });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    const formData = await request.formData();
    const govIdFile = formData.get("govId");
    const businessProofFile = formData.get("businessProof");
    const panCardFile = formData.get("panCard");
    const addressProofFile = formData.get("addressProof");

    const fileExt = (f, fallback = "jpg") => {
      const ext = f?.name?.split(".").pop()?.toLowerCase();
      return ext && ext.length <= 5 ? ext : fallback;
    };

    // A browser sends a 0-byte File for an untouched <input type=file>, so filter those out.
    const isProvided = (f) => f && typeof f.arrayBuffer === "function" && f.size > 0;
    const providedCount = [govIdFile, businessProofFile, panCardFile, addressProofFile].filter(isProvided).length;
    if (providedCount === 0) {
      return NextResponse.json({ error: "No documents were provided to update." }, { status: 400 });
    }

    // Upload only the provided files (uploadToR2 returns null for empty/missing inputs).
    let govIdUrl, businessProofUrl, panCardUrl, addressProofUrl;
    try {
      [govIdUrl, businessProofUrl, panCardUrl, addressProofUrl] = await Promise.all([
        uploadToR2(govIdFile, null, { key: `kyc/${id}/gov_id.${fileExt(govIdFile)}` }),
        uploadToR2(businessProofFile, null, { key: `kyc/${id}/biz_proof.${fileExt(businessProofFile)}` }),
        uploadToR2(panCardFile, null, { key: `kyc/${id}/pan.${fileExt(panCardFile)}` }),
        uploadToR2(addressProofFile, null, { key: `kyc/${id}/address_proof.${fileExt(addressProofFile)}` }),
      ]);
    } catch (uploadError) {
      console.error("Vendor KYC document upload to R2 failed:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload KYC documents to storage. Please try again." },
        { status: 502 }
      );
    }

    const updateData = {};
    if (govIdUrl) updateData.gov_id_url = govIdUrl;
    if (businessProofUrl) updateData.business_proof_url = businessProofUrl;
    if (panCardUrl) updateData.pan_url = panCardUrl;
    if (addressProofUrl) updateData.address_proof_url = addressProofUrl;

    // Files were provided but nothing uploaded → R2 isn't configured (uploadToR2 returned null).
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Document storage is not configured, so KYC documents could not be saved." },
        { status: 502 }
      );
    }

    // Update the latest KYC record in place, or create one if this vendor has none yet.
    const latestKyc = await prisma.vendor_kyc.findFirst({
      where: { vendor_id: id },
      orderBy: { submitted_at: "desc" },
    });

    if (latestKyc) {
      await prisma.vendor_kyc.update({
        where: { id: latestKyc.id },
        data: updateData,
      });
    } else {
      await prisma.vendor_kyc.create({
        data: {
          id: crypto.randomUUID(),
          vendor_id: id,
          ...updateData,
          status: "submitted",
        },
      });
    }

    const updatedDocs = [
      govIdUrl && "Government ID",
      businessProofUrl && "Business Proof",
      panCardUrl && "PAN Card",
      addressProofUrl && "Address Proof",
    ].filter(Boolean);

    await logActivity(
      "VENDOR_KYC_DOCUMENTS_UPDATED",
      { vendorId: id, businessName: vendor.business_name, documents: updatedDocs },
      admin?.id
    );

    return NextResponse.json({ success: true, updatedDocuments: updatedDocs });
  } catch (error) {
    console.error("Vendor KYC Update API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
