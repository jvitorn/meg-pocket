import Image from "next/image";

type ManualIlustracaoProps = {
  src?: string;
  alt?: string;
  legenda?: string;
  placeholder?: boolean;
  titulo?: string;
};

export function ManualIlustracao({
  src,
  alt = "",
  legenda,
  placeholder,
  titulo = "ILUSTRAÇÃO DE ABERTURA",
}: ManualIlustracaoProps) {
  if (placeholder || !src) {
    return (
      <figure className="my-6">
        <div className="flex h-[130px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-600/40 bg-[repeating-linear-gradient(45deg,color-mix(in_srgb,var(--primary)_8%,transparent)_0_8px,transparent_8px_16px)] text-center sm:h-[150px]">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-600">
            {titulo}
          </div>
          {legenda ? (
            <figcaption className="text-sm text-muted-foreground">
              {legenda}
            </figcaption>
          ) : null}
        </div>
      </figure>
    );
  }

  return (
    <figure className="my-6">
      <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/40">
        <Image
          src={src}
          alt={alt}
          width={1280}
          height={720}
          className="h-auto w-full object-cover"
        />
      </div>

      {legenda ? (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          {legenda}
        </figcaption>
      ) : null}
    </figure>
  );
}
