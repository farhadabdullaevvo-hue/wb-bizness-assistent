import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// PATCH /api/catalog/[id] — обновить статус и/или ответственного
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = await db.productCatalog.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.responsible !== undefined && { responsible: body.responsible }),
      ...(body.name !== undefined && { name: body.name }),
    },
  });
  return Response.json(updated);
}
