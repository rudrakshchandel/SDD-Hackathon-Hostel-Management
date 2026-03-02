import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authEnabled, authOptions, googleOAuthConfigured } from "@/lib/auth";
import LoginCredentialsForm from "./login-credentials-form";

export default async function LoginPage() {
  if (!authEnabled) {
    redirect("/dashboard");
  }

  if (authEnabled) {
    const session = await getServerSession(authOptions);
    if (session) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 md:p-10">
      <section className="glass-panel w-full max-w-md space-y-4 p-6 md:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-600">
            Hostel Management
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Sign In</h1>
          <p className="mt-1 text-sm text-slate-700">
            Sign in with admin credentials to access the dashboard, rooms, and hostel modules.
          </p>
        </div>
        <LoginCredentialsForm />
        {googleOAuthConfigured ? (
          <a
            href="/api/auth/signin/google?callbackUrl=/dashboard"
            className="glass-btn-secondary inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-medium"
          >
            Continue with Google
          </a>
        ) : null}
      </section>
    </main>
  );
}
