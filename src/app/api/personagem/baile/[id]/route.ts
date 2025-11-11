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

    const dataPersonagem: PersonagemInterface[] = (await redis.json.get('personagens')) || [];
    const dataRaca: RacaInterface[] = (await redis.json.get('racas')) || [];
    const dataClasse: ClasseInterface[] = (await redis.json.get('classes')) || [];

    const personagemLocalizado = dataPersonagem.find((p) => p._id === personagemId);
    const indexPersonagemLocalizado = dataPersonagem.findIndex(p => p._id === personagemId);

    if (!personagemLocalizado) {
      return NextResponse.json({ error: 'Personagem não encontrado' }, { status: 404 });
    }

    const raca = dataRaca.find((r) => r._id === Number(personagemLocalizado.raca_id));
    const classe = dataClasse.find((c) => c._id === Number(personagemLocalizado.classe_id));

    if (!raca || !classe) {
      return NextResponse.json({ error: 'Raça ou classe não encontrada' }, { status: 404 });
    }

    // Se status_baile não vier definido, assume 'vivo'
    personagemLocalizado.status_baile = personagemLocalizado.status_baile ?? 'vivo';

    // Cálculo base
    personagemLocalizado.hp = (raca.hp ?? 0) + (classe.hp ?? 0);
    personagemLocalizado.mana = (raca.mana ?? 0) + (classe.mana ?? 0);
    personagemLocalizado.raca_nome = raca.nome;
    personagemLocalizado.classe_nome = classe.nome;
    personagemLocalizado.index = indexPersonagemLocalizado;

    // 🎭 Regras do Baile de Máscaras
    switch (personagemLocalizado.status_baile) {
      case 'killer':
        personagemLocalizado.hp *= 5;
        personagemLocalizado.mana *= 5;
        personagemLocalizado.actions = [
          {
            nome: 'Caçada Sombria',
            descricao: 'Avança rapidamente até um alvo, drenando parte da sua energia vital.',
            custo_mana: 10,
          },
          {
            nome: 'Olhar Afiado',
            descricao: 'Detecta presenças ocultas próximas, revelando inimigos escondidos.',
            custo_mana: 6,
          },
        ];
        break;

      case 'morto':
        personagemLocalizado.hp = 0;
        personagemLocalizado.mana = Math.floor(((raca.mana ?? 0) + (classe.mana ?? 0)) * 0.5);
        personagemLocalizado.actions = [
          {
            nome: 'Sussurro do Além',
            descricao: 'Sussurra para os vivos, interferindo temporariamente nas suas ações.',
            custo_mana: 5,
          },
          {
            nome: 'Travessia Etérea',
            descricao: 'Permite atravessar objetos físicos por alguns instantes.',
            custo_mana: 8,
          },
        ];
        break;

      case 'vivo':
      default:
        // Vivo não tem ações
        personagemLocalizado.actions = [];
        break;
    }

    return NextResponse.json(personagemLocalizado);
  } catch (error) {
    console.error('Erro ao buscar personagem no baile:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
