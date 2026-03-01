import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authEnabled, authOptions } from "@/lib/auth";

export default async function HomePage() {
  if (!authEnabled) {
    redirect("/dashboard");
  }

  const session = await getServerSession(authOptions);
  redirect(session ? "/dashboard" : "/login");
}
