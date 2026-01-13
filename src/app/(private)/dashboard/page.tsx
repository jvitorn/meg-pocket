import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LogoutButton from "./logout-button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow">
        <h1 className="text-xl font-semibold mb-2">
          Bem-vindo{session?.user?.name ? "," : ""} {session?.user?.name}
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          Você está logado com sua conta Google.
        </p>

        <LogoutButton />
      </div>
    </main>
  );
}
