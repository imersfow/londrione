export type PublicTrackingData = {
  found: boolean;
  type?: "request" | "order";
  business?: { name?: string; app_name?: string; app_tagline?: string; logo_url?: string | null; theme_config?: unknown };
  branch?: any;
  request?: any;
  order?: any;
  items?: any[];
  history?: any[];
};

export async function getPublicTracking(token: string): Promise<PublicTrackingData | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const response = await fetch(`${url}/rest/v1/rpc/get_public_tracking`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_token: token }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json() as PublicTrackingData;
  } catch {
    return null;
  }
}
