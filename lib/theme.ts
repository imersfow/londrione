import type { CSSProperties } from "react";

export type GradientPair = { from: string; to: string };

export type ThemeConfig = {
  preset: string;
  primary: string;
  secondary: string;
  sidebar_from: string;
  sidebar_to: string;
  page_glow_1: string;
  page_glow_2: string;
  card_gradients: GradientPair[];
};

export const defaultTheme: ThemeConfig = {
  preset: "aurora",
  primary: "#7C3AED",
  secondary: "#0EA5E9",
  sidebar_from: "#6D28D9",
  sidebar_to: "#0EA5E9",
  page_glow_1: "#7C3AED",
  page_glow_2: "#0EA5E9",
  card_gradients: [
    { from: "#F5F3FF", to: "#E0F2FE" },
    { from: "#E0F2FE", to: "#ECFEFF" },
    { from: "#FFF7ED", to: "#FEF3C7" },
    { from: "#ECFDF5", to: "#CCFBF1" },
    { from: "#FDF2F8", to: "#F5F3FF" },
    { from: "#ECFEFF", to: "#E0F2FE" },
    { from: "#EEF2FF", to: "#F5F3FF" },
    { from: "#F7FEE7", to: "#ECFDF5" },
  ],
};

export const themePresets: Record<string, ThemeConfig> = {
  aurora: defaultTheme,
  ocean: {
    preset: "ocean",
    primary: "#2563EB",
    secondary: "#06B6D4",
    sidebar_from: "#1D4ED8",
    sidebar_to: "#0891B2",
    page_glow_1: "#3B82F6",
    page_glow_2: "#06B6D4",
    card_gradients: [
      { from: "#EFF6FF", to: "#ECFEFF" },
      { from: "#E0F2FE", to: "#CFFAFE" },
      { from: "#F0F9FF", to: "#DBEAFE" },
      { from: "#ECFDF5", to: "#D1FAE5" },
      { from: "#EEF2FF", to: "#E0E7FF" },
      { from: "#ECFEFF", to: "#DBEAFE" },
      { from: "#F8FAFC", to: "#EFF6FF" },
      { from: "#F0FDFA", to: "#ECFEFF" },
    ],
  },
  sunset: {
    preset: "sunset",
    primary: "#EA580C",
    secondary: "#F43F5E",
    sidebar_from: "#C2410C",
    sidebar_to: "#E11D48",
    page_glow_1: "#FB923C",
    page_glow_2: "#FB7185",
    card_gradients: [
      { from: "#FFF7ED", to: "#FFF1F2" },
      { from: "#FFFBEB", to: "#FFF7ED" },
      { from: "#FEF3C7", to: "#FFEDD5" },
      { from: "#ECFDF5", to: "#FEF3C7" },
      { from: "#FFF1F2", to: "#FCE7F3" },
      { from: "#FAF5FF", to: "#FFF1F2" },
      { from: "#FFF7ED", to: "#FAF5FF" },
      { from: "#F7FEE7", to: "#FFF7ED" },
    ],
  },
  mint: {
    preset: "mint",
    primary: "#059669",
    secondary: "#14B8A6",
    sidebar_from: "#047857",
    sidebar_to: "#0F766E",
    page_glow_1: "#10B981",
    page_glow_2: "#2DD4BF",
    card_gradients: [
      { from: "#ECFDF5", to: "#F0FDFA" },
      { from: "#F0FDFA", to: "#ECFEFF" },
      { from: "#F7FEE7", to: "#ECFDF5" },
      { from: "#D1FAE5", to: "#CCFBF1" },
      { from: "#F0FDF4", to: "#ECFDF5" },
      { from: "#ECFEFF", to: "#F0FDFA" },
      { from: "#F8FAFC", to: "#ECFDF5" },
      { from: "#F7FEE7", to: "#F0FDFA" },
    ],
  },
  rose: {
    preset: "rose",
    primary: "#DB2777",
    secondary: "#8B5CF6",
    sidebar_from: "#BE185D",
    sidebar_to: "#7C3AED",
    page_glow_1: "#EC4899",
    page_glow_2: "#A78BFA",
    card_gradients: [
      { from: "#FDF2F8", to: "#F5F3FF" },
      { from: "#FAF5FF", to: "#EEF2FF" },
      { from: "#FFF7ED", to: "#FDF2F8" },
      { from: "#ECFDF5", to: "#FDF2F8" },
      { from: "#FCE7F3", to: "#EDE9FE" },
      { from: "#F5F3FF", to: "#E0F2FE" },
      { from: "#FFF1F2", to: "#FAF5FF" },
      { from: "#F7FEE7", to: "#FDF2F8" },
    ],
  },
  graphite: {
    preset: "graphite",
    primary: "#334155",
    secondary: "#64748B",
    sidebar_from: "#0F172A",
    sidebar_to: "#475569",
    page_glow_1: "#64748B",
    page_glow_2: "#94A3B8",
    card_gradients: [
      { from: "#F8FAFC", to: "#F1F5F9" },
      { from: "#F1F5F9", to: "#E2E8F0" },
      { from: "#FAFAF9", to: "#F5F5F4" },
      { from: "#F8FAFC", to: "#F0FDFA" },
      { from: "#FAFAFA", to: "#F1F5F9" },
      { from: "#F8FAFC", to: "#ECFEFF" },
      { from: "#F1F5F9", to: "#EEF2FF" },
      { from: "#F8FAFC", to: "#F7FEE7" },
    ],
  },
};

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function normalizeTheme(raw: unknown): ThemeConfig {
  const source = raw && typeof raw === "object" ? (raw as Partial<ThemeConfig>) : {};
  const presetBase = typeof source.preset === "string" && themePresets[source.preset]
    ? themePresets[source.preset]
    : defaultTheme;

  const incoming = Array.isArray(source.card_gradients) ? source.card_gradients : [];
  const cardGradients = Array.from({ length: 8 }, (_, index) => {
    const fallback = presetBase.card_gradients[index] ?? defaultTheme.card_gradients[index];
    const item = incoming[index] as Partial<GradientPair> | undefined;
    return {
      from: isHex(item?.from) ? item!.from! : fallback.from,
      to: isHex(item?.to) ? item!.to! : fallback.to,
    };
  });

  return {
    preset: typeof source.preset === "string" ? source.preset : presetBase.preset,
    primary: isHex(source.primary) ? source.primary : presetBase.primary,
    secondary: isHex(source.secondary) ? source.secondary : presetBase.secondary,
    sidebar_from: isHex(source.sidebar_from) ? source.sidebar_from : presetBase.sidebar_from,
    sidebar_to: isHex(source.sidebar_to) ? source.sidebar_to : presetBase.sidebar_to,
    page_glow_1: isHex(source.page_glow_1) ? source.page_glow_1 : presetBase.page_glow_1,
    page_glow_2: isHex(source.page_glow_2) ? source.page_glow_2 : presetBase.page_glow_2,
    card_gradients: cardGradients,
  };
}

export function themeCssVars(theme: ThemeConfig): CSSProperties {
  const vars: Record<string, string> = {
    "--brand-primary": theme.primary,
    "--brand-secondary": theme.secondary,
    "--sidebar-from": theme.sidebar_from,
    "--sidebar-to": theme.sidebar_to,
    "--page-glow-1": theme.page_glow_1,
    "--page-glow-2": theme.page_glow_2,
  };

  theme.card_gradients.forEach((gradient, index) => {
    vars[`--card-${index + 1}-from`] = gradient.from;
    vars[`--card-${index + 1}-to`] = gradient.to;
  });

  return vars as CSSProperties;
}
