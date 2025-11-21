import CampanhasClient from "@/components/campanhas/campanhasClient";
import { getCampanhas } from "@/data/campanhas";
import type { CampanhaInterface } from "@/types";

export default async function CampanhasServer() {
  let campanhas: CampanhaInterface[] = [];
  let error: string | null = null;

  try {
    campanhas = await getCampanhas();
  } catch (err) {
    console.error("Erro ao carregar campanhas (server):", err);
    error = (err as Error).message;
  }

  if (error) {
    return (
      <div className="text-center mt-10 text-red-500">
        Erro: {error}
      </div>
    );
  }

  return <CampanhasClient initialCampanhas={campanhas} />;
}
