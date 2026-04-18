type PasswordResetEmailInput = {
  to: string;
  name?: string | null;
  code: string;
  expiresInMinutes: number;
};

type PasswordResetEmailResult = {
  delivered: boolean;
  previewCode?: string;
};

export async function sendPasswordResetEmail({
  to,
  name,
  code,
  expiresInMinutes,
}: PasswordResetEmailInput): Promise<PasswordResetEmailResult> {
  const displayName = name?.trim() || "aventureiro";

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[password-reset] Enviar para ${to}: Olá, ${displayName}. Código ${code}. Expira em ${expiresInMinutes} minutos.`
    );

    return {
      delivered: true,
      previewCode: code,
    };
  }

  console.info(
    `[password-reset] Email de recuperação solicitado para ${to}. Configure um provedor SMTP/API para envio em produção.`
  );

  return { delivered: true };
}
