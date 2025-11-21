import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { LoadingSpinner } from "@/components/loadingSpinner";
import PersonagemCampanhaClient from "@/components/personagens/personagemCampanhaClient";
import { Footer } from "@/components/footer";

export default function PersonagemCampanhaPage() {
  return (
     <>
      <Navbar />
      <Suspense fallback={<LoadingSpinner />}>
        <PersonagemCampanhaClient />
      </Suspense>
      <Footer/>
    </>
  );
}
