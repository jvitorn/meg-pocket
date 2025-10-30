import redis from '@/lib/redis';
import { NextResponse } from 'next/server';
import { Personagem } from '@/types/personagem';
import { Raca } from '@/types/raca';
import { Classe } from '@/types/classe';


export async function GET(
  request: Request,
  { params }: { params: { id: number } }
) {
  try {
    const { id } = await params;

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID do personagem inválido' }, { status: 400 });
    }

    const key = 'personagens';

    // Recupere o JSON da chave 'personagens'
    const dataPersonagem: Array<Personagem> = await redis.json.get(key) || [];
    
    const dataRaca: Array<Raca> = await redis.json.get('racas') || [];
    const dataClasse: Array<Classe> = await redis.json.get('classes') || [];

    let personagens: Personagem[] = [];
    if (dataPersonagem && dataRaca) {
      personagens = dataPersonagem;
    } else {
      // Insira dados de exemplo se não existir
      personagens = [
        {
          "_id": 2,
          "campanha_id": 2,
          "classe_id": 1,
          "raca_id": 3,
          "elemento": "natureza",
          "hp_atual": 6,
          "magias": [
            {
              "alcance": "até 3 metros",
              "descricao": "Realize 2 chutes com 2 de dano elemental. Lance uma moeda; caso cara, concede um ataque extra.",
              "custo_nivel": 2,
              "nome": "Capoeira Ciclone"
            },
            {
              "custo_nivel": 1,
              "nome": "Cobertura de Mana",
              "alcance": "Pessoal",
              "descricao": "nvolve uma parte do corpo para aumentar 1d3 de dano Fisico."
            },
            {
              "custo_nivel": 1,
              "nome": "Projeteis de Mana",
              "alcance": "até 2 metros",
              "descricao": "nvolve uma parte do corpo para aumentar 1d3 de dano Fisico."
            }
          ],
          "mana_atual": 4,
          "nome": "monai",
          "sobre": "Guerreiro élfico nascido nas florestas ancestrais. Domina a magia da natureza e usa sua conexão com os elementos para proteger seu povo.",
          "url_imagem": "https://krxuafiolrihvoajvmnc.supabase.co/storage/v1/object/public/assets/monai_profile.png"
        }
      ];
      await redis.set(key, JSON.stringify(personagens));
    }

    // Filtre pelos personagens da campanha específica
    const personagemLocalizado: Personagem | undefined = personagens.find(p => p._id === Number(id));

    // Valide se o personagem foi encontrado
    if (!personagemLocalizado) {
      return NextResponse.json({ error: 'Personagem não encontrado' }, { status: 404 });
    }

    const racaEncontrada: Raca | undefined = dataRaca.find(r => r._id === Number(personagemLocalizado.raca_id));
    const classeEncontrada: Classe | undefined = dataClasse.find(c => c._id === Number(personagemLocalizado.classe_id));

    // Valide se raça e classe foram encontradas
    if (!racaEncontrada || !classeEncontrada) {
      return NextResponse.json({
        error: 'Raça ou classe do personagem não encontrada'
      }, { status: 404 });
    }
    // Valide se as propriedades existem antes de somar
    const hpRaca = racaEncontrada.hp ?? 0;
    const hpClasse = classeEncontrada.hp ?? 0;
    const manaRaca = racaEncontrada.mana ?? 0;
    const manaClasse = classeEncontrada.mana ?? 0;

    // Atribua diretamente (sem optional chaining)
    personagemLocalizado.hp = Number(hpRaca + hpClasse);
    personagemLocalizado.mana = manaRaca + manaClasse;
    personagemLocalizado.raca_nome = racaEncontrada.nome;
    personagemLocalizado.classe_nome = classeEncontrada.nome;

    return NextResponse.json(personagemLocalizado);
  } catch (error) {
    console.error('Erro ao buscar personagens:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}