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
      return NextResponse.json({ error: 'ID do personagem inválido' }, { status: 400 });
    }

    const key = 'personagens';

    // Recupere o JSON da chave 'personagens'
    //const data: Array<Personagem> = await redis.json.get(key) || [];
    const data: Array<Personagem> =  [
    {
      "_id": 1,
      "campanha_id": 2,
      "id_raca": 1,
      "nome": "celi"
    },
    {
      "_id": 2,
      "campanha_id": 2,
      "id_raca": 1,
      "nome": "monai"
    },
    {
      "_id": 3,
      "campanha_id": 1,
      "id_raca": 2,
      "nome": "alucard"
    }
  ]

    let personagens: Personagem[] = [];
    if (data) {
        personagens = data;
    } else {
      // Insira dados de exemplo se não existir
      personagens = [
        { _id:0, "id_raca": 1, campanha_id: 1, nome: 'Aragorn' },
      ];
      await redis.set(key, JSON.stringify(personagens));
    }
    // Filtre pelos personagens da campanha específica
    const PersonagemLocalizado = personagens.filter(p => p._id === Number(id));
    return NextResponse.json(PersonagemLocalizado);
  } catch (error) {
    console.error('Erro ao buscar personagens:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}