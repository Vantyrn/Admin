import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/audit";
import { getAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const configs = await prisma.platformConfig.findMany();
    return NextResponse.json(configs);
  } catch (error) {
    console.error("Fetch Config Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { configs } = body; // Array of { key, value }

    if (!configs || !Array.isArray(configs)) {
      return NextResponse.json({ error: "Invalid configs format" }, { status: 400 });
    }

    const admin = await getAdmin();

    const results = await Promise.all(
      configs.map(async (cfg) => {
        return prisma.platformConfig.upsert({
          where: { configKey: cfg.key },
          update: { configValue: cfg.value, updatedBy: admin?.id, updatedAt: new Date() },
          create: { configKey: cfg.key, configValue: cfg.value, updatedBy: admin?.id }
        });
      })
    );

    await logActivity("PLATFORM_CONFIG_UPDATED", { 
      keys: configs.map(c => c.key) 
    }, admin?.id);

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Update Config Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
