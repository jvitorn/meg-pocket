import Image from "next/image";
import Link from "next/link";
import { BackgroundHome } from "@/components/background-home";
import { Navbar } from "@/components/navbar";
import { OverviewFeatures } from "@/components/overview-features";

export default function Home() {
  return (
    <>
     <Navbar/>
     <BackgroundHome
            title="TORNE-SE A LENDA QUE VALTHERA ESPERA"
            subtitle="Desperte seu grimório, domine magias únicas e enfrente os desafios de Valthera — um mundo à beira do colapso."
            buttonText="Ver campanhas"
          />
      <OverviewFeatures
            title="Sobre o Magos & Grimórios"
            subtitle="Explore um sistema único e criativo, crie magias poderosas e desvende os segredos do mundo mágico de Valthera."
            cards={[
              {
                icon: "WandSparkles",
                title: "Magias Assinaturas",
                description: "Crie magias únicas que evoluem com você.",
              },
              {
                icon: "Users",
                title: "Raças e Classes",
                description: "Personalize o seu mago e crie um herói único.",
              },
              {
                icon: "BookMarked",
                title: "Ficha Online e Interativa",
                description:
                  "Gerencie todos os detalhes do seu personagem em tempo real.",
              },
              {
                icon: "Shield",
                title: "Invocações",
                description: "Crie e invoque criaturas poderosas.",
              },
            ]}
          />
    </>
   
  );
}
