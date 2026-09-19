import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublicHomepage } from "@/lib/homepage";
import { PublicOnlineOrder } from "@/components/public-online-order";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPublicHomepage(null);
  return {
    title: `Order Online • ${data?.business_name || data?.app_name || "Laundry"}`,
    description: "Request pickup atau drop-off laundry secara online.",
    icons: data?.favicon_url ? { icon: data.favicon_url } : undefined,
  };
}

export default async function OnlineOrderPage({ searchParams }: { searchParams: Promise<{ branch?: string; service?: string }> }) {
  const { branch, service } = await searchParams;
  const data = await getPublicHomepage(branch || null);
  if (!data?.installed) redirect("/setup");
  if (!data?.selected_branch) redirect("/");
  return <PublicOnlineOrder data={data} initialServiceId={service || null}/>;
}
