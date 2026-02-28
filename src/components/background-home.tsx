import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HeroCta {
  label: string;
  href: string;
}

interface BackgroundHomeProps {
  title: string;
  subtitle: string;
  primaryCta: HeroCta;
  secondaryCta?: HeroCta;
}

export function BackgroundHome({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
}: BackgroundHomeProps) {
  return (
    <section className="relative flex min-h-screen w-full flex-col justify-start overflow-hidden px-6 text-center">
      <Image
        src="/imgs/backgrounds/home.jpg"
        alt="Panorama de Valthera ao amanhecer"
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />

      <div className="absolute inset-0 bg-black/60 z-10" />
      <div className="absolute inset-0 z-10 bg-linear-to-r from-purple-900/30 via-transparent to-yellow-600/20 mix-blend-soft-light" />

      <div className="relative z-20 w-full max-w-4xl text-white pt-32 md:pt-56 px-4 mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight drop-shadow-xl">
          {title}
        </h1>
        <p className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
          {subtitle}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={primaryCta.href}>
            <Button className="bg-yellow-600 text-white hover:bg-yellow-700 uppercase font-semibold rounded-lg px-6 py-3 shadow-md transition-all duration-200">
              {primaryCta.label}
            </Button>
          </Link>

          {secondaryCta ? (
            <Link href={secondaryCta.href}>
              <Button
                variant="outline"
                className="border-white/55 bg-black/20 text-white hover:bg-white/10"
              >
                {secondaryCta.label}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
