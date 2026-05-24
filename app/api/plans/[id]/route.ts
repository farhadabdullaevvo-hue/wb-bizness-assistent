import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const plan = await db.salesPlan.update({
    where: { id },
    data: { targetRevenue: body.targetRevenue, note: body.note },
  });
  return Response.json(plan);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.salesPlan.delete({ where: { id } });
  return Response.json({ ok: true });
}
