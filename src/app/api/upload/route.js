import { getAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/cloudflare";
import { logActivity } from "@/lib/audit";
import logger from "@/lib/logger";

export async function POST(request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const url = await uploadToR2(file, "uploads");

    await logActivity(
      "ADMIN_FILE_UPLOAD",
      { fileName: file.name, fileType: file.type, fileSize: file.size },
      admin.id
    );

    return NextResponse.json({ url });
  } catch (error) {
    logger.error("Admin file upload to R2 failed", error, {
      component: "lib/cloudflare (R2)",
      operation: "POST uploadFile",
      adminId: admin.id,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
