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
            nome: 'Ocultar Presença',
            descricao: "O Killer se funde às sombras e torna-se invisível por **2 turnos** ou até atacar.\n\nDurante esse estado, não pode ser alvo de magias, ataques ou detecção.\n\nEnquanto invisível, seus passos são inaudíveis e sua presença não pode ser sentida.\n\nInimigos a até 5 metros devem realizar um **teste de Vontade (CD 12)** ou ficam **Amedrontados** por 1 turno.\n\n**Efeitos:** Invisibilidade total e intimidação mágica.\n\n**Dano:** — (nenhum dano direto).",
            custo_mana: 5,
          },
          {
            nome: 'Golpe Sombrio',
            descricao: "Ataque físico mortal imbuído com energia das trevas.\n\nCausa **7 de dano direto** (média de 60% da vida de um mago comum).\n\nSe o alvo estiver **Amedrontado**, o dano sobe para **9**.\n\nAlém disso, aplica **Sangramento Leve**, causando **1d4 de dano** no fim de cada rodada por até **1d3 rodadas**.\n\nSe o ataque for realizado logo após *Ocultar Presença*, torna-se um **Golpe Fatal**: o alvo deve realizar um **teste de Vontade (CD 14)**; se falhar, fica **Incapacitado** por 1 turno.",
            custo_mana: 10,
          },
          {
            nome: 'Execução Silenciosa',
            descricao: "A ação suprema do Killer. Ele invoca toda a energia maldita de sua existência em um único golpe ritual.\n\nO ataque deve ser realizado contra um alvo **Amedrontado**, **Incapacitado** ou com menos de **50% da vida total**.\n\nSe acertar, o alvo é **morto instantaneamente** — **sem testes adicionais**.\n\nCaso o alvo não cumpra essas condições, o ataque ainda causa **9 de dano direto** (quase letal).\n\nSó pode ser usado **uma vez por sessão**.\n\n**Efeitos:** Instakill condicional / Finalização ritual.",
            custo_mana: 30,
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
