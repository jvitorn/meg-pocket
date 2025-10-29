import redis from '@/lib/redis';
import { NextResponse } from 'next/server';
import { Campanha } from '@/types/campanha';

// Helper function para salvar com tipo correto
async function saveCampanhas(key: string, campanhas: Campanha[]) {
  await redis.json.set(key, '$', campanhas as any);
}

export async function GET() {
  try {
    const key = 'campanhas';
    const data = await redis.json.get(key);
    
    let campanhas: Campanha[] = [];

    switch (true) {
      case data === null:
      case data === undefined:
        campanhas = [
          { nome: 'Conservatório de Mana Cooper', count_jogadores: 5, _id: "1" },
        ];
        await saveCampanhas(key, campanhas);
        break;

      case Array.isArray(data) && data.length > 0:
        campanhas = data as Campanha[];
        break;

      case typeof data === 'object' && data !== null:
        campanhas = [data as Campanha];
        break;

      default:
        console.warn('Formato de dados inesperado, usando padrão');
        campanhas = [
          { nome: 'Conservatório de Mana Cooper', count_jogadores: 5,  _id: "1" },
        ];
        await saveCampanhas(key, campanhas);
    }

    return NextResponse.json(campanhas);
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}