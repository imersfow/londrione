export function rupiah(value: unknown) {
  return `Rp ${Math.round(Number(value ?? 0)).toLocaleString("id-ID")}`;
}

export function dateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

export const statusLabel: Record<string, string> = {
  draft: "Draft", received: "Diterima", washing: "Dicuci", drying: "Dikeringkan",
  ironing: "Disetrika", ready: "Siap Diambil", out_for_delivery: "Dalam Pengantaran",
  completed: "Selesai", cancelled: "Dibatalkan", unpaid: "Belum Bayar", partial: "Sebagian", paid: "Lunas",
};

export function statusClass(status: string) {
  if (["completed", "paid"].includes(status)) return "badge-success";
  if (["ready"].includes(status)) return "badge-info";
  if (["cancelled"].includes(status)) return "badge-danger";
  if (["washing", "drying", "ironing", "out_for_delivery", "partial"].includes(status)) return "badge-warning";
  return "badge-neutral";
}
