import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      service: "meg-pocket-db",
      status: "connected",
    });
  } catch (error) {
    console.error("[health/db] Database unavailable", error);

    return NextResponse.json(
      {
        ok: false,
        service: "meg-pocket-db",
        error: "database_unavailable",
      },
      { status: 503 },
    );
  }
}
