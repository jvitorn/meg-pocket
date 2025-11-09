// src/app/api/personagem/update/route.ts
import { NextResponse } from "next/server";
import redis from "@/lib/redis";

type Body = {
  index?: number | string;
  campo: string;
  valor: any;
};

export async function POST(request: Request) {
  try {
    const body: Body = await request.json();
    const { index, campo, valor } = body;

    if (typeof campo === "undefined" || campo === null || campo === "") {
      return NextResponse.json({ success: false, error: "Campo 'campo' não informado" }, { status: 400 });
    }

    if (typeof index === "undefined" || index === null) {
      return NextResponse.json({ success: false, error: "Parâmetro 'index' obrigatório (posição no array)" }, { status: 400 });
    }

    const idxNum = Number(index);
    if (Number.isNaN(idxNum) || !Number.isInteger(idxNum) || idxNum < 0) {
      return NextResponse.json({ success: false, error: "Index inválido" }, { status: 400 });
    }

    const key = "personagens";

    // Verifica existência do array e tamanho (evita path out of range)
    const existing: any[] | null = await redis.json.get(key);
    if (!existing || !Array.isArray(existing)) {
      return NextResponse.json({ success: false, error: "Dados de personagens não encontrados no Redis" }, { status: 404 });
    }
    if (idxNum >= existing.length) {
      return NextResponse.json({ success: false, error: `Index fora do range. Max index: ${existing.length - 1}` }, { status: 400 });
    }

    // Campos que devem ser tratados como numéricos quando chegarem como string
    const numericFields = new Set([
      "hp",
      "hp_atual",
      "mana",
      "mana_atual",
      "count_jogadores",
    ]);

    // Converter valor se necessário
    const newValueRaw =
      numericFields.has(campo) && typeof valor === "string" && valor.trim() !== ""
        ? Number(valor)
        : valor;

    // Monta o path para o elemento do array no RedisJSON (item i, atributo campo)
    // exemplo: $[0].hp_atual
    const path = `$[${idxNum}].${campo}`;

    // IMPORTANTE: Upstash/RedisJSON espera value como JSON válido.
    // Serializamos com JSON.stringify para garantir isso (strings viram com aspas).
    const valueToSet = JSON.stringify(newValueRaw);

    // Executa o set
    await redis.json.set(key, path, valueToSet);

    return NextResponse.json({ success: true, index: idxNum, campo, valor: newValueRaw });
  } catch (error: any) {
    console.error("Erro ao atualizar personagem:", error);
    const message = error?.message ?? String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
