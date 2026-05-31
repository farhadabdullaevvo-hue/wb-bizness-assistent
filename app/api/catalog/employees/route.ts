import { db } from "@/lib/db";

// GET /api/catalog/employees — список сотрудников с их артикулами
export async function GET() {
  const products = await db.productCatalog.findMany({
    orderBy: { article: "asc" },
  });

  // Группируем по ответственному
  const map = new Map<string, typeof products>();

  for (const p of products) {
    const key = p.responsible ?? "Не назначен";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  const employees = [...map.entries()].map(([name, items]) => ({
    name,
    total: items.length,
    byStatus: items.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {}),
    products: items,
  })).sort((a, b) => {
    if (a.name === "Не назначен") return 1;
    if (b.name === "Не назначен") return -1;
    return a.name.localeCompare(b.name, "ru");
  });

  return Response.json(employees);
}
