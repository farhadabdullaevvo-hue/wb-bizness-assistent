import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// PATCH /api/tasks/[id] — обновить статус или данные задачи
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const task = await db.task.update({
    where: { id },
    data: body,
  });

  return Response.json(task);
}

// DELETE /api/tasks/[id] — удалить задачу
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.task.delete({ where: { id } });
  return Response.json({ ok: true });
}
