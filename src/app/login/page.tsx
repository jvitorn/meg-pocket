import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/login/login-form";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <AuthPageShell
        backgroundSrc="/imgs/backgrounds/login.jpg"
        backgroundAlt="Cena de fantasia para tela de login"
      >
        <LoginForm />
      </AuthPageShell>
      <Footer />
    </>
  );
}
