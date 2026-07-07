import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "工事写真整理 - 選別・リネーム・写真帳",
  description:
    "現場写真をタップした順に採番・一括リネームし、写真帳（Excel）まで作成するWebアプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="no-select">{children}</body>
    </html>
  );
}
