"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/authService";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  clearClientAuthCache,
  markClientAuthCacheCreatedAt,
} from "@/lib/clientAuthCache";

export function LoginForm({
  googleLoginEnabled = false,
  showExpiredNotice = false,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  googleLoginEnabled?: boolean;
  showExpiredNotice?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showExpiredNotice) return;

    void clearClientAuthCache();
    toast.warning("Credenciais expiradas. Entre novamente para continuar.");
  }, [showExpiredNotice]);

  function getLoginErrorMessage(rawError?: string | null) {
    if (!rawError) {
      return "Não foi possível entrar agora. Tente novamente.";
    }

    if (rawError === "CredentialsSignin") {
      return "Email ou senha incorretos. Confira os dados e tente novamente.";
    }

    return rawError;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      const result = await authService.loginComSenha(email, password);

      if (result?.error) {
        setError(getLoginErrorMessage(result.error));
        return;
      }

      if (result?.ok) {
        markClientAuthCacheCreatedAt();
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setError("Email ou senha incorretos. Confira os dados e tente novamente.");
    } catch (err) {
      setError(
        err instanceof Error
          ? getLoginErrorMessage(err.message)
          : "Não foi possível entrar agora. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="p-6">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">É bom vê-lo novamente</CardTitle>
          <CardDescription>
            Retorne ao mundo de Magos & Grimórios e continue sua jornada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {googleLoginEnabled && (
                <>
                  <Field>
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full"
                      onClick={() => authService.loginComGoogle()}
                    >
                      Login com Google
                    </Button>
                  </Field>

                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    Ou utilize acesso tradicional
                  </FieldSeparator>
                </>
              )}

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  aria-invalid={!!error}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Senha</FieldLabel>
                  <Link
                    href="/esqueci-senha"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Esqueceu sua senha?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  aria-invalid={!!error}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                />
              </Field>

              {error && (
                <FieldError className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center">
                  {error}
                </FieldError>
              )}

              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Entrando..." : "Login"}
                </Button>

                <FieldDescription className="text-center">
                  Bora entrar nesse mundo?{" "}
                  <Link href="/cadastro">Cadastrar</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center text-sm">
        Ao continuar, você concorda com nossos{" "}
        <Link href="/termos">Termos de Uso</Link> e{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </FieldDescription>
    </div>
  );
}
