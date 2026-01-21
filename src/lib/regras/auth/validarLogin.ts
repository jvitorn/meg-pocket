import bcrypt from "bcryptjs";

export async function validarLogin(
  senhaDigitada: string,
  senhaHash: string | null
) {
  if (!senhaHash) {
    return false;
  }

  return bcrypt.compare(senhaDigitada, senhaHash);
}
