import redis from '@/lib/redis';
import { NextResponse } from 'next/server';
import { PersonagemInterface } from '@/types';

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

    const data: Array<PersonagemInterface> = await redis.json.get(key) || [];

    if (data.length === 0) {
      return NextResponse.json({ error: 'Não foi possivel encontrar os personagens' }, { status: 400 });
    }

    // Filtra os personagens da campanha
    const personagensFiltrados = data.filter(p => p.campanha_id === Number(id));

    // -----------------------------------------
    // Lógica do apelido aplicada em cada item
    // -----------------------------------------
    const personagensComApelido = personagensFiltrados.map(p => {
      if (p.apelido && p.apelido.trim() !== "") {
        return { ...p, nome: p.apelido };
      }
      return p;
    });

    return NextResponse.json(personagensComApelido);

  } catch (error) {
    console.error('Erro ao buscar personagens:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
