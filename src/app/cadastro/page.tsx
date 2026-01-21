import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { RegisterForm } from "@/components/cadastro/register-form";

export default function CadastroPage() {
  return (
    <>
      <Navbar />
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-md flex-col gap-6">
          <RegisterForm />
        </div>
      </div>
      <Footer />
    </>
  );
}
