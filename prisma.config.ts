import { defineConfig } from "prisma/config";
import path from "node:path";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "prisma", "dev.db")}`,
  },
});
