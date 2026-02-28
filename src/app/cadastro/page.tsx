import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { RegisterForm } from "@/components/cadastro/register-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

export default function CadastroPage() {
  return (
    <>
      <Navbar />
      <AuthPageShell
        backgroundSrc="/imgs/backgrounds/register.jpg"
        backgroundAlt="Cena de fantasia para tela de cadastro"
      >
        <RegisterForm />
      </AuthPageShell>
      <Footer />
    </>
  );
}
