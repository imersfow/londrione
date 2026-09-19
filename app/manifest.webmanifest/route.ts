import { getPublicHomepage } from "@/lib/homepage";
import { normalizeTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getPublicHomepage();
  const theme = normalizeTheme(data?.theme_config);
  const appName = data?.app_name || data?.business_name || "LondriOne";
  const shortName = appName.length > 18 ? appName.slice(0, 18) : appName;
  const icon = data?.logo_url || data?.favicon_url || "/londrione-pwa.svg";

  return Response.json({
    name: appName,
    short_name: shortName,
    description: data?.app_tagline || "Laundry Operating System",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: theme.primary,
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    icons: [
      { src: icon, sizes: "any", purpose: "any maskable" }
    ],
    shortcuts: [
      { name: "Dashboard", short_name: "Dashboard", url: "/dashboard" },
      { name: "Order Baru", short_name: "Order", url: "/orders/new" },
      { name: "Produksi", short_name: "Produksi", url: "/production" }
    ]
  }, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
