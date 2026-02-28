import type { ReactNode } from "react";
import Image from "next/image";

interface AuthPageShellProps {
  backgroundSrc: string;
  backgroundAlt: string;
  children: ReactNode;
}

export function AuthPageShell({
  backgroundSrc,
  backgroundAlt,
  children,
}: AuthPageShellProps) {
  return (
    <section className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-4 py-8 sm:px-6 md:px-10">
      <Image
        src={backgroundSrc}
        alt={backgroundAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-linear-to-b from-black/45 via-black/35 to-black/60" />

      <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
        {children}
      </div>
    </section>
  );
}
