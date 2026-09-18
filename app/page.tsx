import { redirect } from "next/navigation";
import { installationHasOwner } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await installationHasOwner())) redirect("/setup");
  redirect("/dashboard");
}
