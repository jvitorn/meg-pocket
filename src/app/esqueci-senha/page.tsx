import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export default function EsqueciSenhaPage() {
  return (
    <>
      <Navbar />
      <AuthPageShell
        backgroundSrc="/imgs/backgrounds/login.jpg"
        backgroundAlt="Cena de fantasia para recuperação de senha"
      >
        <PasswordResetForm />
      </AuthPageShell>
      <Footer />
    </>
  );
}
