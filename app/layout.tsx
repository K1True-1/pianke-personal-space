import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "片刻 · 我的个人空间",
  description: "收集照片、保存代码、书写故事，让每一天的创作留下痕迹。",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN" className="dark"><body>{children}</body></html>;
}
