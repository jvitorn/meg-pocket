"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { CampanhaInfoValues } from "@/types/campanha";

export type { CampanhaInfoValues };

type Props = {
  open: boolean;
  title: string;
  description: string;
  submitLabel: string;
  loading?: boolean;
  error?: string | null;
  initialValues: CampanhaInfoValues;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CampanhaInfoValues) => void | Promise<void>;
};

export function normalizeCampanhaTags(tags: string) {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function CampanhaInfoDialog({
  open,
  title,
  description,
  submitLabel,
  loading = false,
  error,
  initialValues,
  onOpenChange,
  onSubmit,
}: Props) {
  const [values, setValues] = useState(initialValues);

  function updateField(field: keyof CampanhaInfoValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field className="md:col-span-2">
            <FieldLabel htmlFor="campanha-info-nome">Nome</FieldLabel>
            <Input
              id="campanha-info-nome"
              value={values.nome}
              onChange={(event) => updateField("nome", event.target.value)}
              placeholder="Ex: As Ruinas de Valthera"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="campanha-info-mestre">Mestre</FieldLabel>
            <Input
              id="campanha-info-mestre"
              value={values.mestre}
              onChange={(event) => updateField("mestre", event.target.value)}
              placeholder="Seu nome de mestre"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="campanha-info-capa">URL da capa</FieldLabel>
            <Input
              id="campanha-info-capa"
              value={values.capa}
              onChange={(event) => updateField("capa", event.target.value)}
              placeholder="https://..."
            />
            <FieldDescription>
              Opcional. Se deixar vazio, a campanha usa um painel tematico.
            </FieldDescription>
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="campanha-info-sinopse">Sinopse</FieldLabel>
            <textarea
              id="campanha-info-sinopse"
              rows={4}
              value={values.sinopse}
              onChange={(event) => updateField("sinopse", event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Descreva o clima, o conflito central ou a promessa da aventura."
            />
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="campanha-info-tags">Tags</FieldLabel>
            <Input
              id="campanha-info-tags"
              value={values.tags}
              onChange={(event) => updateField("tags", event.target.value)}
              placeholder="fantasia sombria, ruinas, diplomacia"
            />
            <FieldDescription>Opcional. Separe as tags por virgula.</FieldDescription>
          </Field>

          {error ? (
            <p className="text-sm text-destructive md:col-span-2">{error}</p>
          ) : null}

          <DialogFooter className="md:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
