import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenPanel - 服务器管理面板",
  description: "开源的服务器管理面板",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans">{children}</body>
    </html>
  );
}
