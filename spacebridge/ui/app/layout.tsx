import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spacebridge War Room",
  description: "Multi-repo entity pipeline view",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
