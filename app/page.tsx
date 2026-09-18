import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import { installationHasOwnerPublic } from "@/lib/server-auth";
import { getPublicHomepage, renderCustomHomepageHtml } from "@/lib/homepage";
import { PublicHomepage } from "@/components/public-homepage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPublicHomepage(null);
  if (!data?.homepage_enabled) return {};
  return {
    title: data.seo_title || data.business_name || data.app_name || "Laundry",
    description: data.seo_description || data.app_tagline || "Laundry",
    keywords: data.seo_keywords || undefined,
    icons: data.favicon_url ? { icon: data.favicon_url } : undefined,
  };
}

export default async function Home({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const { branch } = await searchParams;
  const data = await getPublicHomepage(branch || null);

  if (data?.installed === false) redirect("/setup");

  if (data?.homepage_enabled) {
    if (data.homepage_mode === "custom_html" && data.homepage_custom_html?.trim()) {
      const html = renderCustomHomepageHtml(data.homepage_custom_html, data);
      return <iframe title="Homepage" srcDoc={html} className="fixed inset-0 h-screen w-screen border-0 bg-white" sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"/>;
    }
    return <PublicHomepage data={data}/>;
  }

  const ownerExists = await installationHasOwnerPublic();
  if (ownerExists === false) redirect("/setup");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/login");
}
