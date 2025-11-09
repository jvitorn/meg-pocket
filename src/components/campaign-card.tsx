'use client';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

export interface CampaignCardProps {
  campanha: any; // substitua por CampanhaInterface se quiser
}

export function CampaignCard({ campanha }: CampaignCardProps) {
  return (
    <article className="group rounded-lg overflow-hidden border bg-background/50 hover:shadow-lg transition-shadow">
      {/* Link principal para a página de detalhes */}
      <Link href={`/campanhas/${campanha._id}`} className="block focus:outline-none focus:ring-2 focus:ring-ring">
        <div className="w-full h-44 sm:h-40 md:h-44 bg-muted overflow-hidden">
          {campanha.capa ? (
            <img
              src={campanha.capa}
              alt={`Capa ${campanha.nome}`}
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem imagem de capa
            </div>
          )}
        </div>

        <Card className="rounded-none border-0 shadow-none">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-semibold">{campanha.nome}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {campanha.ultima_atualizacao ? new Date(campanha.ultima_atualizacao).toLocaleDateString() : ''}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-2 pb-4">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Jogadores:</strong> {campanha.count_jogadores ?? 0}
            </p>

            <p className="text-sm leading-relaxed text-foreground/90 line-clamp-3">
              {campanha.sinopse ?? 'Nenhuma sinopse disponível.'}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {Array.isArray(campanha.tags) && campanha.tags.slice(0, 4).map((t: string) => (
                <span key={t} className="text-xs px-2 py-1 rounded-full border bg-muted/40">
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Link
                href={`/personagens/campanha/${campanha._id}`}
                className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium shadow-sm hover:shadow active:scale-95 transition-transform bg-primary text-primary-foreground"
                aria-label={`Ver personagens da campanha ${campanha.nome}`}
              >
                Ver Personagens
              </Link>

              <Link
                href={`/campanhas/${campanha._id}`}
                className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium border hover:bg-accent/5 transition"
              >
                Detalhes
              </Link>
            </div>
          </CardContent>
        </Card>
      </Link>
    </article>
  );
}
