import redis from '@/lib/redis';
import { NextResponse } from 'next/server';
import { Personagem } from '@/types/personagem';

export async function GET(
  request: Request,
  { params }: { params: { id: number } }
) {
  try {
    const { id } = await params;
   
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID da campanha inválido' }, { status: 400 });
    }

    const key = 'personagens';

    // Recupere o JSON da chave 'personagens'
    const data: Array<Personagem> = await redis.json.get(key) || [];

    let personagens: Personagem[] = [];
    if (data) {
      personagens = data;
    } else {
      // Insira dados de exemplo se não existir
      personagens = [
        { campanha_id: 1, nome: 'Aragorn' },
      ];
      await redis.set(key, JSON.stringify(personagens));
    }

    // Filtre pelos personagens da campanha específica
    const personagensFiltrados = personagens.filter(p => p.campanha_id === Number(id));

    return NextResponse.json(personagensFiltrados);
  } catch (error) {
    console.error('Erro ao buscar personagens:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}