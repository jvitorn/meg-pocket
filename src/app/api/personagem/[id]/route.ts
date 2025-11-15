import redis from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';
import { PersonagemInterface, ClasseInterface, RacaInterface } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personagemId = Number(id);

    if (isNaN(personagemId)) {
      return NextResponse.json({ error: 'ID do personagem inválido' }, { status: 400 });
    }

    const key = 'personagens';
    const dataPersonagem: PersonagemInterface[] = (await redis.json.get(key)) || [];
    const dataRaca: RacaInterface[] = (await redis.json.get('racas')) || [];
    const dataClasse: ClasseInterface[] = (await redis.json.get('classes')) || [];

    const personagemLocalizado = dataPersonagem.find(p => p._id === personagemId);
    const indexPersonagemLocalizado = dataPersonagem.findIndex(p => p._id === personagemId);
    if (!personagemLocalizado) {
      return NextResponse.json({ error: 'Personagem não encontrado' }, { status: 404 });
    }

    const racaEncontrada = dataRaca.find(r => r._id === Number(personagemLocalizado.raca_id));
    const classeEncontrada = dataClasse.find(c => c._id === Number(personagemLocalizado.classe_id));

    if (!racaEncontrada || !classeEncontrada) {
      return NextResponse.json({ error: 'Raça ou classe do personagem não encontrada' }, { status: 404 });
    }

    personagemLocalizado.hp = (racaEncontrada.hp ?? 0) + (classeEncontrada.hp ?? 0);
    personagemLocalizado.mana = (racaEncontrada.mana ?? 0) + (classeEncontrada.mana ?? 0);
    personagemLocalizado.raca_nome = racaEncontrada.nome;
    personagemLocalizado.classe_nome = classeEncontrada.nome;
    personagemLocalizado.index = indexPersonagemLocalizado;

    // Se tiver apelido, substituir o nome
    if (personagemLocalizado.apelido && personagemLocalizado.apelido.trim() !== "") {
      personagemLocalizado.nome = personagemLocalizado.apelido;
    }

    return NextResponse.json(personagemLocalizado);
  } catch (error) {
    console.error('Erro ao buscar personagens:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
