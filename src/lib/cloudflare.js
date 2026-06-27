import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

const R2_CONFIGURED = Boolean(
  process.env.CLOUDFLARE_ACCOUNT_ID &&
  process.env.CLOUDFLARE_ACCESS_KEY_ID &&
  process.env.CLOUDFLARE_SECRET_ACCESS_KEY &&
  process.env.CLOUDFLARE_BUCKET_NAME
);

export async function uploadToR2(file, folder = "vendors", { key } = {}) {
  // No file, or an empty file input (browsers send a 0-byte File for empty <input type=file>).
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) return null;

  // R2 (Tier 2) not configured yet → skip upload gracefully instead of 500-ing the
  // whole vendor creation. Document/logo URLs are saved as null until R2 is set up.
  if (!R2_CONFIGURED) {
    console.warn(`[R2] not configured (CLOUDFLARE_* env vars missing) — skipping upload of '${file.name}'. Vendor will be saved without this document.`);
    return null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Prefer an explicit deterministic key (e.g. kyc/<vendorId>/<docType>.<ext>) so the
  // Admin and Vendor apps store KYC docs identically — scoped per vendor and overwritten
  // cleanly on re-upload. Fall back to a timestamped name under `folder` for generic uploads.
  const fileName = key || `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
    Key: fileName,
    Body: buffer,
    ContentType: file.type,
  });

  try {
    await r2Client.send(command);
    return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;
  } catch (error) {
    console.error("R2 Upload Error:", error);
    throw new Error("Failed to upload file to Cloudflare R2");
  }
}
