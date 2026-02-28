import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { BackgroundHome } from "@/components/background-home";
import { HomeFaq } from "@/components/home-faq";
import { HomeQuickStart } from "@/components/home-quick-start";
import { Navbar } from "@/components/navbar";
import { authOptions } from "@/lib/auth";
import { getCampanhas } from "@/data/campanhas";

export const metadata: Metadata = {
  title: "Magos & Grimórios | Crie personagens e campanhas em Valthera",
  description:
    "Monte sua ficha, domine magias e jogue campanhas de Magos & Grimórios em uma plataforma web rápida e interativa.",
  openGraph: {
    title: "Magos & Grimórios",
    description:
      "Crie personagens, participe de campanhas e gerencie sua jornada em Valthera.",
    type: "website",
    images: [
      {
        url: "/imgs/backgrounds/home.jpg",
        width: 1200,
        height: 630,
        alt: "Panorama de Valthera",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Magos & Grimórios",
    description:
      "Crie personagens, participe de campanhas e gerencie sua jornada em Valthera.",
    images: ["/imgs/backgrounds/home.jpg"],
  },
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session?.user);
  const featuredCampaigns = (await getCampanhas()).slice(0, 3);

  return (
    <>
      <Navbar />
      <BackgroundHome
        title="TORNE-SE A LENDA QUE VALTHERA ESPERA"
        subtitle="Desperte seu grimório, domine magias únicas e enfrente os desafios de Valthera — um mundo à beira do colapso."
        primaryCta={{ label: "Ver campanhas", href: "/campanhas" }}
        secondaryCta={{
          label: isAuthenticated ? "Criar personagem" : "Criar conta",
          href: isAuthenticated ? "/personagens/novo" : "/cadastro",
        }}
      />
      <HomeQuickStart featuredCampaigns={featuredCampaigns} />
      <HomeFaq isAuthenticated={isAuthenticated} />
    </>
  );
}
