import { redirect } from "next/navigation";
import { installationHasOwner } from "@/lib/server-auth";

export default async function RegisterPage() {
  if (!(await installationHasOwner())) redirect("/setup");
  redirect("/login?notice=Akun%20staff%20dibuat%20oleh%20Owner%20atau%20Admin.");
}
