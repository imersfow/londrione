import { redirect } from "next/navigation";
import { installationHasOwnerPublic } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OnboardingPage() {
  const ownerExists = await installationHasOwnerPublic();
  if (ownerExists === false) redirect("/setup");
  redirect("/dashboard");
}
