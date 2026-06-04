import { getAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/cloudflare";

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
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
