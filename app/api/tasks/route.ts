import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// GET /api/tasks — получить все задачи
export async function GET() {
  const tasks = await db.task.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json(tasks);
}

// POST /api/tasks — создать задачу
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, assignee, priority, deadline, note } = body;

  if (!title?.trim() || !assignee?.trim()) {
    return Response.json({ error: "Название и исполнитель обязательны" }, { status: 400 });
  }

  const task = await db.task.create({
    data: {
      title: title.trim(),
      assignee: assignee.trim(),
      priority: priority ?? "normal",
      deadline: deadline ? new Date(deadline) : null,
      note: note?.trim() || null,
      status: "todo",
    },
  });

  return Response.json(task, { status: 201 });
}
