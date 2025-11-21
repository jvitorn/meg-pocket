import type { CampanhaInterface } from '@/types';
import CampanhasClient from '@/components/campanhas/campanhasClient';
import { Navbar } from '@/components/navbar';

/**
 * Retorna a base URL absoluta a partir de variáveis de ambiente.
 * - NEXT_PUBLIC_BASE_URL (recomendado para dev/prod)
 * - VERCEL_URL (sem protocolo quando em Vercel) -> prefixa com https://
 * - fallback para http://localhost:3000 (dev)
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_BASE_URL).origin;
    } catch {
      // se usuário colocou sem protocolo, tenta adicionar
      return process.env.NEXT_PUBLIC_BASE_URL.startsWith('http')
        ? process.env.NEXT_PUBLIC_BASE_URL
        : `https://${process.env.NEXT_PUBLIC_BASE_URL}`;
    }
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // fallback local (dev)
  return 'http://localhost:3000';
}

const API_CAMPAIGN_PATH = '/api/campanhas/all';

async function getCampanhas(): Promise<CampanhaInterface[]> {
  const base = getBaseUrl();
  const url = new URL(API_CAMPAIGN_PATH, base).toString();

  const res = await fetch(url, {
    // caching control: usa tag 'campanhas' para invalidação on-demand
    next: { tags: ['campanhas'], revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Falha ao buscar campanhas (status ${res.status})`);
  }

  return (await res.json()) as CampanhaInterface[];
}

export default async function CampanhasPage() {
  let campanhas: CampanhaInterface[] = [];
  let error: string | null = null;

  try {
    campanhas = await getCampanhas();
  } catch (err) {
    console.error('Erro ao carregar campanhas (server):', err);
    error = (err as Error).message;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen mt-8 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Campanhas Ativas
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Explore as campanhas e mergulhe nas histórias — clique em qualquer
              lugar para ver mais detalhes.
            </p>
          </header>

          {error ? (
            <div className="text-center mt-10 text-red-500">Erro: {error}</div>
          ) : (
            <CampanhasClient initialCampanhas={campanhas} />
          )}
        </div>
      </main>
    </>
  );
}
