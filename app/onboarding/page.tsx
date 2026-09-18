import { redirect } from "next/navigation";
import { installationHasOwner } from "@/lib/server-auth";

export default async function OnboardingPage() {
  if (!(await installationHasOwner())) redirect("/setup");
  redirect("/dashboard");
}
