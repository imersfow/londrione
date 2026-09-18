export type HomepageBranch = {
  id: string;
  name: string;
  code?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  is_main?: boolean;
  opening_hours?: string | null;
  pickup_enabled?: boolean;
  delivery_enabled?: boolean;
  pickup_delivery_enabled?: boolean;
  pickup_fee?: number;
  delivery_fee?: number;
  pickup_delivery_fee?: number;
  pickup_min_order?: number;
  delivery_min_order?: number;
  delivery_radius_km?: number | null;
  service_area_text?: string | null;
  show_public_prices?: boolean;
  show_public_estimates?: boolean;
  homepage_image_url?: string | null;
};

export type HomepageService = {
  id: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
  category_name: string;
  service_kind: string;
  pricing_mode: string;
  unit_label?: string | null;
  price?: number | null;
  min_quantity?: number | null;
  estimated_minutes?: number | null;
  price_visible: boolean;
  estimate_visible: boolean;
};

export type HomepageStat = { value: string; label: string };
export type HomepageTestimonial = { name: string; meta?: string; text: string; rating?: number };

export type HomepageConfig = {
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_label: string;
  hero_secondary_label: string;
  hero_background_url: string;
  show_services: boolean;
  services_title: string;
  services_subtitle: string;
  show_prices: boolean;
  prices_title: string;
  prices_subtitle: string;
  show_branches: boolean;
  branches_title: string;
  show_about: boolean;
  about_title: string;
  about_body: string;
  show_stats: boolean;
  stats: HomepageStat[];
  show_testimonials: boolean;
  testimonials_title: string;
  testimonials: HomepageTestimonial[];
  show_contact: boolean;
  contact_title: string;
  contact_text: string;
  show_footer: boolean;
  footer_text: string;
};

export const defaultHomepageConfig: HomepageConfig = {
  hero_badge: "Laundry praktis, rapi, dan terpercaya",
  hero_title: "Laundry Lebih Mudah dari Jemput sampai Selesai",
  hero_subtitle: "Lihat layanan, harga, estimasi, dan cabang yang paling dekat dengan Anda.",
  hero_cta_label: "Lihat Daftar Harga",
  hero_secondary_label: "Hubungi via WhatsApp",
  hero_background_url: "",
  show_services: true,
  services_title: "Layanan Laundry Kami",
  services_subtitle: "Pilih layanan sesuai kebutuhan Anda.",
  show_prices: true,
  prices_title: "Daftar Harga",
  prices_subtitle: "Harga dapat berbeda di setiap cabang.",
  show_branches: true,
  branches_title: "Cabang Kami",
  show_about: true,
  about_title: "Laundry yang Lebih Transparan",
  about_body: "Kami membantu pelanggan memantau layanan, harga, estimasi, pickup, dan delivery dengan lebih jelas.",
  show_stats: true,
  stats: [
    { value: "Cepat", label: "Proses Terpantau" },
    { value: "Rapi", label: "Standar Operasional" },
    { value: "Mudah", label: "Pickup & Delivery" },
    { value: "Aman", label: "Tracking Order" },
  ],
  show_testimonials: true,
  testimonials_title: "Kata Pelanggan",
  testimonials: [
    { name: "Pelanggan Laundry", meta: "Pelanggan Setia", text: "Pelayanan cepat, hasil rapi, dan status cucian mudah dipantau.", rating: 5 },
  ],
  show_contact: true,
  contact_title: "Siap Mencuci Hari Ini?",
  contact_text: "Pilih cabang dan hubungi kami untuk informasi layanan atau pickup.",
  show_footer: true,
  footer_text: "Laundry lebih mudah, cepat, dan terorganisir.",
};

export type PublicHomepageData = {
  installed: boolean;
  homepage_enabled: boolean;
  homepage_mode?: "builder" | "custom_html";
  homepage_config?: Partial<HomepageConfig> | null;
  homepage_custom_html?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  business_name?: string;
  app_name?: string;
  app_tagline?: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  theme_config?: unknown;
  selected_branch?: HomepageBranch | null;
  branches?: HomepageBranch[];
  services?: HomepageService[];
};

export function normalizeHomepageConfig(input: unknown): HomepageConfig {
  const raw = input && typeof input === "object" ? input as Partial<HomepageConfig> : {};
  return {
    ...defaultHomepageConfig,
    ...raw,
    stats: Array.isArray(raw.stats) ? raw.stats : defaultHomepageConfig.stats,
    testimonials: Array.isArray(raw.testimonials) ? raw.testimonials : defaultHomepageConfig.testimonials,
  };
}

export async function getPublicHomepage(branchId?: string | null): Promise<PublicHomepageData | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  try {
    const response = await fetch(`${url}/rest/v1/rpc/get_public_homepage`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_branch_id: branchId || null }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json() as PublicHomepageData;
  } catch {
    return null;
  }
}

export function waLink(phone?: string | null, message?: string) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("62") ? digits : digits;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${text}`;
}

export function formatEstimate(minutes?: number | null) {
  const value = Number(minutes ?? 0);
  if (!value) return "";
  if (value < 60) return `${value} menit`;
  if (value < 1440) {
    const hours = Math.round((value / 60) * 10) / 10;
    return `${hours} jam`;
  }
  const days = Math.round((value / 1440) * 10) / 10;
  return `${days} hari`;
}

export function renderCustomHomepageHtml(html: string, data: PublicHomepageData) {
  const branch = data.selected_branch;
  const replacements: Record<string, string> = {
    "{{business_name}}": data.business_name ?? "Laundry",
    "{{app_name}}": data.app_name ?? "LondriOne",
    "{{app_tagline}}": data.app_tagline ?? "",
    "{{logo_url}}": data.logo_url ?? "",
    "{{favicon_url}}": data.favicon_url ?? "",
    "{{branch_name}}": branch?.name ?? "",
    "{{branch_phone}}": branch?.phone ?? "",
    "{{branch_email}}": branch?.email ?? "",
    "{{branch_address}}": branch?.address ?? "",
    "{{branch_city}}": branch?.city ?? "",
    "{{branch_image_url}}": branch?.homepage_image_url ?? "",
  };
  return Object.entries(replacements).reduce((output, [key, value]) => output.split(key).join(value), html);
}
