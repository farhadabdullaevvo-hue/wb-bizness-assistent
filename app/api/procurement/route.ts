import { NextRequest } from "next/server";
import { getCachedSnapshot, getWBSnapshot } from "@/lib/wb-cache";
import { buildForecast, DEFAULT_SETTINGS } from "@/lib/forecast";

// GET /api/procurement?refresh=1&leadTime=14&targetDays=90
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get("refresh") === "1";

  const leadTimeDays = Math.max(1, parseInt(searchParams.get("leadTime") ?? String(DEFAULT_SETTINGS.leadTimeDays)));
  const targetDays   = Math.max(7, parseInt(searchParams.get("targetDays") ?? String(DEFAULT_SETTINGS.targetDays)));

  const snapshot = refresh ? await getWBSnapshot() : (getCachedSnapshot() ?? await getWBSnapshot());
  if (!snapshot) {
    return Response.json({ error: "Нет данных WB API" }, { status: 503 });
  }

  const items = buildForecast(snapshot, { leadTimeDays, targetDays });
  return Response.json({
    items,
    settings: { leadTimeDays, targetDays },
    wbAvailable: !snapshot.isMock,
    updatedAt: snapshot.fetchedAt,
  });
}
