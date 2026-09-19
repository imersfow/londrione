import "./globals.css";
import type { Metadata } from "next";
import { AppRuntime } from "@/components/app-runtime";
import { PwaRuntime } from "@/components/pwa-runtime";

export const metadata: Metadata = {
  title: "LondriOne",
  description: "Laundry Operating System",
  applicationName: "LondriOne",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "LondriOne" },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <PwaRuntime />
        <AppRuntime>{children}</AppRuntime>
      </body>
    </html>
  );
}
