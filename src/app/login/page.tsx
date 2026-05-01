import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/login/login-form";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toaster } from "sonner";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ expired?: string }>;
}) {
  const params = await searchParams;
  const showExpiredNotice = params?.expired === "1";

  return (
    <>
      <Navbar />
      <Toaster position="top-right" />
      <AuthPageShell
        backgroundSrc="/imgs/backgrounds/login.jpg"
        backgroundAlt="Cena de fantasia para tela de login"
      >
        <LoginForm showExpiredNotice={showExpiredNotice} />
      </AuthPageShell>
      <Footer />
    </>
  );
}
