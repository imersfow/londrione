import "./globals.css";
import type { Metadata } from "next";
import { AppRuntime } from "@/components/app-runtime";

export const metadata: Metadata = {
  title: "LondriOne",
  description: "Laundry Operating System",
  applicationName: "LondriOne",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <AppRuntime>{children}</AppRuntime>
      </body>
    </html>
  );
}
