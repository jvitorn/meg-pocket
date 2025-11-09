"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface BackgroundHomeProps {
  title: string;
  subtitle: string;
  buttonText: string;
}

export function BackgroundHome({
  title,
  subtitle,
  buttonText,
}: BackgroundHomeProps) {
  return (
    <section className="relative w-full min-h-screen text-center px-6 flex flex-col justify-start overflow-hidden">
      {/* Imagem de fundo via Next/Image */}
      <Image
        src="/imgs/backgrounds/home.jpg"
        alt="Panorama de Valthera ao amanhecer"
        fill
        className="object-cover"
        priority
      />

      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/60 z-10" />

      {/* Gradiente mágico roxo→dourado */}
      <div className="absolute inset-0 z-10 bg-linear-to-r from-purple-900/30 via-transparent to-yellow-600/20 mix-blend-soft-light" />

      {/* Conteúdo */}
      <div className="relative z-20 w-full max-w-4xl text-white pt-32 md:pt-56 px-4 mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight drop-shadow-xl">
          {title}
        </h1>
        <p className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
          {subtitle}
        </p>
        <div className="mt-8">
            <Link className="" href={`/campanhas`}>
            <Button className="bg-yellow-600 text-white hover:bg-yellow-700 uppercase font-semibold rounded-lg px-6 py-3 shadow-md transition-all duration-200">
                {buttonText}
            </Button>
          </Link>
          
        </div>
      </div>
    </section>
  );
}
