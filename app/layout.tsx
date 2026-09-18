import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LondriOne",
  description: "The Operating System for Modern Laundry Business.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
