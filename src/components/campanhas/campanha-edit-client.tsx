"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Boxes, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import type { ItemTipo } from "@/types";

const ITEM_TIPO_LABEL: Record<ItemTipo, string> = {
  ARMA: "Arma",
  CONSUMIVEL: "Consumível",
  MAGICO: "Mágico",
  MATERIAL: "Material",
  EQUIPAMENTO: "Equipamento",
};

type CampaignEditItem = {
  id: number;
  nome: string;
  sinopse: string;
  mestre: string;
  capa: string;
  tags: string[];
};

type CatalogItem = {
  id: number;
  nome: string;
  tipo: ItemTipo;
};

type CampaignInventoryItem = {
  id: number;
  itemId: number;
  nome: string;
  tipo: ItemTipo;
  quantidade: number;
  esgotado: boolean;
  observacoes: string;
};

type CampaignCharacter = {
  id: number;
  nome: string;
  jogador: string;
  inventario: CampaignInventoryItem[];
};

type Props = {
  campanha: CampaignEditItem;
  personagens: CampaignCharacter[];
  catalogoItens: CatalogItem[];
};

export function CampanhaEditClient({
  campanha,
  personagens,
  catalogoItens,
}: Props) {
  const router = useRouter();
  const [nome, setNome] = useState(campanha.nome);
  const [mestre, setMestre] = useState(campanha.mestre);
  const [capa, setCapa] = useState(campanha.capa);
  const [sinopse, setSinopse] = useState(campanha.sinopse);
  const [tags, setTags] = useState(campanha.tags.join(", "));
  const [selectedPersonagemId, setSelectedPersonagemId] = useState(
    personagens[0]?.id ? String(personagens[0].id) : ""
  );
  const [selectedItemId, setSelectedItemId] = useState(
    catalogoItens[0]?.id ? String(catalogoItens[0].id) : ""
  );
  const [quantidade, setQuantidade] = useState("1");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);

  const inventario = useMemo(
    () =>
      personagens.flatMap((personagem) =>
        personagem.inventario.map((item) => ({
          ...item,
          personagemId: personagem.id,
          personagemNome: personagem.nome,
        }))
      ),
    [personagens]
  );

  async function mutate(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error ?? "Não foi possível salvar a alteração.");
    }

    router.refresh();
  }

  async function handleSaveCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await mutate(`/api/campanhas/${campanha.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          mestre,
          capa,
          sinopse,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      toast.success("Campanha atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await mutate(`/api/campanhas/${campanha.id}/inventario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personagemId: selectedPersonagemId,
          itemId: selectedItemId,
          quantidade,
          observacoes,
        }),
      });
      setObservacoes("");
      toast.success("Item vinculado à ficha.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao vincular item.");
    } finally {
      setLoading(false);
    }
  }

  async function updateInventoryItem(
    inventoryItemId: number,
    body: Record<string, unknown>,
    message: string
  ) {
    setLoading(true);

    try {
      await mutate(`/api/campanhas/${campanha.id}/inventario/${inventoryItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar item.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteExpiredItem(inventoryItemId: number) {
    setLoading(true);

    try {
      await mutate(`/api/campanhas/${campanha.id}/inventario/${inventoryItemId}`, {
        method: "DELETE",
      });
      toast.success("Item expirado apagado do histórico.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao apagar item.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-semibold">Editar campanha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle rápido para mestre de {campanha.nome}.
          </p>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form
          onSubmit={handleSaveCampaign}
          className="rounded-lg border bg-card/70 p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Informações</h2>
            <Button type="submit" size="sm" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </div>

          <FieldGroup className="mt-5 gap-4">
            <Field>
              <FieldLabel htmlFor="campanha-nome">Nome</FieldLabel>
              <Input
                id="campanha-nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="campanha-mestre">Mestre</FieldLabel>
              <Input
                id="campanha-mestre"
                value={mestre}
                onChange={(event) => setMestre(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="campanha-capa">URL da capa</FieldLabel>
              <Input
                id="campanha-capa"
                value={capa}
                onChange={(event) => setCapa(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="campanha-sinopse">Sinopse</FieldLabel>
              <textarea
                id="campanha-sinopse"
                value={sinopse}
                onChange={(event) => setSinopse(event.target.value)}
                rows={5}
                className="min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="campanha-tags">Tags</FieldLabel>
              <Input
                id="campanha-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
              />
              <FieldDescription>Separe por vírgula.</FieldDescription>
            </Field>
          </FieldGroup>
        </form>

        <section className="rounded-lg border bg-card/70 p-5">
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Vincular item à ficha</h2>
          </div>

          <form onSubmit={handleAddItem} className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="personagem">Personagem</FieldLabel>
              <select
                id="personagem"
                value={selectedPersonagemId}
                onChange={(event) => setSelectedPersonagemId(event.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
                disabled={personagens.length === 0}
              >
                {personagens.map((personagem) => (
                  <option key={personagem.id} value={personagem.id}>
                    {personagem.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="item">Item</FieldLabel>
              <select
                id="item"
                value={selectedItemId}
                onChange={(event) => setSelectedItemId(event.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
                disabled={catalogoItens.length === 0}
              >
                {catalogoItens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} ({ITEM_TIPO_LABEL[item.tipo]})
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="quantidade">Quantidade</FieldLabel>
              <Input
                id="quantidade"
                type="number"
                min="1"
                value={quantidade}
                onChange={(event) => setQuantidade(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="observacoes">Observações</FieldLabel>
              <Input
                id="observacoes"
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={
                  loading ||
                  !selectedPersonagemId ||
                  !selectedItemId ||
                  personagens.length === 0 ||
                  catalogoItens.length === 0
                }
              >
                Vincular item
              </Button>
            </div>
          </form>
        </section>
      </section>

      <section className="rounded-lg border bg-card/70 p-5">
        <h2 className="text-lg font-semibold">Inventário da campanha</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4 font-medium">Item</th>
                <th className="py-3 pr-4 font-medium">Personagem</th>
                <th className="py-3 pr-4 font-medium">Tipo</th>
                <th className="py-3 pr-4 font-medium">Qtd.</th>
                <th className="py-3 pr-4 font-medium">Transferir</th>
                <th className="py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {inventario.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{item.nome}</div>
                    {item.esgotado ? (
                      <span className="text-xs text-amber-600">Expirado</span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4">{item.personagemNome}</td>
                  <td className="py-3 pr-4">
                    <select
                      defaultValue={item.tipo}
                      onChange={(event) =>
                        updateInventoryItem(
                          item.id,
                          { tipo: event.target.value },
                          "Tipo do item atualizado."
                        )
                      }
                      className="h-8 rounded-md border bg-background px-2"
                      disabled={loading}
                    >
                      {Object.entries(ITEM_TIPO_LABEL).map(([tipo, label]) => (
                        <option key={tipo} value={tipo}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    <Input
                      defaultValue={item.quantidade}
                      type="number"
                      min="0"
                      className="h-8 w-20"
                      onBlur={(event) =>
                        updateInventoryItem(
                          item.id,
                          { quantidade: event.target.value },
                          "Quantidade atualizada."
                        )
                      }
                      disabled={loading}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <select
                        id={`destino-${item.id}`}
                        className="h-8 rounded-md border bg-background px-2"
                        defaultValue=""
                        disabled={loading}
                      >
                        <option value="" disabled>
                          Destino
                        </option>
                        {personagens
                          .filter((personagem) => personagem.id !== item.personagemId)
                          .map((personagem) => (
                            <option key={personagem.id} value={personagem.id}>
                              {personagem.nome}
                            </option>
                          ))}
                      </select>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={loading}
                        onClick={() => {
                          const select = document.getElementById(
                            `destino-${item.id}`
                          ) as HTMLSelectElement | null;
                          if (!select?.value) return;
                          updateInventoryItem(
                            item.id,
                            {
                              action: "transfer",
                              targetPersonagemId: select.value,
                            },
                            "Item transferido."
                          );
                        }}
                        aria-label="Transferir item"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {item.esgotado ? (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            disabled={loading}
                            onClick={() =>
                              updateInventoryItem(
                                item.id,
                                { action: "recover" },
                                "Item recuperado."
                              )
                            }
                            aria-label="Recuperar item"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            disabled={loading}
                            onClick={() => deleteExpiredItem(item.id)}
                            aria-label="Apagar item expirado"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {inventario.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum item vinculado aos personagens desta campanha.
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {["Sessões", "Convites", "Anotações do mestre"].map((title) => (
          <div key={title} className="rounded-lg border border-dashed bg-card/40 p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Este painel vai ganhar controles próprios futuramente.
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
