import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/sidebar";

export const metadata: Metadata = {
  title: "WB Бизнес-ассистент",
  description: "AI помощник для управления магазином на Wildberries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <body className="h-full flex" style={{ backgroundColor: "#f8fafc" }}>
        <Sidebar />
        <main className="flex-1 ml-64 min-h-full overflow-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
