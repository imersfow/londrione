import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { installationHasOwnerPublic } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const ownerExists = await installationHasOwnerPublic();

  // Only send a brand-new installation to setup when the RPC positively says
  // no Owner exists. If status cannot be read, fail safely into normal auth.
  if (ownerExists === false) redirect("/setup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
