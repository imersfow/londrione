import { redirect } from "next/navigation";
import { InitialSetupForm } from "@/components/initial-setup-form";
import { installationHasOwner } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await installationHasOwner()) redirect("/dashboard");
  return <InitialSetupForm />;
}
