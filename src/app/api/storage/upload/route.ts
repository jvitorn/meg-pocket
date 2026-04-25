import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { StorageConfigurationError } from "@/lib/storage/config";
import { uploadImageFile } from "@/lib/storage/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Nenhum arquivo de imagem foi enviado." },
        { status: 400 }
      );
    }

    const upload = await uploadImageFile(file, "personagens");

    return NextResponse.json({
      ok: true,
      key: upload.key,
      url: upload.url,
    });
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      console.error("[storage-upload] storage misconfigured:", error.message);
      return NextResponse.json(
        {
          ok: false,
          error: "O upload de imagem está indisponível no momento.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao enviar a imagem.",
      },
      { status: 400 }
    );
  }
}
