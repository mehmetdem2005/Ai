import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sovereign Kokpit",
  description: "Editöryal onay paneli",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
