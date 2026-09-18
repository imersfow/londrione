import { redirect } from "next/navigation";
import { InitialSetupForm } from "@/components/initial-setup-form";
import { installationHasOwnerPublic } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SetupPage() {
  const ownerExists = await installationHasOwnerPublic();

  // Positive owner result locks the installer. If status RPC is temporarily
  // unavailable, the POST route still performs the authoritative owner check.
  if (ownerExists === true) redirect("/dashboard");

  return <InitialSetupForm />;
}
