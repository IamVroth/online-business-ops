import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Online Business Ops",
  description: "Sales, Expenses, Social Media Reports & Business Reports",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
