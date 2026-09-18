import "./globals.css";
import type { Metadata } from "next";
import { getPublicBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPublicBranding();
  const icon = branding.favicon_url || branding.logo_url || undefined;

  return {
    title: branding.app_name,
    description: branding.app_tagline,
    applicationName: branding.app_name,
    icons: icon
      ? {
          icon,
          shortcut: icon,
          apple: icon,
        }
      : undefined,
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
