import redis from '@/lib/redis';
import { NextResponse } from 'next/server';
import { Personagem } from '@/types/personagem';

export async function GET(
  request: Request,
   { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
   
    if (!id) {
      return NextResponse.json({ error: 'ID da campanha inválido' }, { status: 400 });
    }

    const key = 'personagens';

    // Recupere o JSON da chave 'personagens'
    const data: Array<Personagem> = await redis.json.get(key) || [];

    let personagens: Personagem[] = [];
    personagens = data;
    if (personagens.length == 0) {
      return NextResponse.json({ error: 'Não foi possivel encontrar os personagens' }, { status: 400 });
    }
    // Filtre pelos personagens da campanha específica
    const personagensFiltrados = personagens.filter(p => p.campanha_id === Number(id));

    return NextResponse.json(personagensFiltrados);
  } catch (error) {
    console.error('Erro ao buscar personagens:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}