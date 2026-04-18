"use client";

import Link from "next/link";
import { useState } from "react";
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
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Step = "request" | "confirm" | "done";

export function PasswordResetForm() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function parseApiMessage(response: Response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error ?? "Não foi possível concluir a solicitação.");
    }

    return data as {
      ok?: boolean;
      message?: string;
      previewCode?: string;
    };
  }

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPreviewCode(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await parseApiMessage(response);

      setMessage(data.message ?? "Confira seu email para continuar.");
      setPreviewCode(data.previewCode ?? null);
      setStep("confirm");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o código."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await parseApiMessage(response);

      setMessage(data.message ?? "Senha atualizada com sucesso.");
      setPassword("");
      setCode("");
      setPreviewCode(null);
      setStep("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar sua senha."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Recuperar senha</CardTitle>
          <CardDescription>
            Receba um código e cadastre uma nova senha para sua conta
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "request" && (
            <form onSubmit={handleRequest}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="reset-email">Email</FieldLabel>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    required
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError(null);
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
                    {loading ? "Enviando..." : "Enviar código"}
                  </Button>
                  <FieldDescription className="text-center">
                    Lembrou a senha? <Link href="/login">Entrar</Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          )}

          {step === "confirm" && (
            <form onSubmit={handleConfirm}>
              <FieldGroup>
                {message && (
                  <FieldDescription className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-center">
                    {message}
                  </FieldDescription>
                )}

                {previewCode && (
                  <FieldDescription className="rounded-md border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-center text-amber-900 dark:text-amber-100">
                    Código local: <strong>{previewCode}</strong>
                  </FieldDescription>
                )}

                <Field>
                  <FieldLabel htmlFor="reset-code">Código</FieldLabel>
                  <Input
                    id="reset-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    required
                    onChange={(event) => {
                      setCode(event.target.value);
                      setError(null);
                    }}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="new-password">Nova senha</FieldLabel>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    required
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError(null);
                    }}
                  />
                  <FieldDescription>
                    Pode ser simples ou complexa. O app só limita o tamanho por
                    segurança técnica.
                  </FieldDescription>
                </Field>

                {error && (
                  <FieldError className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center">
                    {error}
                  </FieldError>
                )}

                <Field>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Atualizando..." : "Atualizar senha"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => {
                      setStep("request");
                      setError(null);
                      setMessage(null);
                      setPreviewCode(null);
                    }}
                  >
                    Usar outro email
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          )}

          {step === "done" && (
            <FieldGroup>
              {message && (
                <FieldDescription className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center text-emerald-800 dark:text-emerald-100">
                  {message}
                </FieldDescription>
              )}
              <Field>
                <Button asChild className="w-full">
                  <Link href="/login">Entrar com a nova senha</Link>
                </Button>
              </Field>
            </FieldGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
