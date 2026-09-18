import { redirect } from "next/navigation";
import { installationHasOwnerPublic } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RegisterPage() {
  const ownerExists = await installationHasOwnerPublic();
  if (ownerExists === false) redirect("/setup");
  redirect("/login?notice=Akun%20staff%20dibuat%20oleh%20Owner%20atau%20Admin.");
}
