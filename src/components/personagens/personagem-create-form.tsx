"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf, Droplet, Flame, Wind } from "lucide-react";

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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type CampanhaOption = {
  id: number;
  nome: string;
  sinopse?: string | null;
  mestre?: string | null;
  count_jogadores?: number | null;
};

type ClasseOption = {
  id: number;
  nome: string;
  subtitulo?: string | null;
  hp?: number | null;
  mana?: number | null;
};

type RacaOption = {
  id: number;
  nome: string;
  descricao?: string | null;
  hp?: number | null;
  mana?: number | null;
};

type Props = {
  campanhas: CampanhaOption[];
  classes: ClasseOption[];
  racas: RacaOption[];
};

const elementOptions = [
  { value: "natureza", label: "Natureza", icon: Leaf },
  { value: "agua", label: "Água", icon: Droplet },
  { value: "fogo", label: "Fogo", icon: Flame },
  { value: "vento", label: "Vento", icon: Wind },
] as const;

export default function PersonagemCreateForm({
  campanhas,
  classes,
  racas,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [descricao, setDescricao] = useState("");
  const [urlImagem, setUrlImagem] = useState("");

  const [campanhaId, setCampanhaId] = useState(
    campanhas.length === 1 ? String(campanhas[0].id) : ""
  );
  const [classeId, setClasseId] = useState(
    classes.length === 1 ? String(classes[0].id) : ""
  );
  const [racaId, setRacaId] = useState(
    racas.length === 1 ? String(racas[0].id) : ""
  );
  const [elemento, setElemento] = useState<string>("natureza");

  const selectedCampanha = useMemo(() => {
    const id = Number(campanhaId);
    return campanhas.find((c) => c.id === id) ?? null;
  }, [campanhas, campanhaId]);

  const selectedClasse = useMemo(() => {
    const id = Number(classeId);
    return classes.find((c) => c.id === id) ?? null;
  }, [classes, classeId]);

  const selectedRaca = useMemo(() => {
    const id = Number(racaId);
    return racas.find((r) => r.id === id) ?? null;
  }, [racas, racaId]);

  const hpBase = (selectedClasse?.hp ?? 0) + (selectedRaca?.hp ?? 0);
  const manaBase = (selectedClasse?.mana ?? 0) + (selectedRaca?.mana ?? 0);

  const isReady =
    campanhas.length > 0 && classes.length > 0 && racas.length > 0;

  async function handleSubmit(formData: FormData) {
    if (!isReady) return;

    setError(null);
    setLoading(true);

    try {
      const payload = {
        nome: String(formData.get("nome") ?? "").trim(),
        apelido: String(formData.get("apelido") ?? "").trim() || null,
        descricao: String(formData.get("descricao") ?? "").trim() || null,
        url_imagem: String(formData.get("url_imagem") ?? "").trim() || null,
        campanhaId: String(formData.get("campanhaId") ?? ""),
        classeId: String(formData.get("classeId") ?? ""),
        racaId: String(formData.get("racaId") ?? ""),
        elemento: String(formData.get("elemento") ?? "natureza"),
      };

      if (!payload.nome) {
        setError("Informe o nome do personagem.");
        return;
      }

      const res = await fetch("/api/personagem/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Erro ao criar personagem.");
        return;
      }

      if (data?.id) {
        router.push(`/personagens/${data.id}`);
        router.refresh();
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Erro ao criar personagem.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Forje seu novo herói</CardTitle>
          <CardDescription>
            Combine origem, classe e elemento para criar uma ficha única.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isReady && (
            <FieldDescription className="mb-4 text-destructive text-center">
              É preciso ter campanhas, classes e raças cadastradas para criar um
              personagem.
            </FieldDescription>
          )}

          <form action={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="nome">Nome do personagem</FieldLabel>
                <Input
                  id="nome"
                  name="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Selene"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="apelido">Apelido (opcional)</FieldLabel>
                <Input
                  id="apelido"
                  name="apelido"
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                  placeholder="Ex: A Lâmina do Norte"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="descricao">Descrição curta</FieldLabel>
                <textarea
                  id="descricao"
                  name="descricao"
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Uma breve história ou personalidade do personagem."
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="url_imagem">
                  URL da imagem (opcional)
                </FieldLabel>
                <Input
                  id="url_imagem"
                  name="url_imagem"
                  value={urlImagem}
                  onChange={(e) => setUrlImagem(e.target.value)}
                  placeholder="https://..."
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="campanhaId">Campanha</FieldLabel>
                <select
                  id="campanhaId"
                  name="campanhaId"
                  value={campanhaId}
                  onChange={(e) => setCampanhaId(e.target.value)}
                  className="rounded-md border border-border px-3 py-2 bg-background/60"
                  required
                  disabled={!isReady || campanhas.length === 0}
                >
                  <option value="" disabled>
                    Selecione uma campanha
                  </option>
                  {campanhas.map((campanha) => (
                    <option key={campanha.id} value={campanha.id}>
                      {campanha.nome}
                    </option>
                  ))}
                </select>
                {selectedCampanha?.sinopse && (
                  <FieldDescription>{selectedCampanha.sinopse}</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="classeId">Classe</FieldLabel>
                <select
                  id="classeId"
                  name="classeId"
                  value={classeId}
                  onChange={(e) => setClasseId(e.target.value)}
                  className="rounded-md border border-border px-3 py-2 bg-background/60"
                  required
                  disabled={!isReady || classes.length === 0}
                >
                  <option value="" disabled>
                    Selecione uma classe
                  </option>
                  {classes.map((classe) => (
                    <option key={classe.id} value={classe.id}>
                      {classe.nome}
                    </option>
                  ))}
                </select>
                {selectedClasse?.subtitulo && (
                  <FieldDescription>{selectedClasse.subtitulo}</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="racaId">Raça</FieldLabel>
                <select
                  id="racaId"
                  name="racaId"
                  value={racaId}
                  onChange={(e) => setRacaId(e.target.value)}
                  className="rounded-md border border-border px-3 py-2 bg-background/60"
                  required
                  disabled={!isReady || racas.length === 0}
                >
                  <option value="" disabled>
                    Selecione uma raça
                  </option>
                  {racas.map((raca) => (
                    <option key={raca.id} value={raca.id}>
                      {raca.nome}
                    </option>
                  ))}
                </select>
                {selectedRaca?.descricao && (
                  <FieldDescription>{selectedRaca.descricao}</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel>Elemento</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {elementOptions.map((opt) => {
                    const Icon = opt.icon;
                    const active = elemento === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setElemento(opt.value)}
                        className={cn(
                          "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" name="elemento" value={elemento} />
              </Field>

              {(selectedClasse || selectedRaca) && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold">Resumo</span>
                    <span className="text-muted-foreground">
                      HP base: {hpBase}
                    </span>
                    <span className="text-muted-foreground">
                      Mana base: {manaBase}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <FieldDescription className="text-center text-destructive">
                  {error}
                </FieldDescription>
              )}

              <Field>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={!isReady || loading}>
                    {loading ? "Criando..." : "Criar personagem"}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard">Cancelar</Link>
                  </Button>
                </div>

                <FieldDescription className="text-sm">
                  Você pode alterar esses detalhes depois na ficha.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
