import { NextResponse } from "next/server";
import redis from '@/lib/redis';

export async function POST(req: Request) {
  try {
    const { index, campo, valor } = await req.json();
    console.log('valores enviados->',index, campo, valor)
    if (index === undefined || !campo) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }
    // Monta o caminho no JSON
    const path = `$[${index}].${campo}`;

    // Atualiza o campo no Redis
    await redis.json.set("personagens", path, valor);

    return NextResponse.json({ success: true, campo, valor });
  } catch (error: any) {
    console.error("Erro ao atualizar personagem:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar personagem", detalhes: error.message },
      { status: 500 }
    );
  }
}
