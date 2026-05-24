import { generateAlerts } from "@/lib/alerts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "1";

  try {
    const alerts = await generateAlerts(refresh);
    return Response.json({ alerts, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Alerts error:", err);
    return Response.json({ alerts: [], error: String(err) }, { status: 500 });
  }
}
