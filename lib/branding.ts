export type PublicBranding = {
  business_name: string;
  app_name: string;
  app_tagline: string;
  logo_url: string | null;
  favicon_url: string | null;
};

const fallback: PublicBranding = {
  business_name: "Laundry",
  app_name: "LondriOne",
  app_tagline: "The Operating System for Modern Laundry Business.",
  logo_url: null,
  favicon_url: null,
};

export async function getPublicBranding(): Promise<PublicBranding> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return fallback;

  try {
    const response = await fetch(`${url}/rest/v1/rpc/get_public_branding`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    });

    if (!response.ok) return fallback;
    const data = (await response.json()) as Partial<PublicBranding> | null;
    if (!data) return fallback;

    return {
      business_name: data.business_name || fallback.business_name,
      app_name: data.app_name || fallback.app_name,
      app_tagline: data.app_tagline || fallback.app_tagline,
      logo_url: data.logo_url || null,
      favicon_url: data.favicon_url || null,
    };
  } catch {
    return fallback;
  }
}
