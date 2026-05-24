import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.expense.delete({ where: { id } });
  return Response.json({ ok: true });
}
